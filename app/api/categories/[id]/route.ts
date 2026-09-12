import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } // 👈 Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Brak sesji" }, { status: 401 });

    // 👈 AWAIT
    const resolvedParams = await params;
    const catId = resolvedParams.id;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const category = await prisma.category.findUnique({
      where: { id: catId }
    });

    if (!category || category.userId !== user.id) {
      return NextResponse.json({ error: "Brak dostępu lub kategoria nie istnieje" }, { status: 403 });
    }

    await prisma.category.delete({
      where: { id: catId } // 👈 Odpakowane ID
    });

    return NextResponse.json({ message: "Usunięto kategorię" });
  } catch (error) {
    console.error("Błąd usuwania kategorii:", error);
    return NextResponse.json({ error: "Błąd usuwania" }, { status: 500 });
  }
}