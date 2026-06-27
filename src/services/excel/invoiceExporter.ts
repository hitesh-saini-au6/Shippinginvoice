import ExcelJS from "exceljs";
import {
  businessDetails,
  gstSettings,
  paymentSettings,
  statutoryGuidelines,
} from "@/config/invoiceSettings";
import {
  amountToWords,
  formatCurrency,
} from "@/utils/currency";
import {
  formatInvoiceDate,
  formatInvoicePeriod,
  formatPaymentDueDate,
  formatPickupDate,
} from "@/utils/date";
import { formatWeightGrams } from "@/utils/weight";
import type { GeneratedInvoice } from "@/types";

const TOTAL_COLUMNS = 11;

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

function applyBorder(cell: ExcelJS.Cell): void {
  cell.border = THIN_BORDER;
}

function setCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  options?: {
    bold?: boolean;
    size?: number;
    align?: Partial<ExcelJS.Alignment>;
    mergeTo?: { row: number; col: number };
    numFmt?: string;
  },
): ExcelJS.Cell {
  const cell = sheet.getCell(row, col);
  cell.value = value;

  if (options?.bold || options?.size) {
    cell.font = {
      bold: options.bold,
      size: options.size ?? 10,
      name: "Arial",
    };
  } else {
    cell.font = { name: "Arial", size: 10 };
  }

  if (options?.align) {
    cell.alignment = options.align;
  }

  if (options?.numFmt) {
    cell.numFmt = options.numFmt;
  }

  if (options?.mergeTo) {
    sheet.mergeCells(row, col, options.mergeTo.row, options.mergeTo.col);
  }

  return cell;
}

function buildHeaderSection(
  sheet: ExcelJS.Worksheet,
  invoice: GeneratedInvoice,
): number {
  const { summary } = invoice;

  sheet.columns = [
    { width: 6 },
    { width: 12 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 10 },
    { width: 10 },
    { width: 8 },
    { width: 10 },
    { width: 8 },
    { width: 12 },
  ];

  setCell(sheet, 1, 1, "Tax Invoice", {
    bold: true,
    size: 16,
    align: { horizontal: "center" },
    mergeTo: { row: 1, col: TOTAL_COLUMNS },
  });

  setCell(sheet, 3, 1, invoice.supplierName, { bold: true });
  setCell(sheet, 4, 1, businessDetails.addressLine);
  setCell(
    sheet,
    5,
    1,
    `${businessDetails.city} - ${businessDetails.pincode} ${businessDetails.state}. India.`,
  );
  setCell(sheet, 6, 1, `GSTIN/UIN:- ${invoice.supplierGstin}`);
  setCell(
    sheet,
    7,
    1,
    `State Name : ${businessDetails.state}, Code : ${businessDetails.stateCode}`,
  );
  setCell(sheet, 8, 1, `E-Mail :- ${businessDetails.email}`);

  const summaryRows: Array<[string, string]> = [
    ["Invoice Period", formatInvoicePeriod(invoice.billingFrom, invoice.billingTo)],
    ["Invoice No", invoice.invoiceNumber],
    ["Invoice Date", formatInvoiceDate(invoice.invoiceDate)],
    ["Amount", formatCurrency(summary.totalFreight)],
    ["FOV/ Insurance", formatCurrency(gstSettings.fovInsurance)],
    ["Other Charges", formatCurrency(gstSettings.otherCharges)],
    ["Total Amount", formatCurrency(summary.totalFreight)],
    [
      `Fuel Surcharge @ ${gstSettings.fuelSurchargePercent} %`,
      formatCurrency(0),
    ],
    ["Taxable Value", formatCurrency(summary.gst.taxableValue)],
    [`SGST @ ${summary.gst.sgstRate}%`, formatCurrency(summary.gst.sgstAmount)],
    [`CGST @ ${summary.gst.cgstRate}%`, formatCurrency(summary.gst.cgstAmount)],
    [`IGST @ ${summary.gst.igstRate}%`, formatCurrency(summary.gst.igstAmount)],
    [
      "Total Invoice Value",
      formatCurrency(summary.gst.totalInvoiceValue),
    ],
  ];

  let summaryRow = 3;
  for (const [label, value] of summaryRows) {
    setCell(sheet, summaryRow, 8, label, { bold: label.includes("Total") });
    const valueCell = setCell(sheet, summaryRow, 10, value, {
      align: { horizontal: "right" },
    });
    applyBorder(sheet.getCell(summaryRow, 8));
    applyBorder(sheet.getCell(summaryRow, 9));
    applyBorder(valueCell);
    sheet.mergeCells(summaryRow, 8, summaryRow, 9);
    sheet.mergeCells(summaryRow, 10, summaryRow, TOTAL_COLUMNS);
    summaryRow += 1;
  }

  setCell(sheet, 10, 1, "Buyer", { bold: true });
  setCell(sheet, 11, 1, invoice.buyerName, { bold: true });
  setCell(sheet, 12, 1, invoice.buyerAddressLine);
  setCell(
    sheet,
    13,
    1,
    `${invoice.buyerCity} - ${invoice.buyerPincode} ${invoice.buyerState}. India.`,
  );
  setCell(sheet, 14, 1, `GSTIN/UIN:- ${invoice.buyerGstin}`);
  setCell(
    sheet,
    15,
    1,
    `State Name : ${invoice.buyerState}, Code : ${invoice.buyerStateCode}`,
  );

  setCell(sheet, 16, 1, "Tax subject to reverse charge");
  setCell(sheet, 16, 4, "NO");

  const wordsRow = 17;
  setCell(sheet, wordsRow, 1, "Amount in Words (Rounded Off):", { bold: true });
  setCell(
    sheet,
    wordsRow,
    3,
    amountToWords(summary.gst.totalInvoiceValue),
    { mergeTo: { row: wordsRow, col: TOTAL_COLUMNS } },
  );

  const serviceRow = 19;
  setCell(sheet, serviceRow, 1, "Description of Services", { bold: true });
  setCell(sheet, serviceRow, 2, "Courier Services");
  setCell(sheet, serviceRow, 10, "SAC No", { bold: true });
  setCell(sheet, serviceRow, 11, businessDetails.sacNo);

  const bankRow = 21;
  setCell(sheet, bankRow, 1, "Bank Details", { bold: true });
  setCell(sheet, bankRow + 1, 1, `Bank Name - ${businessDetails.bankName}`);
  setCell(sheet, bankRow + 2, 1, `Account No. ${businessDetails.accountNo}`);
  setCell(sheet, bankRow + 3, 1, `IFSC code - ${businessDetails.ifsc}`);
  setCell(sheet, bankRow + 4, 1, `Branch Name - ${businessDetails.branch}`);

  setCell(sheet, bankRow, 6, "Statutory Guidelines", {
    bold: true,
    mergeTo: { row: bankRow, col: TOTAL_COLUMNS },
  });

  statutoryGuidelines.forEach((guideline, index) => {
    setCell(sheet, bankRow + 1 + index, 6, `${index + 1}. ${guideline}`, {
      mergeTo: { row: bankRow + 1 + index, col: TOTAL_COLUMNS },
    });
  });

  const dueRow = bankRow + statutoryGuidelines.length + 2;
  setCell(
    sheet,
    dueRow,
    1,
    `Payment Due Date: ${formatPaymentDueDate(invoice.invoiceDate, paymentSettings.dueDaysAfterInvoice)}`,
    { bold: true },
  );

  const stripRow = dueRow + 2;
  setCell(sheet, stripRow, 1, "Customer Name :", { bold: true });
  setCell(sheet, stripRow, 2, invoice.buyerName);
  setCell(sheet, stripRow, 4, "Invoice No :", { bold: true });
  setCell(sheet, stripRow, 5, invoice.invoiceNumber);
  setCell(sheet, stripRow, 7, "Invoice Date :", { bold: true });
  setCell(sheet, stripRow, 8, formatInvoiceDate(invoice.invoiceDate));
  setCell(sheet, stripRow, 10, "Invoice Amount :", { bold: true });
  setCell(
    sheet,
    stripRow,
    11,
    formatCurrency(summary.gst.totalInvoiceValue),
  );

  return stripRow + 2;
}

