import { prisma } from "@/lib/prisma";

export const CategoryService = {
  getAll: async () => {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  },

  create: async (data: { name: string; type: "INCOME" | "EXPENSE" }) => {
    return prisma.category.create({
      data: {
        name: data.name,
        type: data.type,
        isCustom: true,
      },
    });
  },
};