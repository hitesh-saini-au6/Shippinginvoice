/**
 * Default freight rates — used on first visit and "Reset to defaults".
 * Day-to-day changes are made in the Freight Rates section on the dashboard.
 */
export const RAJASTHAN_RATE_PER_KG = 40;
export const DEFAULT_RATE_PER_KG = 70;

/** Known Delhivery zone codes for validation and manual entry. */
export const VALID_DELHIVERY_ZONES = ["A", "B", "C", "D1", "D2", "E", "F"] as const;

export const ZONE_RATES_PER_KG: Record<string, number> = Object.fromEntries(
  VALID_DELHIVERY_ZONES.map((zone) => [zone, DEFAULT_RATE_PER_KG]),
);

export const RAJASTHAN_STATE_CODE = "RJ";
