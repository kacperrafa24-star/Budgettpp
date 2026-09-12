const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function run() {
  const result = await prisma.category.findMany()
  console.log(result)
  await prisma.$disconnect()
}

run()