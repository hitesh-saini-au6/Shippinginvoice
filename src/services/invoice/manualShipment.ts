import { ZONE_RATES_PER_KG } from "@/config/rateCard";
import type { DelhiveryShipment } from "@/types";
import { parseWeightGrams } from "@/utils/weight";

export const MANUAL_SHIPMENT_ZONES = Object.keys(ZONE_RATES_PER_KG).sort();

export interface ManualShipmentInput {
  waybillNumber: string;
  pickupDate: string;
  orderId: string;
  pincode: string;
  zone: string;
  weightGrams: string;
}

export interface ManualShipmentResult {
  shipment?: DelhiveryShipment;
  errors: string[];
}

function createManualId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildManualShipment(
  input: ManualShipmentInput,
): ManualShipmentResult {
  const errors: string[] = [];
  const waybillNumber = input.waybillNumber.trim();
  const orderId = input.orderId.trim();
  const pincode = input.pincode.trim();
  const zone = input.zone.trim().toUpperCase();
  const pickupDateRaw = input.pickupDate.trim();

  if (!waybillNumber) {
    errors.push("AWB / waybill number is required.");
  }

  if (!pickupDateRaw) {
    errors.push("Pickup date is required.");
  }

  const pickupDate = pickupDateRaw
    ? new Date(`${pickupDateRaw}T00:00:00`)
    : null;

  if (pickupDateRaw && (!pickupDate || Number.isNaN(pickupDate.getTime()))) {
    errors.push("Pickup date is invalid.");
  }

  if (!pincode) {
    errors.push("Pincode is required.");
  }

  if (!zone) {
    errors.push("Zone is required.");
  } else if (!MANUAL_SHIPMENT_ZONES.includes(zone)) {
    errors.push(`Zone must be one of: ${MANUAL_SHIPMENT_ZONES.join(", ")}.`);
  }

  const chargedWeightGrams = parseWeightGrams(input.weightGrams);
  if (!input.weightGrams.trim()) {
    errors.push("Weight in grams is required.");
  } else if (chargedWeightGrams == null || chargedWeightGrams <= 0) {
    errors.push("Weight must be a positive number (grams).");
  }

  if (errors.length > 0 || !pickupDate) {
    return { errors };
  }

  return {
    errors: [],
    shipment: {
      waybillNumber,
      pickupDate,
      chargedWeightGrams,
      zone,
      pincode,
      orderId,
      manualId: createManualId(),
      rawRow: {
        source: "manual",
        waybillNumber,
        pickupDate: pickupDateRaw,
        orderId,
        pincode,
        zone,
        weightGrams: input.weightGrams.trim(),
      },
    },
  };
}
