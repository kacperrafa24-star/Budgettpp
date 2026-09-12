import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Pobiera kategorie i uzupełnia brakujące domyślne
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json([], { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json([], { status: 404 });

    let categories = await prisma.category.findMany({ where: { userId: user.id } });

    // INTELIGENTNE GENEROWANIE DOMYŚLNEGO SETU
    const defaultCategories = [
      { name: "Jedzenie", type: "EXPENSE" },
      { name: "Paliwo", type: "EXPENSE" },
      { name: "Rachunki", type: "EXPENSE" },
      { name: "Zdrowie", type: "EXPENSE" },
      { name: "Rozrywka", type: "EXPENSE" },
      { name: "Przychód", type: "INCOME" },
      { name: "Inne / Do weryfikacji", type: "EXPENSE" }
    ];

    const existingNames = categories.map(c => c.name);
    
    const missingCategories = defaultCategories
      .filter(cat => !existingNames.includes(cat.name))
      .map(cat => ({
        name: cat.name,
        type: cat.type as any,
        userId: user.id,
        isCustom: false
      }));

    if (missingCategories.length > 0) {
      await prisma.category.createMany({ 
        data: missingCategories 
      });
      
      categories = await prisma.category.findMany({ where: { userId: user.id } });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Błąd pobierania kategorii:", error);
    return NextResponse.json({ error: "Błąd pobierania kategorii" }, { status: 500 });
  }
}

// POST: Dodaje nową, autorską kategorię użytkownika
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Brak sesji" }, { status: 401 });

    const { name, type } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Nazwa kategorii jest wymagana" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });

    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        type: type || "EXPENSE",
        isCustom: true,
        userId: user.id
      }
    });

    return NextResponse.json(newCategory);
  } catch (error: any) {
    console.error("Błąd tworzenia kategorii:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Kategoria o tej nazwie już istnieje" }, { status: 400 });
    }
    return NextResponse.json({ error: "Błąd tworzenia kategorii" }, { status: 500 });
  }
}