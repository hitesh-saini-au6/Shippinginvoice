import { normalizeHeader } from "@/utils/csvValue";
import type { ColumnMapping } from "@/types";

const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  waybillNumber: [
    "waybill_num",
    "waybill number",
    "waybill no",
    "awb number",
    "awb no",
    "c/n no.",
    "cn no",
  ],
  pickupDate: ["pickup_date", "pickup date", "date"],
  chargedWeight: ["charged_weight", "charged weight", "weight"],
  zone: ["zone"],
  pincode: [
    "destination_pin",
    "pincode",
    "pin code",
    "destination pin",
  ],
  orderId: ["order_id", "order id", "order number", "ref. no.", "reference no"],
};

export function resolveColumnMapping(headers: string[]): ColumnMapping | null {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const mapping = {} as ColumnMapping;

  for (const field of Object.keys(COLUMN_ALIASES) as Array<
    keyof ColumnMapping
  >) {
    const aliases = COLUMN_ALIASES[field];
    const match = normalizedHeaders.find((header) =>
      aliases.includes(header.normalized),
    );

    if (!match) {
      return null;
    }

    mapping[field] = match.original;
  }

  return mapping;
}

export function getMissingColumns(headers: string[]): string[] {
  const mapping = resolveColumnMapping(headers);
  if (!mapping) {
    const normalized = new Set(headers.map(normalizeHeader));
    const missing: string[] = [];

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (!aliases.some((alias) => normalized.has(alias))) {
        missing.push(field);
      }
    }

    return missing;
  }

  return [];
}

export const REQUIRED_COLUMN_LABELS: Record<keyof ColumnMapping, string> = {
  waybillNumber: "Waybill Number",
  pickupDate: "Pickup Date",
  chargedWeight: "Charged Weight",
  zone: "Zone",
  pincode: "Pincode",
  orderId: "Order ID",
};
