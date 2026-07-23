"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentSchema = void 0;
const zod_1 = require("zod");
exports.createPaymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        group_id: zod_1.z.string().min(1, "Group ID is required"),
        payee_id: zod_1.z.string().min(1, "Payee ID is required"),
        amount: zod_1.z.number().positive("Amount must be positive"),
    }),
});
