import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Pobiera listę subskrypcji użytkownika
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Brak sesji" }, { status: 401 });

    const subs = await prisma.subscription.findMany({
      where: { user: { email: session.user.email } },
      orderBy: { billingDay: 'asc' }
    });

    return NextResponse.json(subs);
  } catch (error) {
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

// POST: Dodaje nową subskrypcję
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Brak sesji" }, { status: 401 });

    const { name, amount, category, billingDay } = await req.json();

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const newSub = await prisma.subscription.create({
      data: {
        userId: user.id,
        name,
        amount: parseFloat(amount),
        category,
        billingDay: parseInt(billingDay),
      }
    });

    return NextResponse.json(newSub);
  } catch (error) {
    return NextResponse.json({ error: "Błąd przy tworzeniu" }, { status: 500 });
  }
}