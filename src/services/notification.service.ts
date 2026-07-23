import prisma from "../config/database";
import { sendNotificationToUser } from "../socket";

export class NotificationService {
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedEntityId?: string;
  }) {
    const notification = await prisma.notification.create({
      data: {
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        related_entity_id: data.relatedEntityId,
      },
    });

    // Emit real-time notification
    sendNotificationToUser(data.userId, "new_notification", notification);

    return notification;
  }

  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    // Only allow marking own notifications as read
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (notification?.user_id === userId) {
      return prisma.notification.update({
        where: { id: notificationId },
        data: { is_read: true },
      });
    }
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
  }
}

export const notificationService = new NotificationService();
