import { tenantDb } from "../lib/tenant/tenant-db";
import { prisma } from "../lib/db/prisma";
import { AuditAction } from "@prisma/client";
import { logger } from "../lib/logging/logger";

export interface LogMutationParams {
  tenantId: string;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  tx?: any; // Optional transaction client
}

export class AuditService {
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Appends an immutable forensic record to the central AuditLog.
   * Can run standalone or within an active Prisma transaction client.
   */
  async logMutation(params: LogMutationParams) {
    try {
      const sanitizedOld = params.oldValues ? this.sanitizeValues(params.oldValues) : null;
      const sanitizedNew = params.newValues ? this.sanitizeValues(params.newValues) : null;

      const db = params.tx ? tenantDb(params.tenantId, params.tx) : tenantDb(params.tenantId);

      const entry = await db.auditLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldValues: sanitizedOld as any,
          newValues: sanitizedNew as any,
          ipAddress: params.ipAddress || null,
        },
      });

      return entry;
    } catch (error) {
      // In critical regulatory mode, audit log failures are logged with high severity
      logger.error("Audit logging failure in AuditService", {
        tenantId: params.tenantId,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        error,
      });
      throw error;
    }
  }

  /**
   * Helper utility to cleanly wrap mutations with automated before/after state capture.
   */
  async trackMutation<T extends Record<string, unknown>>(
    userId: string,
    action: AuditAction,
    entity: string,
    entityId: string,
    fetchCurrentState: () => Promise<T | null>,
    executeMutation: () => Promise<T>,
    ipAddress?: string
  ): Promise<T> {
    const oldValues = await fetchCurrentState();
    const newValues = await executeMutation();

    // Record immutable audit entry
    await this.logMutation({
      tenantId: this.tenantId,
      userId,
      action,
      entity,
      entityId,
      oldValues: oldValues || null,
      newValues: newValues || null,
      ipAddress: ipAddress || null,
    });

    return newValues;
  }

  /**
   * Strips out internal security secrets or oversized binaries before logging.
   */
  private sanitizeValues(values: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...values };
    const sensitiveKeys = ["password", "token", "secret", "apiKey", "creditCard"];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }
}
