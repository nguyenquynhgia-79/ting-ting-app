"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const database_1 = __importDefault(require("../config/database"));
const socket_1 = require("../socket");
class NotificationService {
    async createNotification(data) {
        const notification = await database_1.default.notification.create({
            data: {
                user_id: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                related_entity_id: data.relatedEntityId,
            },
        });
        // Emit real-time notification
        (0, socket_1.sendNotificationToUser)(data.userId, "new_notification", notification);
        return notification;
    }
    async getUserNotifications(userId) {
        return database_1.default.notification.findMany({
            where: { user_id: userId },
            orderBy: { created_at: "desc" },
        });
    }
    async markAsRead(notificationId, userId) {
        // Only allow marking own notifications as read
        const notification = await database_1.default.notification.findUnique({
            where: { id: notificationId },
        });
        if (notification?.user_id === userId) {
            return database_1.default.notification.update({
                where: { id: notificationId },
                data: { is_read: true },
            });
        }
    }
    async markAllAsRead(userId) {
        return database_1.default.notification.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true },
        });
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
