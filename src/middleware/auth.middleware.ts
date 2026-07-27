import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors";
import { JWTPayload } from "../types/auth.types";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new UnauthorizedError("No token provided"));
    }

    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
      return next(new UnauthorizedError("No token provided"));
    }

    const secret = process.env.JWT_SECRET || "nguyenquynhgia08102004camranhkhanhhoa";
    
    const decoded = jwt.verify(token, secret) as JWTPayload;
    req.user = decoded;
    
    next();
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    next(new UnauthorizedError(error?.message || "Invalid or expired token"));
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "ADMIN") {
    return next(new UnauthorizedError("Yêu cầu quyền Quản trị viên (Admin)"));
  }
  next();
};
