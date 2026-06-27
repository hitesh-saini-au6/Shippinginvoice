/** Strips Excel-style formula wrappers like ="53767610001024". */
export function cleanCsvValue(value: string | undefined | null): string {
  if (value == null) {
    return "";
  }

  let cleaned = value.trim();
  if (cleaned.startsWith('="') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(2, -1);
  }
  return cleaned.trim();
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}
