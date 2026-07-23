"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.changePassword = exports.login = void 0;
const auth_service_1 = require("../services/auth.service");
const user_service_1 = require("../services/user.service");
const audit_service_1 = require("../services/audit.service");
const error_handler_1 = require("../middleware/error-handler");
exports.login = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await auth_service_1.authService.login(username, password);
        await audit_service_1.auditService.logAction({
            userId: result.user.id,
            action: "LOGIN_SUCCESS",
            details: { username },
            req
        });
        res.json(result);
    }
    catch (error) {
        if (error.statusCode === 401) {
            await audit_service_1.auditService.logAction({
                action: "LOGIN_FAILED",
                details: { username, reason: error.message },
                req
            });
        }
        throw error;
    }
});
exports.changePassword = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    await auth_service_1.authService.changePassword(userId, currentPassword, newPassword);
    await audit_service_1.auditService.logAction({
        userId,
        action: "CHANGE_PASSWORD",
        req
    });
    res.json({ message: "Password updated successfully" });
});
exports.getMe = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const user = await user_service_1.userService.findById(userId);
    const summary = await user_service_1.userService.getUserSummary(userId);
    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        status: user.status,
        bank_name: user.bank_name,
        account_number: user.account_number,
        account_name: user.account_name,
        summary
    });
});
