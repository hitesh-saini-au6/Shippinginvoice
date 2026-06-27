export type RawCsvRow = Record<string, string>;

export interface DelhiveryShipment {
  waybillNumber: string;
  pickupDate: Date;
  chargedWeightGrams: number | null;
  zone: string;
  pincode: string;
  orderId: string;
  rawRow: RawCsvRow;
}

export interface PincodeRecord {
  district: string;
  stateCode: string;
}

export type PincodeMaster = Record<string, PincodeRecord>;

export interface InvoiceLineIssue {
  field: "weight" | "zone" | "pincode" | "orderId" | "destination" | "amount";
  message: string;
}

export interface InvoiceLine {
  srNo: number;
  awbNo: string;
  pickupDate: Date;
  referenceNo: string;
  destination: string;
  pincode: string;
  type: string;
  mode: string;
  weightGrams: number | null;
  zone: string;
  amount: number | null;
  issues: InvoiceLineIssue[];
}

export interface GstBreakdown {
  taxableValue: number;
  sgstRate: number;
  cgstRate: number;
  igstRate: number;
  sgstAmount: number;
  cgstAmount: number;
  igstAmount: number;
  totalInvoiceValue: number;
}

export interface InvoiceSummary {
  totalShipments: number;
  totalFreight: number;
  gst: GstBreakdown;
}

export interface GeneratedInvoice {
  clientId: string;
  clientName: string;
  supplierName: string;
  supplierGstin: string;
  billingFrom: Date;
  billingTo: Date;
  invoiceDate: Date;
  invoiceNumber: string;
  lines: InvoiceLine[];
  summary: InvoiceSummary;
}

export interface InvoiceBuildOptions {
  invoiceNumber?: string;
  supplierName: string;
  supplierGstin: string;
  invoiceDate?: Date;
}

export interface CsvParseResult {
  shipments: DelhiveryShipment[];
  errors: string[];
}

export interface ColumnMapping {
  waybillNumber: string;
  pickupDate: string;
  chargedWeight: string;
  zone: string;
  pincode: string;
  orderId: string;
}
