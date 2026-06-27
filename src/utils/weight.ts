/** Converts grams to kilograms, always rounding up. */
export function gramsToRoundedKg(grams: number): number {
  if (grams <= 0) {
    return 0;
  }
  return Math.ceil(grams / 1000);
}

export function parseWeightGrams(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/** Display raw grams — trim trailing zeros for whole numbers. */
export function formatWeightGrams(grams: number | null): string {
  if (grams == null) {
    return "";
  }

  if (Number.isInteger(grams)) {
    return String(grams);
  }

  return String(grams);
}
