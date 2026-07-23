"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_util_1 = require("../utils/logger.util");
class AuditService {
    async logAction(data) {
        let ipAddress;
        let userAgent;
        if (data.req) {
            ipAddress = (data.req.headers["x-forwarded-for"] || data.req.socket.remoteAddress);
            userAgent = data.req.headers["user-agent"];
        }
        try {
            await database_1.default.auditLog.create({
                data: {
                    user_id: data.userId,
                    action: data.action,
                    resource: data.resource,
                    details: data.details ? JSON.stringify(data.details) : undefined,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                },
            });
            logger_util_1.logger.info(`[AUDIT] Action: ${data.action} | User: ${data.userId} | IP: ${ipAddress}`);
        }
        catch (error) {
            logger_util_1.logger.error("Failed to write audit log:", error);
        }
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
