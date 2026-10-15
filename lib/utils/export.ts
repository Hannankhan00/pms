/**
 * Clinical Export Infrastructure Utility
 * Converts tabular JSON datasets into standard UTF-8 CSV with Byte Order Mark (BOM)
 * to ensure Arabic, French, and Italian characters are rendered without mojibake in Microsoft Excel.
 */

export interface ExportColumn<T = any> {
  key: keyof T | string;
  label: string;
  formatter?: (value: any, item: T) => string | number;
}

export function exportToCsv<T extends Record<string, any>>(
  filename: string,
  data: T[],
  columns: ExportColumn<T>[]
): void {
  if (!data || data.length === 0) {
    console.warn("No data provided for export.");
    return;
  }

  // Header row
  const headers = columns.map((col) => `"${escapeQuotes(col.label)}"`).join(",");

  // Data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let value: any;
        if (typeof col.key === "string" && col.key.includes(".")) {
          // Nested path resolution (e.g. medicine.name)
          const keys = col.key.split(".");
          value = keys.reduce((acc, k) => acc?.[k], item);
        } else {
          value = item[col.key as keyof T];
        }

        if (col.formatter) {
          value = col.formatter(value, item);
        }

        if (value === null || value === undefined) {
          return '""';
        }

        return `"${escapeQuotes(String(value))}"`;
      })
      .join(",");
  });

  // UTF-8 BOM prefix (\uFEFF) ensures Excel opens multilingual files properly
  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeQuotes(val: string): string {
  return val.replace(/"/g, '""');
}
