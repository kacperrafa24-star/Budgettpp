import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Brak sesji" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const range = parseInt(searchParams.get("range") || "3", 10);
    
    const now = new Date();
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const targetMonth = monthParam !== null ? parseInt(monthParam, 10) : now.getMonth();
    const targetYear = yearParam !== null ? parseInt(yearParam, 10) : now.getFullYear();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        transactions: true, 
        budgets: { include: { categories: true } } 
      }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const MONTHS_PL = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];
    const result = [];

    // Generujemy miesiące wstecz, gdzie i = 0 to dokładnie wybrany targetMonth
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();

      const monthlySpent = user.transactions
        .filter(t => {
          if (!t.date || Number(t.amount) > 0) return false;
          const td = new Date(t.date);
          return td.getMonth() === m && td.getFullYear() === y;
        })
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

      const budgetForMonth = user.budgets.find(b => b.month === m && b.year === y);
      const monthlyBudget = budgetForMonth 
        ? budgetForMonth.categories.reduce((acc, c) => acc + Number(c.limit || 0), 0)
        : 0;

      result.push({
        name: `${MONTHS_PL[m]} ${y !== now.getFullYear() ? y : ''}`.trim(),
        wydatki: monthlySpent,
        budzet: monthlyBudget
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Błąd stats/history:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}