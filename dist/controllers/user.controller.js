"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBankInfo = exports.updateAvatar = exports.searchUsers = void 0;
const user_service_1 = require("../services/user.service");
const error_handler_1 = require("../middleware/error-handler");
const database_1 = __importDefault(require("../config/database"));
exports.searchUsers = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.json([]);
    }
    const users = await database_1.default.user.findMany({
        where: {
            OR: [
                { username: { contains: q } },
                { email: { contains: q } }
            ],
            NOT: { id: req.user.userId } // Don't include self
        },
        select: {
            id: true,
            username: true,
            email: true
        },
        take: 10
    });
    res.json(users);
});
exports.updateAvatar = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
        res.status(400).json({ message: "avatarUrl is required" });
        return;
    }
    const updated = await user_service_1.userService.updateAvatar(userId, avatarUrl);
    res.json({ avatar_url: updated.avatar_url });
});
exports.updateBankInfo = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { bank_name, account_number, account_name } = req.body;
    const updated = await user_service_1.userService.updateBankInfo(userId, { bank_name, account_number, account_name });
    res.json({
        bank_name: updated.bank_name,
        account_number: updated.account_number,
        account_name: updated.account_name
    });
});
