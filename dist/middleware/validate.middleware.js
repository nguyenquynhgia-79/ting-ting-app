"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.issues || error.errors || [];
                return res.status(400).json({
                    message: "Validation failed",
                    errors: issues.map((e) => ({
                        field: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
