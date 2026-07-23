"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getMyNotifications = void 0;
const notification_service_1 = require("../services/notification.service");
const error_handler_1 = require("../middleware/error-handler");
exports.getMyNotifications = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const notifications = await notification_service_1.notificationService.getUserNotifications(userId);
    res.json(notifications);
});
exports.markAsRead = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    await notification_service_1.notificationService.markAsRead(id, userId);
    res.json({ success: true });
});
exports.markAllAsRead = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    await notification_service_1.notificationService.markAllAsRead(userId);
    res.json({ success: true });
});
