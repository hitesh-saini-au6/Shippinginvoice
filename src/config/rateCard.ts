/**
 * Courier rate card — update here without touching business logic.
 * Rajasthan pincodes (state code RJ): ₹40/kg.
 * All other destinations: ₹70/kg regardless of zone letter.
 */
export const RAJASTHAN_RATE_PER_KG = 40;
export const DEFAULT_RATE_PER_KG = 70;

/** Known Delhivery zone codes — rate is always DEFAULT_RATE_PER_KG outside Rajasthan. */
export const ZONE_RATES_PER_KG: Record<string, number> = {
  A: DEFAULT_RATE_PER_KG,
  B: DEFAULT_RATE_PER_KG,
  C: DEFAULT_RATE_PER_KG,
  D1: DEFAULT_RATE_PER_KG,
  D2: DEFAULT_RATE_PER_KG,
  E: DEFAULT_RATE_PER_KG,
  F: DEFAULT_RATE_PER_KG,
};

export const RAJASTHAN_STATE_CODE = "RJ";
