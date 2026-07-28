import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";
import { auditService } from "../services/audit.service";
import { asyncHandler } from "../middleware/error-handler";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  try {
    const result = await authService.login(username, password);
    
    await auditService.logAction({
      userId: result.user.id,
      action: "LOGIN_SUCCESS",
      details: { username },
      req
    });

    res.json(result);
  } catch (error: any) {
    if (error.statusCode === 401) {
      await auditService.logAction({
        action: "LOGIN_FAILED",
        details: { username, reason: error.message },
        req
      });
    }
    throw error;
  }
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;
  await authService.changePassword(userId, currentPassword, newPassword);
  
  await auditService.logAction({
    userId,
    action: "CHANGE_PASSWORD",
    req
  });

  res.json({ message: "Password updated successfully" });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await userService.findById(userId);
  const summary = await userService.getUserSummary(userId);
  
    res.json({
      id: user.id,
      username: user.username,
      full_name: (user as any).full_name || null,
      email: user.email,
      phone_number: (user as any).phone_number || null,
      avatar_url: user.avatar_url,
      status: user.status,
      role: (user as any).role || 'USER',
      bank_name: user.bank_name,
      account_number: user.account_number,
      account_name: user.account_name,
      summary
    });
});
