import { prisma } from "@/lib/prisma";

export const SummaryService = {
  getMonthlySummary: async (year: number, month: number) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: { category: true },
    });

    const income = transactions
      .filter(t => t.category.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.category.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    const byCategory = transactions.reduce((acc, t) => {
      const key = t.category.name;

      if (!acc[key]) {
        acc[key] = 0;
      }

      acc[key] += t.amount;

      return acc;
    }, {} as Record<string, number>);

    return {
      income,
      expense,
      balance: income - expense,
      byCategory,
    };
  },
};