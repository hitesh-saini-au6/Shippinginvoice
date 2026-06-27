import type { ColumnMapping, CsvParseResult, DelhiveryShipment } from "@/types";
import { cleanCsvValue } from "@/utils/csvValue";
import { parseDelhiveryDate } from "@/utils/date";
import { parseWeightGrams } from "@/utils/weight";
import {
  getMissingColumns,
  REQUIRED_COLUMN_LABELS,
  resolveColumnMapping,
} from "@/services/csv/columnMap";

export function buildShipmentsFromRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): DelhiveryShipment[] {
  const shipments: DelhiveryShipment[] = [];

  for (const row of rows) {
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

  return shipments;
}

export function parseDelhiveryRows(
  headers: string[],
  rows: Record<string, string>[],
): CsvParseResult {
  const missing = getMissingColumns(headers);

  if (missing.length > 0) {
    const labels = missing.map(
      (field) =>
        REQUIRED_COLUMN_LABELS[field as keyof typeof REQUIRED_COLUMN_LABELS],
    );
    return {
      shipments: [],
      errors: [
        `Missing required columns: ${labels.join(", ")}. Found headers: ${headers.slice(0, 8).join(", ")}${headers.length > 8 ? "..." : ""}`,
      ],
    };
  }

  const mapping = resolveColumnMapping(headers);
  if (!mapping) {
    return {
      shipments: [],
      errors: ["Unable to map required columns in the uploaded file."],
    };
  }

  const shipments = buildShipmentsFromRows(rows, mapping);

  if (shipments.length === 0) {
    return {
      shipments: [],
      errors: [
        "No valid shipments found. Check that Pickup Date values are present and readable.",
      ],
    };
  }

  return { shipments, errors: [] };
}
