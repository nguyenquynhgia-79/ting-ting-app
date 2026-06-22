import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../utils/errors";

export const requireActiveUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ForbiddenError("Authentication required"));
  }

  if (req.user.status === "require_password_change") {
    return next(new ForbiddenError("Password change required before accessing this feature"));
  }

  if (req.user.status === "inactive") {
    return next(new ForbiddenError("Account is inactive"));
  }

  next();
};
