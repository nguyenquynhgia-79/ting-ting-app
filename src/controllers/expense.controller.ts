import { Request, Response } from "express";
import { expenseService } from "../services/expense.service";
import { asyncHandler } from "../middleware/error-handler";

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const { group_id, amount, description, split_type, splits } = req.body;
  const userId = req.user!.userId;
  
  const expense = await expenseService.createExpense({
    group_id,
    payer_id: userId,
    amount,
    description,
    split_type,
    splits,
  });
  
  res.status(201).json(expense);
});

export const getGroupExpenses = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;
  const expenses = await expenseService.getExpensesByGroup(groupId, userId);
  res.json(expenses);
});

export const getUserExpenses = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const expenses = await expenseService.getUserExpenses(userId);
  res.json(expenses);
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, description, split_type, splits, proof_url } = req.body;
  const userId = req.user!.userId;

  // Check if it's just a proof_url update or a full update
  if (amount !== undefined) {
    const updated = await expenseService.updateExpense(id, userId, {
      amount,
      description,
      split_type,
      splits,
      proof_url
    });
    res.json(updated);
  } else if (proof_url) {
    const updated = await expenseService.updateProofUrl(id, proof_url);
    res.json(updated);
  } else {
    res.status(400).json({ message: "No update data provided" });
  }
});

export const remindExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const result = await expenseService.remindCreator(id, userId);
  res.json(result);
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  
  await expenseService.deleteExpense(id, userId);
  res.status(204).send();
});

