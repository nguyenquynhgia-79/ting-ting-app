"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSubscription = exports.createUser = exports.broadcastNotification = exports.getChartData = exports.getLogs = exports.getGroups = exports.updateUserStatus = exports.getUsers = exports.getSystemStats = void 0;
const error_handler_1 = require("../middleware/error-handler");
const database_1 = __importDefault(require("../config/database"));
const socket_1 = require("../socket");
const user_service_1 = require("../services/user.service");
const audit_service_1 = require("../services/audit.service");
exports.getSystemStats = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const totalUsers = await database_1.default.user.count();
    const totalGroups = await database_1.default.group.count();
    // Tổng giao dịch (Payments)
    const payments = await database_1.default.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
    });
    const activeUsers = await database_1.default.user.count({ where: { status: 'active' } });
    res.json({
        totalUsers,
        activeUsers,
        totalGroups,
        totalTransactionAmount: payments._sum.amount || 0
    });
});
exports.getUsers = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const users = await database_1.default.user.findMany({
        select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
            status: true,
            role: true,
            created_at: true,
        },
        orderBy: { created_at: 'desc' }
    });
    res.json(users);
});
exports.updateUserStatus = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
    const { status } = req.body;
    if (!['active', 'inactive', 'blocked', 'require_password_change'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }
    const user = await database_1.default.user.update({
        where: { id },
        data: { status }
    });
    res.json({ message: "User status updated", user });
});
exports.getGroups = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const groups = await database_1.default.group.findMany({
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
exports.getLogs = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const logs = await database_1.default.auditLog.findMany({
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
exports.getChartData = (0, error_handler_1.asyncHandler)(async (req, res) => {
    // Lấy dữ liệu 30 ngày gần nhất
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // Group user creation by date
    const users = await database_1.default.user.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: { created_at: true }
    });
    const payments = await database_1.default.payment.findMany({
        where: { created_at: { gte: thirtyDaysAgo }, status: 'COMPLETED' },
        select: { created_at: true, amount: true }
    });
    // Gom nhóm dữ liệu theo ngày (YYYY-MM-DD)
    const chartDataMap = {};
    // Khởi tạo 30 ngày với value = 0
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().split('T')[0];
        chartDataMap[dateString] = { users: 0, revenue: 0 };
    }
    users.forEach(u => {
        const d = u.created_at.toISOString().split('T')[0];
        if (chartDataMap[d])
            chartDataMap[d].users += 1;
    });
    payments.forEach(p => {
        const d = p.created_at.toISOString().split('T')[0];
        if (chartDataMap[d])
            chartDataMap[d].revenue += Number(p.amount);
    });
    // Format lại array và sắp xếp tăng dần theo ngày
    const result = Object.entries(chartDataMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
    res.json(result);
});
exports.broadcastNotification = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { title, message, type = 'system' } = req.body;
    if (!title || !message) {
        return res.status(400).json({ message: "Vui lòng nhập tiêu đề và nội dung" });
    }
    // 1. Lấy tất cả user đang active
    const activeUsers = await database_1.default.user.findMany({
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
        await database_1.default.notification.createMany({
            data: notificationsToInsert
        });
    }
    // 3. Broadcast qua Socket.io tới TẤT CẢ client
    const io = (0, socket_1.getIo)();
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
exports.createUser = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { username, password, email, full_name, role } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ message: "Vui lòng cung cấp username, password và email" });
    }
    const user = await user_service_1.userService.createUser({
        username,
        email,
        password_hash: password,
        full_name,
        role
    });
    await audit_service_1.auditService.logAction({
        userId: req.user.userId,
        action: "ADMIN_CREATE_USER",
        details: { createdUserId: user.id, username },
        req
    });
    res.status(201).json({ message: "Tạo người dùng thành công", user });
});
exports.updateUserSubscription = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const { isPremium } = req.body;
    if (typeof isPremium !== 'boolean') {
        return res.status(400).json({ message: "isPremium boolean is required" });
    }
    const subscription = await user_service_1.userService.setUserPremium(id, isPremium);
    await audit_service_1.auditService.logAction({
        userId: req.user.userId,
        action: "ADMIN_UPDATE_SUBSCRIPTION",
        details: { targetUserId: id, isPremium },
        req
    });
    res.json({ message: "Cập nhật gói đăng ký thành công", subscription });
});
