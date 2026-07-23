"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_service_1 = require("./user.service");
const database_1 = __importDefault(require("../config/database"));
const errors_1 = require("../utils/errors");
class AuthService {
    async login(username, password_hash) {
        const user = await user_service_1.userService.findByUsername(username);
        if (!user) {
            throw new errors_1.UnauthorizedError("Invalid username or password");
        }
        if (user.status === "inactive") {
            throw new errors_1.UnauthorizedError("Account is disabled");
        }
        const isMatch = await bcrypt_1.default.compare(password_hash, user.password_hash);
        if (!isMatch) {
            throw new errors_1.UnauthorizedError("Invalid username or password");
        }
        const payload = {
            userId: user.id,
            username: user.username,
            status: user.status,
        };
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error("JWT_SECRET is not configured");
        const token = jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: "2h",
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: "7d",
        });
        return {
            token,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar_url: user.avatar_url,
                status: user.status,
            },
        };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await user_service_1.userService.findById(userId);
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            throw new errors_1.ValidationError("Current password is incorrect");
        }
        return user_service_1.userService.updatePassword(userId, newPassword);
    }
    async refreshToken(refreshToken) {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error("JWT_SECRET is not configured");
        const isBlacklisted = await database_1.default.tokenBlacklist.findUnique({
            where: { token: refreshToken },
        });
        if (isBlacklisted)
            throw new errors_1.UnauthorizedError("Refresh token is invalidated");
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, secret);
            const payload = {
                userId: decoded.userId,
                username: decoded.username,
                status: decoded.status,
            };
            const newToken = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "2h" });
            return { token: newToken };
        }
        catch (err) {
            throw new errors_1.UnauthorizedError("Invalid refresh token");
        }
    }
    async logout(accessToken, refreshToken) {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            return;
        try {
            const decodedAccess = jsonwebtoken_1.default.verify(accessToken, secret, { ignoreExpiration: true });
            await database_1.default.tokenBlacklist.create({
                data: {
                    token: accessToken,
                    expires_at: new Date(decodedAccess.exp * 1000),
                },
            }).catch(() => { }); // Ignore if already blacklisted
            if (refreshToken) {
                const decodedRefresh = jsonwebtoken_1.default.verify(refreshToken, secret, { ignoreExpiration: true });
                await database_1.default.tokenBlacklist.create({
                    data: {
                        token: refreshToken,
                        expires_at: new Date(decodedRefresh.exp * 1000),
                    },
                }).catch(() => { });
            }
        }
        catch (err) {
            console.error("Error blacklisting token", err);
        }
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
