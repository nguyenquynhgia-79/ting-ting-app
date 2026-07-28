import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { updateAvatarSchema, updateBankInfoSchema } from "../validations/user.validation";

const router = Router();
router.use(authenticate);
router.get("/search", userController.searchUsers);
router.put("/profile", userController.updateProfile);
router.patch("/me/avatar", validateRequest(updateAvatarSchema), userController.updateAvatar);
router.patch("/me/bank", validateRequest(updateBankInfoSchema), userController.updateBankInfo);

export default router;