function buildTableHeader(sheet: ExcelJS.Worksheet, row: number): number {
  const headers = [
    "S. No.",
    "Date",
    "C/N No.",
    "Ref. No.",
    "Destination",
    "Pin Code",
    "Type",
    "Mode",
    "Weight",
    "Zone",
    "Amount",
  ];

  headers.forEach((header, index) => {
    const cell = setCell(sheet, row, index + 1, header, {
      bold: true,
      align: { horizontal: "center", vertical: "middle", wrapText: true },
    });
    applyBorder(cell);
  });

  return row + 1;
}

export async function exportInvoiceToExcel(
  invoice: GeneratedInvoice,
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tax Invoice", {
    views: [{ showGridLines: false }],
  });

  let currentRow = buildHeaderSection(sheet, invoice);
  currentRow = buildTableHeader(sheet, currentRow);

  for (const line of invoice.lines) {
    const values: ExcelJS.CellValue[] = [
      line.srNo,
      formatPickupDate(line.pickupDate),
      line.awbNo,
      line.referenceNo,
      line.destination,
      line.pincode,
      line.type,
      line.mode,
      line.weightGrams != null ? Number(formatWeightGrams(line.weightGrams)) : "",
      line.zone,
      line.amount ?? "",
    ];

    values.forEach((value, index) => {
      const cell = setCell(sheet, currentRow, index + 1, value, {
        align: {
          horizontal:
            index === 8 || index === 10
              ? "right"
              : index === 9
                ? "center"
                : "left",
          vertical: "middle",
        },
        numFmt: index === 10 ? "#,##0.00" : undefined,
      });
      applyBorder(cell);

      if (line.issues.length > 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF3CD" },
        };
      }
    });

    currentRow += 1;
  }

  setCell(sheet, currentRow, 9, "Forward Shipments Total", {
    bold: true,
    align: { horizontal: "right" },
    mergeTo: { row: currentRow, col: 10 },
  });
  const totalCell = setCell(
    sheet,
    currentRow,
    11,
    invoice.summary.totalFreight,
    {
      bold: true,
      align: { horizontal: "right" },
      numFmt: "#,##0.00",
    },
  );
  applyBorder(sheet.getCell(currentRow, 9));
  applyBorder(sheet.getCell(currentRow, 10));
  applyBorder(totalCell);

  setCell(
    sheet,
    currentRow + 2,
    1,
    `for ${invoice.supplierName}`,
    { bold: true },
  );
  setCell(sheet, currentRow + 4, 1, "Authorised Signatory");

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export { getInvoiceFilename } from "@/utils/invoiceFilename";
