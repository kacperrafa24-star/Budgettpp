import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } // 👈 1. Oznaczamy params jako Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Brak sesji" }, { status: 401 });

    // 👈 2. "Odpakowujemy" params za pomocą await!
    const resolvedParams = await params;
    const subId = resolvedParams.id;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Zabezpieczenie przed usunięciem cudzej subskrypcji
    const sub = await prisma.subscription.findUnique({
      where: { id: subId }
    });

    if (!sub || sub.userId !== user.id) {
      return NextResponse.json({ error: "Brak dostępu lub subskrypcja nie istnieje" }, { status: 403 });
    }

    await prisma.subscription.delete({
      where: { id: subId } // Używamy odpakowanego subId
    });

    return NextResponse.json({ message: "Usunięto subskrypcję" });
  } catch (error) {
    console.error("Błąd usuwania subskrypcji:", error);
    return NextResponse.json({ error: "Błąd usuwania" }, { status: 500 });
  }
}