import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

    // 🔴 Odbieramy miesiąc i rok z żądania
    const { categoryName, amount, month, year } = await req.json();

    if (amount === undefined || !categoryName || month === undefined || year === undefined) {
      return NextResponse.json({ error: "Brakujące dane" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });

    const category = await prisma.category.findFirst({
      where: { userId: user.id, name: categoryName }
    });
    if (!category) return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 404 });

    // 🔴 Znajdź lub stwórz nadrzędny budżet na dany miesiąc
    let budget = await prisma.budget.findUnique({
      where: { userId_month_year: { userId: user.id, month, year } }
    });

    if (!budget) {
      budget = await prisma.budget.create({
        data: { userId: user.id, month, year }
      });
    }

    // 🔴 Zaktualizuj lub stwórz limit dla konkretnej kategorii w tym miesiącu
    const budgetCategory = await prisma.budgetCategory.findFirst({
      where: { budgetId: budget.id, categoryId: category.id }
    });

    if (budgetCategory) {
      await prisma.budgetCategory.update({
        where: { id: budgetCategory.id },
        data: { limit: amount }
      });
    } else {
      await prisma.budgetCategory.create({
        data: { budgetId: budget.id, categoryId: category.id, limit: amount }
      });
    }

    return NextResponse.json({ message: "Limit zaktualizowany" }, { status: 200 });
  } catch (error) {
    console.error("Błąd aktualizacji budżetu:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}