import { z } from "zod";

const splitItemSchema = z.object({
  user_id: z.string(),
  amount: z.number().optional(),
  percentage: z.number().optional(),
});

export const createExpenseSchema = z.object({
  body: z.object({
    group_id: z.string().min(1, "Group ID is required"),
    amount: z.number().positive("Amount must be positive"),
    description: z.string().min(1, "Description is required"),
    split_type: z.enum(["EQUAL", "EXACT", "PERCENTAGE"]),
    splits: z.array(splitItemSchema).optional(),
  }),
});

export const updateExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be positive").optional(),
    description: z.string().optional(),
    split_type: z.enum(["EQUAL", "EXACT", "PERCENTAGE"]).optional(),
    splits: z.array(splitItemSchema).optional(),
    proof_url: z.string().url("Must be a valid URL").optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "No update data provided",
  }),
});
