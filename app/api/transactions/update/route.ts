import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { transactionId, categoryId } = await req.json();

    if (!transactionId || !categoryId) {
      return NextResponse.json({ message: "Brakuje ID transakcji lub kategorii." }, { status: 400 });
    }

    // Weryfikacja czy użytkownik z sesji to ten sam, do którego należy transakcja (Bezpieczeństwo!)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return NextResponse.json({ message: "Nie znaleziono użytkownika" }, { status: 404 });

    // Aktualizacja w bazie danych
    const updatedTransaction = await prisma.transaction.update({
      where: { 
        id: transactionId,
        userId: user.id // Gwarantujemy, że można edytować tylko SWOJE transakcje
      },
      data: { 
        categoryId: categoryId 
      },
    });

    return NextResponse.json({ message: "Zaktualizowano pomyślnie", transaction: updatedTransaction }, { status: 200 });

  } catch (error) {
    console.error("Błąd aktualizacji transakcji:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}