// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. Inicjalizujemy połączenie z PostgreSQL
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 2. Tworzymy globalną zmienną dla Next.js, żeby nie dublować połączeń w trybie deweloperskim
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 3. Eksportujemy skonfigurowanego klienta Prisma 7
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;