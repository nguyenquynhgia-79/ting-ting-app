"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
const splitItemSchema = zod_1.z.object({
    user_id: zod_1.z.string(),
    amount: zod_1.z.number().optional(),
    percentage: zod_1.z.number().optional(),
});
exports.createExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        group_id: zod_1.z.string().min(1, "Group ID is required"),
        amount: zod_1.z.number().positive("Amount must be positive"),
        description: zod_1.z.string().min(1, "Description is required"),
        split_type: zod_1.z.enum(["EQUAL", "EXACT", "PERCENTAGE"]),
        splits: zod_1.z.array(splitItemSchema).optional(),
    }),
});
exports.updateExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number().positive("Amount must be positive").optional(),
        description: zod_1.z.string().optional(),
        split_type: zod_1.z.enum(["EQUAL", "EXACT", "PERCENTAGE"]).optional(),
        splits: zod_1.z.array(splitItemSchema).optional(),
        proof_url: zod_1.z.string().url("Must be a valid URL").optional(),
    }).refine(data => Object.keys(data).length > 0, {
        message: "No update data provided",
    }),
});
