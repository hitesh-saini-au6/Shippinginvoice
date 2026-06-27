/**
 * Courier rate card — update here without touching business logic.
 * Keys are normalized zone codes (A, B, C, D1, D2, E, F).
 */
export const RAJASTHAN_RATE_PER_KG = 40;

export const ZONE_RATES_PER_KG: Record<string, number> = {
  A: 40,
  B: 50,
  C: 70,
  D1: 70,
  D2: 70,
  E: 75,
  F: 75,
};

export const RAJASTHAN_STATE_CODE = "RJ";
