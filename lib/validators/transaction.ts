import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z.number().int(),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  date: z.string().datetime().optional(),
});