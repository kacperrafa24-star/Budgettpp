import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export const dynamic = 'force-dynamic';

// GET: Pobiera użytkowników, statystyki i logi
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [users, logs, totalTransactions] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, name: true, email: true, role: true, plan: true, createdAt: true,
          _count: { select: { transactions: true, budgets: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      }),
      prisma.transaction.count()
    ]);

    const stats = {
      totalUsers: users.length,
      proUsers: users.filter(u => u.plan !== "FREE").length,
      totalTransactions
    };

    return NextResponse.json({ users, stats, logs });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// PUT: Zmiana planu użytkownika
export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    const { userId, newPlan } = await req.json();

    const admin = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.user.update({
      where: { id: userId },
      data: { plan: newPlan }
    });

    return NextResponse.json({ message: "Plan updated" });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE: Usuwanie użytkownika
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const admin = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (userId === admin.id) return NextResponse.json({ error: "Nie możesz usunąć samego siebie!" }, { status: 400 });

    await prisma.user.delete({ where: { id: userId || "" } });

    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}