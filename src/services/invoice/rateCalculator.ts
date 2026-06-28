import { VALID_DELHIVERY_ZONES } from "@/config/rateCard";
import type { FreightRateSettings } from "@/types";
import { gramsToRoundedKg } from "@/utils/weight";

export function normalizeZone(zone: string): string {
  const cleaned = zone.trim().toUpperCase().replace(/^ZONE\s*/i, "");
  return cleaned;
}

export function getRatePerKg(
  zone: string,
  isRajasthan: boolean,
  rateSettings: FreightRateSettings,
): number | null {
  if (isRajasthan) {
    return rateSettings.rajasthanRatePerKg;
  }

  const normalized = normalizeZone(zone);
  if (!normalized || !VALID_DELHIVERY_ZONES.includes(normalized as (typeof VALID_DELHIVERY_ZONES)[number])) {
    return null;
  }

  return rateSettings.defaultRatePerKg;
}

export function calculateFreightAmount(
  weightGrams: number,
  zone: string,
  isRajasthan: boolean,
  rateSettings: FreightRateSettings,
): number | null {
  const rate = getRatePerKg(zone, isRajasthan, rateSettings);
  if (rate == null) {
    return null;
  }

  const roundedKg = gramsToRoundedKg(weightGrams);
  return roundedKg * rate;
}

export function isRajasthanState(stateCode: string): boolean {
  return stateCode.toUpperCase() === "RJ";
}
