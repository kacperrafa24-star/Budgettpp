import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });

    const { ids, categoryId } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !categoryId) {
      return NextResponse.json({ message: "Brakuje danych do zmiany." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) return NextResponse.json({ message: "Nie znaleziono użytkownika" }, { status: 404 });

    // Masowa aktualizacja w Prisma
    const updated = await prisma.transaction.updateMany({
      where: { 
        id: { in: ids },
        userId: user.id 
      },
      data: { categoryId },
    });

    return NextResponse.json({ message: `Zaktualizowano ${updated.count} wpisów.` }, { status: 200 });
  } catch (error) {
    console.error("Błąd masowej aktualizacji:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}