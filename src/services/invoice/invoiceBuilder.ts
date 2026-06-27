import { clients } from "@/config/invoiceSettings";
import { filterByPickupDate, sortByPickupDate } from "@/services/invoice/dateFilter";
import { lookupPincode } from "@/services/invoice/pincodeLookup";
import { calculateFreightAmount } from "@/services/invoice/rateCalculator";
import { buildInvoiceSummary } from "@/services/invoice/validation";
import type {
  DelhiveryShipment,
  GeneratedInvoice,
  InvoiceLine,
  InvoiceLineIssue,
  PincodeMaster,
} from "@/types";

const SHIPMENT_TYPE = "Non Dox";
const SHIPMENT_MODE = "SF";

function buildLineIssues(
  shipment: DelhiveryShipment,
  destination: string,
  amount: number | null,
): InvoiceLineIssue[] {
  const issues: InvoiceLineIssue[] = [];

  if (shipment.chargedWeightGrams == null) {
    issues.push({ field: "weight", message: "Weight is missing" });
  }

  if (!shipment.zone.trim()) {
    issues.push({ field: "zone", message: "Zone is missing" });
  }

  if (!shipment.pincode.trim()) {
    issues.push({ field: "pincode", message: "Pincode is missing" });
  }

  if (!shipment.orderId.trim()) {
    issues.push({ field: "orderId", message: "Order ID is missing" });
  }

  if (shipment.pincode.trim() && !destination) {
    issues.push({
      field: "destination",
      message: "Pincode not found in master",
    });
  }

  if (amount == null && shipment.chargedWeightGrams != null && shipment.zone.trim()) {
    issues.push({ field: "amount", message: "Unable to calculate amount" });
  }

  return issues;
}

export function buildInvoice(
  shipments: DelhiveryShipment[],
  pincodeMaster: PincodeMaster,
  billingFrom: Date,
  billingTo: Date,
  clientId: string,
  invoiceDate: Date = new Date(),
  invoiceNumber?: string,
): GeneratedInvoice {
  const client = clients.find((item) => item.id === clientId) ?? clients[0];
  const filtered = sortByPickupDate(
    filterByPickupDate(shipments, billingFrom, billingTo),
  );

  const lines: InvoiceLine[] = filtered.map((shipment, index) => {
    const pincodeLookup = lookupPincode(pincodeMaster, shipment.pincode);
    const amount =
      shipment.chargedWeightGrams != null && shipment.zone.trim()
        ? calculateFreightAmount(
            shipment.chargedWeightGrams,
            shipment.zone,
            pincodeLookup.isRajasthan,
          )
        : null;

    return {
      srNo: index + 1,
      awbNo: shipment.waybillNumber,
      pickupDate: shipment.pickupDate,
      referenceNo: shipment.orderId,
      destination: pincodeLookup.destination,
      pincode: shipment.pincode,
      type: SHIPMENT_TYPE,
      mode: SHIPMENT_MODE,
      weightGrams: shipment.chargedWeightGrams,
      zone: shipment.zone,
      amount,
      issues: buildLineIssues(
        shipment,
        pincodeLookup.destination,
        amount,
      ),
    };
  });

  const resolvedInvoiceNumber =
    invoiceNumber ??
    `INV-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, "0")}-${String(invoiceDate.getDate()).padStart(2, "0")}`;

  return {
    clientId: client.id,
    clientName: client.name,
    billingFrom,
    billingTo,
    invoiceDate,
    invoiceNumber: resolvedInvoiceNumber,
    lines,
    summary: buildInvoiceSummary(lines),
  };
}
