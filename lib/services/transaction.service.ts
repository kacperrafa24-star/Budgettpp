import { prisma } from "@/lib/prisma";

export const TransactionService = {
  getAll: async () => {
    return prisma.transaction.findMany({
      include: { category: true },
      orderBy: { date: "desc" },
    });
  },

  create: async (data: {
    amount: number;
    description?: string;
    categoryId: string;
    date?: Date;
  }) => {
    return prisma.transaction.create({
      data: {
        amount: data.amount,
        description: data.description,
        categoryId: data.categoryId,
        date: data.date ?? new Date(),
      },
    });
  },
};