import {
  DEFAULT_RATE_PER_KG,
  RAJASTHAN_RATE_PER_KG,
  RAJASTHAN_STATE_CODE,
  ZONE_RATES_PER_KG,
} from "@/config/rateCard";
import { gramsToRoundedKg } from "@/utils/weight";

export function normalizeZone(zone: string): string {
  const cleaned = zone.trim().toUpperCase().replace(/^ZONE\s*/i, "");
  return cleaned;
}

export function getRatePerKg(zone: string, isRajasthan: boolean): number | null {
  if (isRajasthan) {
    return RAJASTHAN_RATE_PER_KG;
  }

  const normalized = normalizeZone(zone);
  if (!normalized || !(normalized in ZONE_RATES_PER_KG)) {
    return null;
  }

  return DEFAULT_RATE_PER_KG;
}

export function calculateFreightAmount(
  weightGrams: number,
  zone: string,
  isRajasthan: boolean,
): number | null {
  const rate = getRatePerKg(zone, isRajasthan);
  if (rate == null) {
    return null;
  }

  const roundedKg = gramsToRoundedKg(weightGrams);
  return roundedKg * rate;
}

export function isRajasthanState(stateCode: string): boolean {
  return stateCode.toUpperCase() === RAJASTHAN_STATE_CODE;
}
