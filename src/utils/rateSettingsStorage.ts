import {
  DEFAULT_RATE_PER_KG,
  RAJASTHAN_RATE_PER_KG,
} from "@/config/rateCard";
import type { FreightRateSettings } from "@/types";

const STORAGE_KEY = "courier-invoice-freight-rates";

export const DEFAULT_FREIGHT_RATE_SETTINGS: FreightRateSettings = {
  rajasthanRatePerKg: RAJASTHAN_RATE_PER_KG,
  defaultRatePerKg: DEFAULT_RATE_PER_KG,
};

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function normalizeFreightRateSettings(
  value: Partial<FreightRateSettings> | null | undefined,
): FreightRateSettings {
  return {
    rajasthanRatePerKg: isValidRate(value?.rajasthanRatePerKg)
      ? value.rajasthanRatePerKg
      : DEFAULT_FREIGHT_RATE_SETTINGS.rajasthanRatePerKg,
    defaultRatePerKg: isValidRate(value?.defaultRatePerKg)
      ? value.defaultRatePerKg
      : DEFAULT_FREIGHT_RATE_SETTINGS.defaultRatePerKg,
  };
}

export function loadFreightRateSettings(): FreightRateSettings {
  if (typeof window === "undefined") {
    return DEFAULT_FREIGHT_RATE_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FREIGHT_RATE_SETTINGS;
    }

    return normalizeFreightRateSettings(
      JSON.parse(raw) as Partial<FreightRateSettings>,
    );
  } catch {
    return DEFAULT_FREIGHT_RATE_SETTINGS;
  }
}

export function saveFreightRateSettings(settings: FreightRateSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
