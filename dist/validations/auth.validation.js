"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z.string().min(1, "Username is required"),
        password: zod_1.z.string().min(1, "Password is required"),
    }),
});
const passwordSchema = zod_1.z.string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự");
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, "Current password is required"),
        newPassword: passwordSchema,
    }),
});
