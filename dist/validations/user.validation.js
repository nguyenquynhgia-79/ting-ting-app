"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBankInfoSchema = exports.updateAvatarSchema = void 0;
const zod_1 = require("zod");
exports.updateAvatarSchema = zod_1.z.object({
    body: zod_1.z.object({
        avatarUrl: zod_1.z.string().url("Must be a valid URL"),
    }),
});
exports.updateBankInfoSchema = zod_1.z.object({
    body: zod_1.z.object({
        bank_name: zod_1.z.string().min(1, "Bank name is required").optional(),
        account_number: zod_1.z.string().min(1, "Account number is required").optional(),
        account_name: zod_1.z.string().min(1, "Account name is required").optional(),
    }),
});
