import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

    // 🔴 Pobieramy miesiąc i rok z adresu URL
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || new Date().getMonth().toString());
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });

    // Szukamy budżetu DOKŁADNIE na ten miesiąc i rok
    const budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: { userId: user.id, month, year }
      },
      include: {
        categories: { include: { category: true } }
      }
    });

    // Zwracamy budżet, lub pustą strukturę, jeśli użytkownik nic nie zaplanował w danym miesiącu
    return NextResponse.json(budget || { categories: [] });
  } catch (error) {
    console.error("Błąd pobierania budżetu:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}