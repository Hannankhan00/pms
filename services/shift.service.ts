import { ShiftRepository } from "../repositories/shift.repository";
import { OpenShiftSchema, CloseShiftSchema, ShiftTransactionSchema } from "../validations/shift.schema";
import { ValidationError, NotFoundError, ConflictError } from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions/permission-service";
import { ShiftStatus } from "@prisma/client";
import { tenantDb } from "../lib/tenant/tenant-db";

export class ShiftService {
  private readonly repository: ShiftRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new ShiftRepository(tenantId);
  }

  async getActiveShift(userId: string) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SHIFT_VIEW);
    return this.repository.findActiveShiftByUser(userId);
  }

  async openShift(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SHIFT_OPEN);

    const parsed = OpenShiftSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid shift open data", parsed.error.format());
    }

    // 1. Verify user does not already have an active OPEN shift
    const existingActiveShift = await this.repository.findActiveShiftByUser(userId);
    if (existingActiveShift) {
      throw new ConflictError(
        `User already has an active open shift (Shift #${existingActiveShift.id.slice(0, 8)} opened at ${new Date(existingActiveShift.openedAt).toLocaleTimeString()}). You must close it before opening a new one.`
      );
    }

    // 2. Resolve branch
    let branchId = parsed.data.branchId;
    if (!branchId) {
      const db = tenantDb(this.tenantId);
      const user = await db.user.findFirst({
        where: { id: userId },
      });

      if (user?.branchId) {
        branchId = user.branchId;
      } else {
        const mainBranch = await db.branch.findFirst({
          where: { isMain: true, isActive: true },
        });
        if (!mainBranch) {
          const firstBranch = await db.branch.findFirst({ where: { isActive: true } });
          if (!firstBranch) {
            throw new ValidationError("No active branch found to associate with shift");
          }
          branchId = firstBranch.id;
        } else {
          branchId = mainBranch.id;
        }
      }
    }

    return this.repository.createShift({
      userId,
      branchId: branchId!,
      openingCash: parsed.data.openingCash,
      notes: parsed.data.notes,
    });
  }

  async getReconciliationSummary(userId: string, shiftId: string) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SHIFT_VIEW);
    const shift = await this.repository.findShiftById(shiftId);
    if (!shift) {
      throw new NotFoundError("Shift", shiftId);
    }
    return this.repository.calculateExpectedCash(shiftId);
  }

  async closeShift(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SHIFT_CLOSE);

    const parsed = CloseShiftSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid shift close data", parsed.error.format());
    }

    const { shiftId, closingCash, notes } = parsed.data;

    // Verify shift exists and is currently OPEN
    const shift = await this.repository.findShiftById(shiftId);
    if (!shift) {
      throw new NotFoundError("Shift", shiftId);
    }
    if (shift.status === ShiftStatus.CLOSED) {
      throw new ConflictError("This shift is already closed");
    }

    // Calculate expected cash balance based on sales and cash movements
    const summary = await this.repository.calculateExpectedCash(shiftId);
    const variance = closingCash - summary.expectedCash;

    return this.repository.closeShift(shiftId, {
      closingCash,
      expectedCash: summary.expectedCash,
      variance,
      notes,
      userId,
    });
  }

  async recordShiftTransaction(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SHIFT_OPEN);

    const parsed = ShiftTransactionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid shift transaction input", parsed.error.format());
    }

    const shift = await this.repository.findShiftById(parsed.data.shiftId);
    if (!shift) {
      throw new NotFoundError("Shift", parsed.data.shiftId);
    }
    if (shift.status !== ShiftStatus.OPEN) {
      throw new ConflictError("Cannot record cash movements for a closed shift");
    }

    return this.repository.createShiftTransaction({
      shiftId: parsed.data.shiftId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      userId,
    });
  }

  async listShifts(userId: string, params?: {
    branchId?: string;
    targetUserId?: string;
    status?: ShiftStatus;
    limit?: number;
    offset?: number;
  }) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SHIFT_VIEW);
    return this.repository.listShifts({
      branchId: params?.branchId,
      userId: params?.targetUserId,
      status: params?.status,
      limit: params?.limit,
      offset: params?.offset,
    });
  }
}
