import { z } from "zod";

export const updateAvatarSchema = z.object({
  body: z.object({
    avatarUrl: z.string().url("Must be a valid URL"),
  }),
});

export const updateBankInfoSchema = z.object({
  body: z.object({
    bank_name: z.string().min(1, "Bank name is required").optional(),
    account_number: z.string().min(1, "Account number is required").optional(),
    account_name: z.string().min(1, "Account name is required").optional(),
  }),
});
