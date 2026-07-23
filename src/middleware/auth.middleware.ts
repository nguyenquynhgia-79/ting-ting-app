import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors";
import { JWTPayload } from "../types/auth.types";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "nguyenquynhgia08102004camranhkhanhhoa";
    
    const decoded = jwt.verify(token, secret) as JWTPayload;
    req.user = decoded;
    
    next();
  } catch (error) {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};
