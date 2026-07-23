import { Request, Response } from "express";
import { paymentService } from "../services/payment.service";
import { asyncHandler } from "../middleware/error-handler";

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const { group_id, payee_id, amount } = req.body;
  const userId = req.user!.userId;
  
  const payment = await paymentService.createPayment({
    group_id,
    payer_id: userId,
    payee_id,
    amount,
  });
  
  res.status(201).json(payment);
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const paymentId = req.params.paymentId as string;
  const userId = req.user!.userId;
  
  const payment = await paymentService.confirmPayment(paymentId, userId);
  res.json(payment);
});

export const rejectPayment = asyncHandler(async (req: Request, res: Response) => {
  const paymentId = req.params.paymentId as string;
  const userId = req.user!.userId;
  
  const payment = await paymentService.rejectPayment(paymentId, userId);
  res.json(payment);
});

export const getDebts = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.groupId as string;
  const debts = await paymentService.getSimplifiedDebts(groupId);
  res.json(debts);
});

export const getGroupPayments = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.groupId as string;
  const payments = await paymentService.getGroupPayments(groupId);
  res.json(payments);
});

export const getUserPayments = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const payments = await paymentService.getUserPayments(userId);
  res.json(payments);
});
