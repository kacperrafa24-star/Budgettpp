import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// ==========================================
// GET - Pobieranie transakcji
// ==========================================
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        user: { email: session.user.email }
      },
      include: {
        category: true 
      },
      orderBy: { date: "desc" }, // Sortujemy po dacie transakcji
    });

    // Mapowanie danych dla frontendu + konwersja Decimal
    const mappedTransactions = transactions.map(t => ({
      id: t.id,
      amount: Number(t.amount), 
      name: t.description, 
      category: t.category?.name || "Inne",
      type: t.type,
      date: t.date
    }));

    return NextResponse.json(mappedTransactions);
  } catch (error) {
    console.error("GET_TRANSACTIONS_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// ==========================================
// POST - Tworzenie transakcji
// ==========================================
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { amount, description, categoryId, date, isRecurring } = body;

    // Walidacja
    if (!amount || !description || !categoryId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. POBRANIE KATEGORII (żeby uzyskać wymagane pole 'type' np. INCOME/EXPENSE)
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // 2. TWORZENIE TRANSAKCJI
   // 2. TWORZENIE TRANSAKCJI
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description,
        type: category.type, 
        date: date ? new Date(date) : new Date(),
        isRecurring: isRecurring || false,
        
        // Łączymy z użytkownikiem
        user: {
          connect: { email: session.user.email } 
        },
        // Łączymy z kategorią (TO NAPRAWIA BŁĄD)
        category: {
          connect: { id: categoryId }
        }
      },
      include: {
        category: true
      }
    });

    // Zwracamy obiekt JSON z przekonwertowaną kwotą
    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount) 
    });
  } catch (error) {
    console.error("POST_TRANSACTIONS_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}