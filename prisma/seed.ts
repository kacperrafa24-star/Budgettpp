import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const user1 = await prisma.user.upsert({
    where: { email: "ty@test.com" },
    update: {},
    create: {
      email: "ty@test.com",
      name: "Ty",
    },
  });

  await prisma.category.createMany({
    data: [
      { name: "Inne", type: "EXPENSE", userId: user1.id },
      { name: "Jedzenie", type: "EXPENSE", userId: user1.id },
      { name: "Paliwo", type: "EXPENSE", userId: user1.id },
      { name: "Przychód", type: "INCOME", userId: user1.id },
      { name: "Salary", type: "INCOME", userId: user1.id },
    ],
    skipDuplicates: true,
  });

  console.log("SEED OK");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());