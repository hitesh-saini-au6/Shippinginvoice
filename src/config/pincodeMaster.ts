import type { PincodeMaster } from "@/types";

const PINCODE_MASTER_URL = "/data/pincode-master.json";

let cachedMaster: PincodeMaster | null = null;

/** Loads pincode master from bundled JSON — replace file without code changes. */
export async function loadPincodeMaster(): Promise<PincodeMaster> {
  if (cachedMaster) {
    return cachedMaster;
  }

  const response = await fetch(PINCODE_MASTER_URL);
  if (!response.ok) {
    throw new Error("Failed to load pincode master data.");
  }

  cachedMaster = (await response.json()) as PincodeMaster;
  return cachedMaster;
}

export function clearPincodeMasterCache(): void {
  cachedMaster = null;
}
