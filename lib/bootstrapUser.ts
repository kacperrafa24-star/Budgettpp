// /lib/bootstrapUser.ts
import { prisma } from "@/lib/prisma";

export async function bootstrapUser(userId: string) {
  const exists = await prisma.category.count({
    where: { userId },
  });

  if (exists > 0) return;

  await prisma.category.createMany({
    data: [
      { name: "Salary", type: "INCOME", userId },
      { name: "Jedzenie", type: "EXPENSE", userId },
      { name: "Paliwo", type: "EXPENSE", userId },
      { name: "Inne", type: "EXPENSE", userId },
    ],
  });
}