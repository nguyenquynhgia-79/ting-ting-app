import { Request, Response } from "express";
import { asyncHandler } from "../middleware/error-handler";
import prisma from "../config/database";
import { getIO } from "../socket";

export const getSystemStats = asyncHandler(async (req: Request, res: Response) => {
  const totalUsers = await prisma.user.count();
  const totalGroups = await prisma.group.count();
  
  // Tổng giao dịch (Payments)
  const payments = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: 'COMPLETED' }
  });

  const activeUsers = await prisma.user.count({ where: { status: 'active' } });

  res.json({
    totalUsers,
    activeUsers,
    totalGroups,
    totalTransactionAmount: payments._sum.amount || 0
  });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      role: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' }
  });
  res.json(users);
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive', 'blocked', 'require_password_change'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status }
  });

  res.json({ message: "User status updated", user });
});

export const getGroups = asyncHandler(async (req: Request, res: Response) => {
  const groups = await prisma.group.findMany({
    select: {
      id: true,
      name: true,
      invite_code: true,
      created_at: true,
      _count: {
        select: {
          members: true,
          expenses: true
        }
      },
      creator: {
        select: { username: true, email: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
  res.json(groups);
});

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { created_at: 'desc' },
    include: {
      user: {
        select: { username: true, email: true }
      }
    }
  });
  res.json(logs);
});

export const getChartData = asyncHandler(async (req: Request, res: Response) => {
  // Lấy dữ liệu 30 ngày gần nhất
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Group user creation by date
  const users = await prisma.user.findMany({
    where: { created_at: { gte: thirtyDaysAgo } },
    select: { created_at: true }
  });

  const payments = await prisma.payment.findMany({
    where: { created_at: { gte: thirtyDaysAgo }, status: 'COMPLETED' },
    select: { created_at: true, amount: true }
  });

  // Gom nhóm dữ liệu theo ngày (YYYY-MM-DD)
  const chartDataMap: Record<string, { users: number; revenue: number }> = {};
  
  // Khởi tạo 30 ngày với value = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = d.toISOString().split('T')[0];
    chartDataMap[dateString] = { users: 0, revenue: 0 };
  }

  users.forEach(u => {
    const d = u.created_at.toISOString().split('T')[0];
    if (chartDataMap[d]) chartDataMap[d].users += 1;
  });

  payments.forEach(p => {
    const d = p.created_at.toISOString().split('T')[0];
    if (chartDataMap[d]) chartDataMap[d].revenue += Number(p.amount);
  });

  // Format lại array và sắp xếp tăng dần theo ngày
  const result = Object.entries(chartDataMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json(result);
});

export const broadcastNotification = asyncHandler(async (req: Request, res: Response) => {
  const { title, message, type = 'system' } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: "Vui lòng nhập tiêu đề và nội dung" });
  }

  // 1. Lấy tất cả user đang active
  const activeUsers = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true }
  });

  if (activeUsers.length > 0) {
    // 2. Tạo dữ liệu notification hàng loạt
    const notificationsToInsert = activeUsers.map(user => ({
      user_id: user.id,
      title,
      message,
      type
    }));

    await prisma.notification.createMany({
      data: notificationsToInsert
    });
  }

  // 3. Broadcast qua Socket.io tới TẤT CẢ client
  const io = getIO();
  if (io) {
    io.emit('NEW_NOTIFICATION', {
      id: 'GLOBAL_' + Date.now(),
      title,
      message,
      type,
      created_at: new Date().toISOString()
    });
  }

  res.json({ 
    message: "Gửi thông báo thành công", 
    recipients: activeUsers.length 
  });
});
