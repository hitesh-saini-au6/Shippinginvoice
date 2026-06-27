import ExcelJS from "exceljs";
import { parseDelhiveryRows } from "@/services/csv/rowParser";
import type { CsvParseResult } from "@/types";

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  if (typeof value === "object") {
    if ("result" in value && value.result != null) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
    if ("text" in value && value.text != null) {
      return String(value.text);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }

  return String(value);
}

/** Reads Delhivery billing data from the first worksheet of an Excel file. */
export async function parseDelhiveryXlsx(
  buffer: ArrayBuffer,
): Promise<CsvParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { shipments: [], errors: ["Excel file has no worksheets."] };
  }

  const headers: string[] = [];
  const rows: Record<string, string>[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = cellToString(cell.value).trim();
      });
      return;
    }

    const record: Record<string, string> = {};
    let hasData = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (!header) {
        return;
      }
      const value = cellToString(cell.value).trim();
      if (value) {
        hasData = true;
      }
      record[header] = value;
    });

    if (hasData) {
      rows.push(record);
    }
  });

  const cleanedHeaders = headers.filter(Boolean);
  return parseDelhiveryRows(cleanedHeaders, rows);
}
