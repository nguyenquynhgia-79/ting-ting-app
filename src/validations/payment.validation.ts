import { z } from "zod";

export const createPaymentSchema = z.object({
  body: z.object({
    group_id: z.string().min(1, "Group ID is required"),
    payee_id: z.string().min(1, "Payee ID is required"),
    amount: z.number().positive("Amount must be positive"),
  }),
});
