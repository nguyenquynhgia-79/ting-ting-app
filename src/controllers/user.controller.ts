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
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone_number: { contains: q } }
      ],
      NOT: { id: req.user!.userId } // Don't include self
    },
    select: {
      id: true,
      username: true,
      email: true,
      phone_number: true,
      avatar_url: true
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

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { username, email, phone_number } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ message: "Username và Email là bắt buộc" });
  }

  // Check if username, email or phone_number already exists for ANOTHER user
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
        ...(phone_number ? [{ phone_number }] : [])
      ],
      NOT: { id: userId }
    }
  });

  if (existingUser) {
    if (existingUser.username === username) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }
    if (existingUser.email === email) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }
    if (existingUser.phone_number === phone_number) {
      return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { 
      username, 
      email, 
      phone_number: phone_number || null 
    }
  });

  res.json({
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    phone_number: updatedUser.phone_number
  });
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

