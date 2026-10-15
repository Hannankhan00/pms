import { FinanceRepository } from "../repositories/finance.repository";

export interface GrossProfitReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalSalesCount: number;
  totalItemsSold: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercentage: number;
  itemBreakdown: Array<{
    medicineId: string;
    medicineName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    cogs: number;
    profit: number;
    marginPercentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
  }>;
}

export class MetricsService {
  private readonly repository: FinanceRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new FinanceRepository(tenantId);
  }

  /**
   * Calculates Gross Profit over a date range.
   * Formula: Gross Profit = Total Revenue (from Sales) - Cost of Goods Sold (COGS).
   * COGS Calculation: Sum of (SaleItem.quantity * MedicineBatch.purchasePrice).
   */
  async calculateGrossProfit(params: {
    startDate?: string;
    endDate?: string;
    branchId?: string;
  }): Promise<GrossProfitReport> {
    const start = params.startDate ? new Date(`${params.startDate}T00:00:00.000Z`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = params.endDate ? new Date(`${params.endDate}T23:59:59.999Z`) : new Date();

    const saleItems = await this.repository.findSaleItemsForProfit({
      startDate: start,
      endDate: end,
      branchId: params.branchId,
    });

    const uniqueSales = new Set<string>();
    let totalItemsSold = 0;
    let totalRevenue = 0;
    let totalCogs = 0;

    const itemMap = new Map<
      string,
      {
        medicineId: string;
        medicineName: string;
        sku: string;
        quantitySold: number;
        revenue: number;
        cogs: number;
      }
    >();

    const dailyMap = new Map<
      string,
      {
        revenue: number;
        cogs: number;
      }
    >();

    for (const item of saleItems) {
      uniqueSales.add(item.sale.id);
      const qty = item.quantity;
      const subtotal = Number(item.subtotal);
      const purchasePrice = Number(item.batch.purchasePrice);
      const itemCogs = qty * purchasePrice;

      totalItemsSold += qty;
      totalRevenue += subtotal;
      totalCogs += itemCogs;

      // Group by Medicine
      const existingItem = itemMap.get(item.medicineId) || {
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        sku: item.medicine.sku,
        quantitySold: 0,
        revenue: 0,
        cogs: 0,
      };
      existingItem.quantitySold += qty;
      existingItem.revenue += subtotal;
      existingItem.cogs += itemCogs;
      itemMap.set(item.medicineId, existingItem);

      // Group by Day (YYYY-MM-DD)
      const dayKey = item.sale.saleDate.toISOString().slice(0, 10);
      const existingDay = dailyMap.get(dayKey) || { revenue: 0, cogs: 0 };
      existingDay.revenue += subtotal;
      existingDay.cogs += itemCogs;
      dailyMap.set(dayKey, existingDay);
    }

    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const itemBreakdown = Array.from(itemMap.values())
      .map((item) => {
        const profit = item.revenue - item.cogs;
        const marginPercentage = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
        return {
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          sku: item.sku,
          quantitySold: item.quantitySold,
          revenue: Number(item.revenue.toFixed(2)),
          cogs: Number(item.cogs.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          marginPercentage: Number(marginPercentage.toFixed(2)),
        };
      })
      .sort((a, b) => b.profit - a.profit);

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: Number(data.revenue.toFixed(2)),
        cogs: Number(data.cogs.toFixed(2)),
        grossProfit: Number((data.revenue - data.cogs).toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      dateRange: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      },
      totalSalesCount: uniqueSales.size,
      totalItemsSold,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCogs: Number(totalCogs.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMarginPercentage: Number(grossMarginPercentage.toFixed(2)),
      itemBreakdown,
      dailyBreakdown,
    };
  }
}
