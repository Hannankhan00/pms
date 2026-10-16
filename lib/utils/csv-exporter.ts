/**
 * Standardized CSV Export Utility.
 * Converts arbitrary JavaScript/TypeScript object arrays into RFC 4180 formatted CSV strings.
 * Safely escapes double quotes, commas, and newlines.
 */

export interface CsvColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
}

export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns?: CsvColumn<T>[]
): string {
  if (!data || data.length === 0) {
    if (columns && columns.length > 0) {
      return columns.map((col) => escapeCsvField(col.header)).join(",") + "\r\n";
    }
    return "";
  }

  // Derive columns if not explicitly provided
  const cols: CsvColumn<T>[] =
    columns && columns.length > 0
      ? columns
      : Object.keys(data[0]).map((key) => ({
          key,
          header: key,
        }));

  // Build header row
  const headerRow = cols.map((c) => escapeCsvField(c.header)).join(",");

  // Build data rows
  const dataRows = data.map((row) => {
    return cols
      .map((col) => {
        const rawValue = (row as Record<string, unknown>)[col.key as string];
        let formattedValue: string;

        if (col.formatter) {
          formattedValue = col.formatter(rawValue, row);
        } else if (rawValue === null || rawValue === undefined) {
          formattedValue = "";
        } else if (rawValue instanceof Date) {
          formattedValue = rawValue.toISOString();
        } else if (typeof rawValue === "object") {
          formattedValue = JSON.stringify(rawValue);
        } else {
          formattedValue = String(rawValue);
        }

        return escapeCsvField(formattedValue);
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\r\n") + "\r\n";
}

function escapeCsvField(field: string): string {
  if (field === null || field === undefined) {
    return "";
  }

  const str = String(field);

  // If contains commas, double quotes, or newlines, quote and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Returns a standardized Response with appropriate headers for browser file download.
 */
export function createCsvResponse(csvContent: string, filename: string): Response {
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
