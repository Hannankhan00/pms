/**
 * RFC 4180 compliant CSV Parser.
 * Properly handles:
 * - Commas within quoted fields
 * - Escaped double quotes ("")
 * - Embedded newlines within quoted fields
 * - CRLF (\r\n) and LF (\n) delimiters
 * - UTF-8 Byte Order Mark (BOM) stripping
 * - Empty rows and whitespace trimming
 */

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: { row: number; message: string }[];
}

export function parseCsv(csvContent: string): CsvParseResult {
  const errors: { row: number; message: string }[] = [];
  
  // Strip BOM if present
  let cleanContent = csvContent;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let charIndex = 0;
  let rowNumber = 1;

  while (charIndex < cleanContent.length) {
    const char = cleanContent[charIndex];
    const nextChar = cleanContent[charIndex + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          charIndex += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          charIndex++;
          continue;
        }
      } else {
        currentField += char;
        charIndex++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        charIndex++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
        charIndex++;
        continue;
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rawRows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        rowNumber++;
        charIndex += 2;
        continue;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rawRows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        rowNumber++;
        charIndex++;
        continue;
      } else {
        currentField += char;
        charIndex++;
        continue;
      }
    }
  }

  // Push final field and row if any remains
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rawRows.push(currentRow);
    }
  }

  if (rawRows.length === 0) {
    return { headers: [], rows: [], errors: [{ row: 1, message: "CSV file is empty" }] };
  }

  const rawHeaders = rawRows[0];
  const headers = rawHeaders.map((h) => h.trim().replace(/^[\uFEFF]/, ""));

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const values = rawRows[i];
    if (values.length !== headers.length) {
      errors.push({
        row: i + 1,
        message: `Column count mismatch: expected ${headers.length} columns, found ${values.length}`,
      });
      continue;
    }

    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = values[c];
    }
    rows.push(rowObj);
  }

  return { headers, rows, errors };
}
