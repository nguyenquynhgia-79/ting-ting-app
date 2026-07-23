"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireActiveUser = void 0;
const errors_1 = require("../utils/errors");
const requireActiveUser = (req, res, next) => {
    if (!req.user) {
        return next(new errors_1.ForbiddenError("Authentication required"));
    }
    if (req.user.status === "require_password_change") {
        return next(new errors_1.ForbiddenError("Password change required before accessing this feature"));
    }
    if (req.user.status === "inactive") {
        return next(new errors_1.ForbiddenError("Account is inactive"));
    }
    next();
};
exports.requireActiveUser = requireActiveUser;
