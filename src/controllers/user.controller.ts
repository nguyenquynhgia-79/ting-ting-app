import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { asyncHandler } from "../middleware/error-handler";
import prisma from "../config/database";

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q } },
        { email: { contains: q } }
      ],
      NOT: { id: req.user!.userId } // Don't include self
    },
    select: {
      id: true,
      username: true,
      email: true
    },
    take: 10
  });

  res.json(users);
});

export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { avatarUrl } = req.body;
  if (!avatarUrl) {
    res.status(400).json({ message: "avatarUrl is required" });
    return;
  }
  const updated = await userService.updateAvatar(userId, avatarUrl);
  res.json({ avatar_url: updated.avatar_url });
});

export const updateBankInfo = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { bank_name, account_number, account_name } = req.body;
  
  const updated = await userService.updateBankInfo(userId, { bank_name, account_number, account_name });
  
  res.json({
    bank_name: updated.bank_name,
    account_number: updated.account_number,
    account_name: updated.account_name
  });
});

