import { formatFilenameDate } from "@/utils/date";
import type { GeneratedInvoice } from "@/types";

export function getInvoiceFilename(
  invoice: GeneratedInvoice,
  extension: "xlsx" | "pdf",
): string {
  return `Invoice_${formatFilenameDate(invoice.billingFrom)}_to_${formatFilenameDate(invoice.billingTo)}.${extension}`;
}
