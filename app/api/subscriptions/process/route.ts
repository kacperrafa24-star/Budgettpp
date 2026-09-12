import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  console.log("--- START PROCESU SUBSKRYPCJI ---");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Brak sesji" }, { status: 401 });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscriptions: true }
    });

    if (!user || user.subscriptions.length === 0) {
      return NextResponse.json({ message: "Brak subskrypcji" });
    }

    const alreadyProcessed = await prisma.subscriptionLog.findUnique({
      where: { userId_month_year: { userId: user.id, month: currentMonth, year: currentYear } }
    });

    if (alreadyProcessed) {
      return NextResponse.json({ message: "Już przetworzono" });
    }

    // 1. Znajdź lub utwórz kategorię "Subskrypcje"
    let subCategory = await prisma.category.findFirst({
      where: { userId: user.id, name: "Subskrypcje" }
    });

    if (!subCategory) {
      subCategory = await prisma.category.create({
        data: {
          name: "Subskrypcje",
          type: "EXPENSE",
          isCustom: false,
          userId: user.id
        }
      });
    }

    // 2. Tworzymy transakcje dokładnie pod pola w Twoim schema.prisma
    const transactionsToCreate = user.subscriptions.map(sub => ({
      userId: user.id,
      description: `[SUB] ${sub.name}`, // 👈 Używamy description zamiast name
      amount: -Math.abs(Number(sub.amount)),
      categoryId: subCategory.id,
      type: "EXPENSE",
      isRecurring: true,
      date: new Date(Date.UTC(currentYear, currentMonth, sub.billingDay))
    }));

    await prisma.transaction.createMany({ 
      data: transactionsToCreate as any 
    });

    await prisma.subscriptionLog.create({
      data: { userId: user.id, month: currentMonth, year: currentYear }
    });

    console.log("SUKCES: Subskrypcje dodane!");
    return NextResponse.json({ message: `Dodano ${transactionsToCreate.length} subskrypcji` });

  } catch (error) {
    console.error("KRYTYCZNY BŁĄD API SUBSKRYPCJI:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}