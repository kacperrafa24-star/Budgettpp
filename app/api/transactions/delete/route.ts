import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "Brak ID do usunięcia." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return NextResponse.json({ message: "Nie znaleziono użytkownika" }, { status: 404 });

    // deleteMany pozwala nam usunąć jedną lub 1000 transakcji jednym zapytaniem!
    const deleted = await prisma.transaction.deleteMany({
      where: { 
        id: { in: ids },
        userId: user.id // Bezpieczeństwo: tylko transakcje tego użytkownika
      },
    });

    return NextResponse.json({ message: `Usunięto ${deleted.count} wpisów.` }, { status: 200 });

  } catch (error) {
    console.error("Błąd usuwania transakcji:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}