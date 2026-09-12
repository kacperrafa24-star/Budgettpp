import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    // 1. PRODUKCYJNA AUTORYZACJA
    const session = await getServerSession();

    // Jeśli ktoś nie jest zalogowany, odrzucamy żądanie (Zabezpieczenie API)
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Brak autoryzacji. Zaloguj się." }, { status: 401 });
    }

    // Wyciągamy dokładne ID użytkownika z bazy na podstawie bezpiecznego maila z sesji
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!dbUser) {
      return NextResponse.json({ message: "Nie znaleziono użytkownika w bazie." }, { status: 404 });
    }

    const userId = dbUser.id;

    // 2. PARSOWANIE DANYCH Z PLIKU
    const { transactions } = await req.json();

    if (!transactions || !transactions.length) {
      return NextResponse.json({ message: "Brak transakcji do importu." }, { status: 400 });
    }

    // 3. ZNALEZIENIE LUB UTWORZENIE DOMYŚLNEJ KATEGORII
    let defaultCategory = await prisma.category.findFirst({
      where: { userId, name: "Inne / Do weryfikacji" }
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: "Inne / Do weryfikacji",
          type: "EXPENSE",
          userId: userId,
          isCustom: false,
        }
      });
    }

    // 4. MAPOWANIE DANYCH (Zabezpieczenie przed dziwnymi formatami z różnych banków)
    const dataToInsert = transactions.map((t: any) => {
      // Szukamy kwoty w różnych popularnych nazwach kolumn CSV
      const rawAmount = t.amount || t.kwota || t.Kwota || t.Amount || "0";
      // Usuwamy spacje i zamieniamy przecinki na kropki, żeby parser float nie zwariował
      const cleanAmount = parseFloat(String(rawAmount).replace(/\s/g, '').replace(',', '.'));

      return {
        userId: userId,
        categoryId: defaultCategory.id,
        amount: isNaN(cleanAmount) ? 0 : cleanAmount,
        description: t.description || t.tytuł || t.Opis || "Importowana transakcja",
        date: t.date || t.data || t.Data ? new Date(t.date || t.data || t.Data) : new Date(),
        type: cleanAmount > 0 ? "INCOME" : "EXPENSE", // Automatyczne określenie typu!
      };
    });

    // 5. HURTOWY ZAPIS W BAZIE
    const result = await prisma.transaction.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    return NextResponse.json({ 
      message: `Sukces! Zaimportowano ${result.count} transakcji.`,
      count: result.count
    }, { status: 201 });

  } catch (error) {
    console.error("Błąd podczas importu:", error);
    return NextResponse.json({ message: "Wystąpił krytyczny błąd serwera podczas zapisu." }, { status: 500 });
  }
}