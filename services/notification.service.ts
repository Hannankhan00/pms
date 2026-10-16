import { NotificationRepository } from "../repositories/notification.repository";
import { tenantDb } from "../lib/tenant/tenant-db";
import { NotificationType } from "@prisma/client";
import { EventEmitter } from "events";

export class NotificationService {
  private readonly repo: NotificationRepository;
  private readonly tenantId: string;
  private readonly db;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repo = new NotificationRepository(tenantId);
    this.db = tenantDb(tenantId);
  }

  /**
   * Broadcasts a notification to an entire tenant or a specific user.
   */
  async broadcast(
    type: NotificationType,
    title: string,
    message: string,
    referenceId?: string | null,
    userId?: string | null
  ) {
    return this.repo.createNotification({
      type,
      title,
      message,
      referenceId,
      userId,
    });
  }

  /**
   * Evaluates current inventory stock levels against the defined reorder threshold.
   * If stock dips to or below minStockLevel, creates a LOW_STOCK notification.
   * Suppresses duplicates within a 24-hour suppression window.
   */
  async evaluateStockLevels(medicineId: string) {
    const medicine = await this.db.medicine.findFirst({
      where: {
        id: medicineId,
        tenantId: this.tenantId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        minStockLevel: true,
      },
    });

    if (!medicine) {
      return null;
    }

    // Aggregate available stock across inventory ledger movements
    const stockAgg = await this.db.inventoryLedger.aggregate({
      where: {
        medicineId,
        tenantId: this.tenantId,
      },
      _sum: {
        quantity: true,
      },
    });

    const currentStock = Number(stockAgg._sum.quantity || 0);

    // If stock is depleted or at/below minimum threshold
    if (currentStock <= medicine.minStockLevel) {
      // Check 24-hour suppression window to prevent alert fatigue
      const existingAlert = await this.repo.findRecentNotification(
        NotificationType.LOW_STOCK,
        medicineId,
        1440 // 24 hours
      );

      if (!existingAlert) {
        return this.repo.createNotification({
          userId: null, // Broadcast to tenant
          type: NotificationType.LOW_STOCK,
          title: `Low Stock Alert: ${medicine.name}`,
          message: `Stock level (${currentStock}) is at or below minimum threshold (${medicine.minStockLevel}). Replenishment required.`,
          referenceId: medicineId,
        });
      }
    }

    return null;
  }

  async listNotifications(
    userId: string,
    filters: { isRead?: boolean; type?: NotificationType; page?: number; limit?: number } = {}
  ) {
    return this.repo.listNotifications(userId, filters);
  }

  async getUnreadCount(userId: string) {
    return this.repo.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.repo.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string) {
    return this.repo.markAllAsRead(userId);
  }
}

// ============================================================================
// DECOUPLED ASYNCHRONOUS EVENT ENGINE
// ============================================================================

class NotificationEventEngine extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners() {
    this.on("stock.check", ({ tenantId, medicineId }: { tenantId: string; medicineId: string }) => {
      setImmediate(async () => {
        try {
          const service = new NotificationService(tenantId);
          await service.evaluateStockLevels(medicineId);
        } catch (err) {
          // Asynchronous background error isolated from main response
          console.error(`[NOTIFICATION_EVENT_ERROR] Stock check failed for medicine ${medicineId}:`, err);
        }
      });
    });

    this.on(
      "notification.broadcast",
      ({
        tenantId,
        type,
        title,
        message,
        referenceId,
        userId,
      }: {
        tenantId: string;
        type: NotificationType;
        title: string;
        message: string;
        referenceId?: string | null;
        userId?: string | null;
      }) => {
        setImmediate(async () => {
          try {
            const service = new NotificationService(tenantId);
            await service.broadcast(type, title, message, referenceId, userId);
          } catch (err) {
            console.error(`[NOTIFICATION_EVENT_ERROR] Broadcast failed for tenant ${tenantId}:`, err);
          }
        });
      }
    );
  }

  /**
   * Dispatches an asynchronous stock threshold evaluation without blocking the HTTP thread.
   */
  emitStockCheck(tenantId: string, medicineId: string) {
    this.emit("stock.check", { tenantId, medicineId });
  }

  /**
   * Dispatches an asynchronous notification broadcast.
   */
  emitBroadcast(
    tenantId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceId?: string | null,
    userId?: string | null
  ) {
    this.emit("notification.broadcast", { tenantId, type, title, message, referenceId, userId });
  }
}

// Global singleton instance for event emission
export const notifyAsync = new NotificationEventEngine();
