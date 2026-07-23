"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const errorHandler = (err, req, res, next) => {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message,
            ...(err instanceof errors_1.ValidationError && { errors: err.errors }),
        });
    }
    console.error("UNEXPECTED ERROR:", err);
    const message = process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message;
    res.status(500).json({
        status: "error",
        message,
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
