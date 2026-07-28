"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new errors_1.UnauthorizedError("No token provided"));
        }
        const token = authHeader.split(" ")[1];
        if (!token || token === "undefined" || token === "null" || token.trim() === "") {
            return next(new errors_1.UnauthorizedError("No token provided"));
        }
        const secret = process.env.JWT_SECRET || "nguyenquynhgia08102004camranhkhanhhoa";
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof errors_1.UnauthorizedError) {
            return next(error);
        }
        next(new errors_1.UnauthorizedError(error?.message || "Invalid or expired token"));
    }
};
exports.authenticate = authenticate;
const isAdmin = (req, res, next) => {
    if (req.user?.role !== "ADMIN") {
        return next(new errors_1.UnauthorizedError("Yêu cầu quyền Quản trị viên (Admin)"));
    }
    next();
};
exports.isAdmin = isAdmin;
