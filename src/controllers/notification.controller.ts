import { Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { asyncHandler } from "../middleware/error-handler";

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const notifications = await notificationService.getUserNotifications(userId);
  res.json(notifications);
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  await notificationService.markAsRead(id, userId);
  res.json({ success: true });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await notificationService.markAllAsRead(userId);
  res.json({ success: true });
});
