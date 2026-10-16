import { tenantDb } from "../lib/tenant/tenant-db";
import { Prisma, NotificationType } from "@prisma/client";
import { NotificationFilterInput } from "../validations/notification.schema";

export class NotificationRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  async listNotifications(userId: string, filters: Partial<NotificationFilterInput> = {}) {
    const page = filters.page && !isNaN(Number(filters.page)) ? Math.max(1, Number(filters.page)) : 1;
    const limit = filters.limit && !isNaN(Number(filters.limit)) ? Math.min(100, Math.max(1, Number(filters.limit))) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      tenantId: this.tenantId,
      OR: [{ userId }, { userId: null }],
      ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    };

    const [total, unreadCount, items] = await Promise.all([
      this.db.notification.count({ where }),
      this.db.notification.count({
        where: {
          tenantId: this.tenantId,
          OR: [{ userId }, { userId: null }],
          isRead: false,
        },
      }),
      this.db.notification.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.db.notification.count({
      where: {
        tenantId: this.tenantId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    // Ensure tenant isolation & user authorization
    const notification = await this.db.notification.findFirst({
      where: {
        id: notificationId,
        tenantId: this.tenantId,
        OR: [{ userId }, { userId: null }],
      },
    });

    if (!notification) {
      return null;
    }

    return this.db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.db.notification.updateMany({
      where: {
        tenantId: this.tenantId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async createNotification(data: {
    userId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    referenceId?: string | null;
  }) {
    return this.db.notification.create({
      data: {
        tenantId: this.tenantId,
        userId: data.userId ?? null,
        type: data.type,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId ?? null,
        isRead: false,
      },
    });
  }

  async findRecentNotification(type: NotificationType, referenceId: string, withinMinutes: number = 60) {
    const threshold = new Date(Date.now() - withinMinutes * 60 * 1000);

    return this.db.notification.findFirst({
      where: {
        tenantId: this.tenantId,
        type,
        referenceId,
        createdAt: { gte: threshold },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
