import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { createPaymentSchema } from "../validations/payment.validation";

const router = Router();
router.use(authenticate);

router.post("/", validateRequest(createPaymentSchema), paymentController.createPayment);
router.get("/", paymentController.getUserPayments);
router.patch("/:paymentId/confirm", paymentController.confirmPayment);
router.get("/group/:groupId/debts", paymentController.getDebts);
router.get("/group/:groupId/history", paymentController.getGroupPayments);
router.patch("/:paymentId/reject", paymentController.rejectPayment);

export default router;
