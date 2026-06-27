import Papa from "papaparse";
import { parseDelhiveryRows } from "@/services/csv/rowParser";
import type { CsvParseResult } from "@/types";

export function parseDelhiveryCsv(fileContent: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return {
      shipments: [],
      errors: parsed.errors.map((error) => error.message),
    };
  }

  const headers = parsed.meta.fields ?? [];
  return parseDelhiveryRows(headers, parsed.data);
}

export async function parseDelhiveryFile(
  file: File,
): Promise<CsvParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xlsm") {
    const buffer = await file.arrayBuffer();
    const { parseDelhiveryXlsx } = await import("@/services/csv/xlsxParser");
    return parseDelhiveryXlsx(buffer);
  }

  if (extension === "csv" || extension === "txt") {
    const content = await file.text();
    return parseDelhiveryCsv(content);
  }

  return {
    shipments: [],
    errors: [
      "Unsupported file type. Please upload a Delhivery billing CSV or Excel (.xlsx) file.",
    ],
  };
}
