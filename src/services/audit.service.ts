import prisma from "../config/database";
import { Request } from "express";
import { logger } from "../utils/logger.util";

export class AuditService {
  async logAction(data: {
    userId?: string;
    action: string;
    resource?: string;
    details?: any;
    req?: Request;
  }) {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (data.req) {
      ipAddress = (data.req.headers["x-forwarded-for"] || data.req.socket.remoteAddress) as string;
      userAgent = data.req.headers["user-agent"];
    }

    try {
      await prisma.auditLog.create({
        data: {
          user_id: data.userId,
          action: data.action,
          resource: data.resource,
          details: data.details ? JSON.stringify(data.details) : undefined,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });
      logger.info(`[AUDIT] Action: ${data.action} | User: ${data.userId} | IP: ${ipAddress}`);
    } catch (error) {
      logger.error("Failed to write audit log:", error);
    }
  }
}

export const auditService = new AuditService();
