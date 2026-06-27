import { gstSettings } from "@/config/invoiceSettings";
import { roundMoney } from "@/utils/currency";
import type { GstBreakdown, InvoiceLine, InvoiceSummary } from "@/types";

export function buildInvoiceSummary(lines: InvoiceLine[]): InvoiceSummary {
  const totalFreight = roundMoney(
    lines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
  );

  const taxableValue = totalFreight;
  const sgstAmount = roundMoney(
    (taxableValue * gstSettings.sgstRate) / 100,
  );
  const cgstAmount = roundMoney(
    (taxableValue * gstSettings.cgstRate) / 100,
  );
  const igstAmount = roundMoney(
    (taxableValue * gstSettings.igstRate) / 100,
  );
  const totalInvoiceValue = roundMoney(
    taxableValue + sgstAmount + cgstAmount + igstAmount,
  );

  const gst: GstBreakdown = {
    taxableValue,
    sgstRate: gstSettings.sgstRate,
    cgstRate: gstSettings.cgstRate,
    igstRate: gstSettings.igstRate,
    sgstAmount,
    cgstAmount,
    igstAmount,
    totalInvoiceValue,
  };

  return {
    totalShipments: lines.length,
    totalFreight,
    gst,
  };
}

export function hasLineIssues(line: InvoiceLine): boolean {
  return line.issues.length > 0;
}
