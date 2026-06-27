import type { PincodeMaster, PincodeRecord } from "@/types";

export interface PincodeLookupResult {
  found: boolean;
  record?: PincodeRecord;
  destination: string;
  stateCode: string;
  isRajasthan: boolean;
}

export function lookupPincode(
  master: PincodeMaster,
  pincode: string,
): PincodeLookupResult {
  const normalized = pincode.trim();
  const record = master[normalized];

  if (!record) {
    return {
      found: false,
      destination: "",
      stateCode: "",
      isRajasthan: false,
    };
  }

  return {
    found: true,
    record,
    destination: record.district,
    stateCode: record.stateCode,
    isRajasthan: record.stateCode === "RJ",
  };
}
