import type { DelhiveryShipment } from "@/types";

export function shipmentDedupKey(shipment: DelhiveryShipment): string {
  const awb = shipment.waybillNumber.trim().toLowerCase();
  const date = shipment.pickupDate.toISOString().slice(0, 10);
  return `${awb}|${date}`;
}

export function dedupeShipments(shipments: DelhiveryShipment[]): {
  shipments: DelhiveryShipment[];
  duplicatesSkipped: number;
} {
  const seen = new Set<string>();
  const unique: DelhiveryShipment[] = [];

  for (const shipment of shipments) {
    const key = shipmentDedupKey(shipment);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(shipment);
  }

  return {
    shipments: unique,
    duplicatesSkipped: shipments.length - unique.length,
  };
}

export function mergeShipments(
  existing: DelhiveryShipment[],
  incoming: DelhiveryShipment[],
): {
  shipments: DelhiveryShipment[];
  duplicatesSkipped: number;
} {
  return dedupeShipments([...existing, ...incoming]);
}

function createFileBatchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function tagShipmentsForFile(
  shipments: DelhiveryShipment[],
  sourceFileId: string = createFileBatchId(),
): { sourceFileId: string; shipments: DelhiveryShipment[] } {
  return {
    sourceFileId,
    shipments: shipments.map((shipment) => ({
      ...shipment,
      sourceFileId,
      manualId: undefined,
    })),
  };
}
