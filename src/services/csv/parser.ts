import Papa from "papaparse";
import { cleanCsvValue } from "@/utils/csvValue";
import { parseDelhiveryDate } from "@/utils/date";
import { parseWeightGrams } from "@/utils/weight";
import {
  getMissingColumns,
  REQUIRED_COLUMN_LABELS,
  resolveColumnMapping,
} from "@/services/csv/columnMap";
import type { CsvParseResult, DelhiveryShipment } from "@/types";

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
  const missing = getMissingColumns(headers);

  if (missing.length > 0) {
    const labels = missing.map(
      (field) => REQUIRED_COLUMN_LABELS[field as keyof typeof REQUIRED_COLUMN_LABELS],
    );
    return {
      shipments: [],
      errors: [`Missing required columns: ${labels.join(", ")}`],
    };
  }

  const mapping = resolveColumnMapping(headers);
  if (!mapping) {
    return {
      shipments: [],
      errors: ["Unable to map required CSV columns."],
    };
  }

  const shipments: DelhiveryShipment[] = [];

  for (const row of parsed.data) {
    const pickupDateRaw = cleanCsvValue(row[mapping.pickupDate]);
    const pickupDate = parseDelhiveryDate(pickupDateRaw);

    if (!pickupDate) {
      continue;
    }

    shipments.push({
      waybillNumber: cleanCsvValue(row[mapping.waybillNumber]),
      pickupDate,
      chargedWeightGrams: parseWeightGrams(
        cleanCsvValue(row[mapping.chargedWeight]),
      ),
      zone: cleanCsvValue(row[mapping.zone]),
      pincode: cleanCsvValue(row[mapping.pincode]),
      orderId: cleanCsvValue(row[mapping.orderId]),
      rawRow: { ...row },
    });
  }

  return { shipments, errors: [] };
}
