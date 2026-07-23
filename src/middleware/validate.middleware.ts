import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || (error as any).errors || [];
        return res.status(400).json({
          message: "Validation failed",
          errors: issues.map((e: any) => ({
            field: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};
