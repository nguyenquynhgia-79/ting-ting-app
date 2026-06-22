import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authLimiter } from "../app";
import { validateRequest } from "../middleware/validate.middleware";
import { loginSchema, changePasswordSchema } from "../validations/auth.validation";

const router = Router();

router.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router.post("/change-password", authenticate, validateRequest(changePasswordSchema), authController.changePassword);
router.get("/me", authenticate, authController.getMe);

export default router;
