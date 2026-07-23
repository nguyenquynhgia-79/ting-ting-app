import { Router } from "express";
import * as expenseController from "../controllers/expense.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { createExpenseSchema, updateExpenseSchema } from "../validations/expense.validation";

const router = Router();
router.use(authenticate);

router.post("/", validateRequest(createExpenseSchema), expenseController.createExpense);
router.get("/", expenseController.getUserExpenses);
router.get("/group/:groupId", expenseController.getGroupExpenses);
router.patch("/:id", validateRequest(updateExpenseSchema), expenseController.updateExpense);
router.post("/:id/remind", expenseController.remindExpense);
router.delete("/:id", expenseController.deleteExpense);

export default router;
