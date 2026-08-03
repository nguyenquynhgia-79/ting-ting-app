"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const database_1 = __importDefault(require("../config/database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const errors_1 = require("../utils/errors");
const encryption_util_1 = require("../utils/encryption.util");
const cache_service_1 = require("./cache.service");
const mapUser = (user) => {
    if (!user)
        return user;
    if (user.account_number) {
        user.account_number = (0, encryption_util_1.decrypt)(user.account_number);
    }
    return user;
};
class UserService {
    async createUser(data) {
        const existing = await database_1.default.user.findFirst({
            where: { OR: [{ username: data.username }, { email: data.email }] },
        });
        if (existing) {
            throw new errors_1.ConflictError("Username or Email already exists");
        }
        const hashedPassword = await bcrypt_1.default.hash(data.password_hash, 10);
        const user = await database_1.default.user.create({
            data: {
                ...data,
                password_hash: hashedPassword,
                status: "require_password_change",
            },
        });
        return mapUser(user);
    }
    async findByUsername(username) {
        const user = await database_1.default.user.findUnique({
            where: { username },
        });
        return mapUser(user);
    }
    async findById(id) {
        const cacheKey = `user_${id}`;
        let user = cache_service_1.cacheService.get(cacheKey);
        if (!user) {
            user = await database_1.default.user.findUnique({
                where: { id },
            });
            if (!user)
                throw new errors_1.NotFoundError("User not found");
            cache_service_1.cacheService.set(cacheKey, user, 300); // cache for 5 minutes
        }
        return mapUser(user);
    }
    async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        const user = await database_1.default.user.update({
            where: { id: userId },
            data: {
                password_hash: hashedPassword,
                status: "active",
            },
        });
        cache_service_1.cacheService.del(`user_${userId}`);
        return mapUser(user);
    }
    async updateAvatar(userId, avatarUrl) {
        const existing = await database_1.default.user.findUnique({
            where: { id: userId },
            select: { avatar_url: true }
        });
        if (existing?.avatar_url && existing.avatar_url !== avatarUrl) {
            const { storageService } = require("./storage.service");
            await storageService.deleteFileByUrl(existing.avatar_url);
        }
        const user = await database_1.default.user.update({
            where: { id: userId },
            data: { avatar_url: avatarUrl },
        });
        cache_service_1.cacheService.del(`user_${userId}`);
        return mapUser(user);
    }
    async updateBankInfo(userId, data) {
        const encryptedAccountNumber = data.account_number ? (0, encryption_util_1.encrypt)(data.account_number) : undefined;
        const user = await database_1.default.user.update({
            where: { id: userId },
            data: {
                bank_name: data.bank_name,
                account_number: encryptedAccountNumber,
                account_name: data.account_name
            }
        });
        cache_service_1.cacheService.del(`user_${userId}`);
        return mapUser(user);
    }
    async getUserSummary(userId) {
        const memberships = await database_1.default.groupMember.findMany({
            where: { user_id: userId }
        });
        let totalBalance = 0;
        let totalLent = 0;
        let totalBorrowed = 0;
        memberships.forEach(m => {
            const balance = Number(m.balance);
            totalBalance += balance;
            if (balance > 0) {
                totalLent += balance;
            }
            else if (balance < 0) {
                totalBorrowed += Math.abs(balance);
            }
        });
        return {
            total_balance: totalBalance,
            total_lent: totalLent,
            total_borrowed: totalBorrowed
        };
    }
    async setUserPremium(userId, isPremium) {
        if (isPremium) {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month premium
            return await database_1.default.subscription.upsert({
                where: { user_id: userId },
                update: { plan: 'PREMIUM', expires_at: expiresAt },
                create: { user_id: userId, plan: 'PREMIUM', expires_at: expiresAt }
            });
        }
        else {
            return await database_1.default.subscription.upsert({
                where: { user_id: userId },
                update: { plan: 'FREE', expires_at: null },
                create: { user_id: userId, plan: 'FREE', expires_at: null }
            });
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
