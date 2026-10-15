/**
 * Timezone-Aware Clinical Date Range Helpers
 * Enforces strict start-of-day (00:00:00.000) and end-of-day (23:59:59.999) boundaries
 * to prevent transactional records from bleeding into adjacent calendar days.
 */

export function parseDateRange(params: {
  startDate?: string;
  endDate?: string;
  timezoneOffset?: number; // Client timezone offset in minutes (e.g., -300 for PKT, 60 for CET)
}): { start: Date; end: Date } {
  let start: Date;
  let end: Date;

  if (params.startDate) {
    // If format is YYYY-MM-DD
    const datePart = params.startDate.split("T")[0];
    start = new Date(`${datePart}T00:00:00.000Z`);
    if (params.timezoneOffset !== undefined && !isNaN(params.timezoneOffset)) {
      start = new Date(start.getTime() + params.timezoneOffset * 60 * 1000);
    }
  } else {
    // Default: 30 days ago at midnight
    start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }

  if (params.endDate) {
    const datePart = params.endDate.split("T")[0];
    end = new Date(`${datePart}T23:59:59.999Z`);
    if (params.timezoneOffset !== undefined && !isNaN(params.timezoneOffset)) {
      end = new Date(end.getTime() + params.timezoneOffset * 60 * 1000);
    }
  } else {
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export function formatDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}
