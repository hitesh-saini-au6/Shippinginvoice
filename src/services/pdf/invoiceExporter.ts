import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  businessDetails,
  clients,
  paymentSettings,
  statutoryGuidelines,
} from "@/config/invoiceSettings";
import { amountToWords, formatCurrency } from "@/utils/currency";
import {
  formatInvoiceDate,
  formatInvoicePeriod,
  formatPaymentDueDate,
  formatPickupDate,
} from "@/utils/date";
import { getInvoiceFilename } from "@/utils/invoiceFilename";
import { formatWeightGrams } from "@/utils/weight";
import type { GeneratedInvoice } from "@/types";

export interface PdfExportOptions {
  /** When false (default), PDF is clean for printing — no yellow issue rows. */
  highlightIssueRows?: boolean;
}

const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const ISSUE_YELLOW: [number, number, number] = [255, 243, 205];

function setBlackText(doc: jsPDF): void {
  doc.setTextColor(...BLACK);
}

function getDestinationColumnWidth(
  doc: jsPDF,
  destinations: string[],
): number {
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  let maxWidth = doc.getTextWidth("Destination");
  doc.setFont("helvetica", "normal");

  for (const destination of destinations) {
    if (destination) {
      maxWidth = Math.max(maxWidth, doc.getTextWidth(destination));
    }
  }

  return Math.min(Math.max(maxWidth + 2.5, 16), 42);
}

function buildTableColumnWidths(
  doc: jsPDF,
  invoice: GeneratedInvoice,
): Record<number, number> {
  const destinationWidth = getDestinationColumnWidth(
    doc,
    invoice.lines.map((line) => line.destination),
  );

  return {
    0: 7,
    1: 14,
    2: 28,
    3: 20,
    4: destinationWidth,
    5: 12,
    6: 12,
    7: 7,
    8: 11,
    9: 8,
    10: 15,
  };
}

function drawSummaryBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  invoice: GeneratedInvoice,
): number {
  const { summary } = invoice;
  const rows: Array<[string, string]> = [
    ["Invoice Period", formatInvoicePeriod(invoice.billingFrom, invoice.billingTo)],
    ["Invoice No", invoice.invoiceNumber],
    ["Invoice Date", formatInvoiceDate(invoice.invoiceDate)],
    ["Amount", formatCurrency(summary.totalFreight)],
    ["Taxable Value", formatCurrency(summary.gst.taxableValue)],
    ["SGST @ 9%", formatCurrency(summary.gst.sgstAmount)],
    ["CGST @ 9%", formatCurrency(summary.gst.cgstAmount)],
    ["Total Invoice Value", formatCurrency(summary.gst.totalInvoiceValue)],
  ];

  const rowHeight = 5;
  const boxHeight = rows.length * rowHeight + 4;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.rect(x, y, width, boxHeight);

  let currentY = y + 4;
  doc.setFontSize(8);
  setBlackText(doc);

  for (const [label, value] of rows) {
    const isTotal = label.includes("Total");
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    setBlackText(doc);
    doc.text(label, x + 2, currentY);
    doc.text(value, x + width - 2, currentY, { align: "right" });
    currentY += rowHeight;
  }

  return boxHeight;
}

export function exportInvoiceToPdf(
  invoice: GeneratedInvoice,
  options: PdfExportOptions = {},
): void {
  const highlightIssueRows = options.highlightIssueRows ?? false;
  const client =
    clients.find((item) => item.id === invoice.clientId) ?? clients[0];
  const { summary } = invoice;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setBlackText(doc);
  doc.text("Tax Invoice", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  setBlackText(doc);
  doc.text(businessDetails.name, margin, y);
  const summaryHeight = drawSummaryBox(
    doc,
    pageWidth - margin - 72,
    y - 4,
    72,
    invoice,
  );
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setBlackText(doc);
  doc.text(businessDetails.addressLine, margin, y, { maxWidth: 120 });
  y += 3;
  doc.text(
    `${businessDetails.city} - ${businessDetails.pincode} ${businessDetails.state}. India.`,
    margin,
    y,
  );
  y += 3;
  doc.text(`GSTIN/UIN:- ${businessDetails.gstin}`, margin, y);
  y += 3;
  doc.text(
    `State Name : ${businessDetails.state}, Code : ${businessDetails.stateCode}`,
    margin,
    y,
  );
  y += 3;
  doc.text(`E-Mail :- ${businessDetails.email}`, margin, y);

  y = Math.max(y + 4, y - 14 + summaryHeight + 4);
  doc.setFont("helvetica", "bold");
  doc.text("Buyer", margin, y);
  y += 3;
  doc.text(client.name, margin, y);
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.text(client.addressLine, margin, y);
  y += 3;
  doc.text(
    `${client.city} - ${client.pincode} ${client.state}. India.`,
    margin,
    y,
  );
  y += 3;
  doc.text(`GSTIN/UIN:- ${client.gstin}`, margin, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Amount in Words:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(amountToWords(summary.gst.totalInvoiceValue), margin + 28, y, {
    maxWidth: pageWidth - margin * 2 - 28,
  });
  y += 4;

  doc.text(
    `Description of Services: Courier Services    SAC No: ${businessDetails.sacNo}`,
    margin,
    y,
  );
  y += 3;
  doc.text(
    `Bank: ${businessDetails.bankName} | A/C: ${businessDetails.accountNo} | IFSC: ${businessDetails.ifsc} | ${businessDetails.branch}`,
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 },
  );
  y += 3;
  doc.text(
    `Payment Due: ${formatPaymentDueDate(invoice.invoiceDate, paymentSettings.dueDaysAfterInvoice)}`,
    margin,
    y,
  );
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text(`Customer: ${client.name}`, margin, y);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, margin + 70, y);
  doc.text(`Date: ${formatInvoiceDate(invoice.invoiceDate)}`, margin + 130, y);
  doc.text(
    `Amount: ${formatCurrency(summary.gst.totalInvoiceValue)}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 2;

  const tableBody = invoice.lines.map((line) => [
    String(line.srNo),
    formatPickupDate(line.pickupDate),
    line.awbNo,
    line.referenceNo,
    line.destination,
    line.pincode,
    line.type,
    line.mode,
    line.weightGrams != null ? formatWeightGrams(line.weightGrams) : "",
    line.zone,
    line.amount != null ? formatCurrency(line.amount) : "",
  ]);

  const columnWidths = buildTableColumnWidths(doc, invoice);
  const tableWidth = Object.values(columnWidths).reduce(
    (total, width) => total + width,
    0,
  );

  autoTable(doc, {
    startY: y,
    tableWidth,
    head: [
      [
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
      ],
    ],
    body: tableBody,
    foot: [
      [
        {
          content: "Forward Shipments Total",
          colSpan: 10,
          styles: { halign: "right", fontStyle: "bold", textColor: BLACK },
        },
        {
          content: formatCurrency(summary.totalFreight),
          styles: { halign: "right", fontStyle: "bold", textColor: BLACK },
        },
      ],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 6.5,
      cellPadding: { top: 0.4, right: 0.8, bottom: 0.4, left: 0.8 },
      overflow: "linebreak",
      valign: "middle",
      textColor: BLACK,
      lineColor: BLACK,
      lineWidth: 0.2,
      fillColor: WHITE,
      minCellHeight: 4,
    },
    headStyles: {
      fillColor: WHITE,
      textColor: BLACK,
      fontStyle: "bold",
      halign: "center",
      lineColor: BLACK,
      lineWidth: 0.25,
      cellPadding: { top: 0.6, right: 0.8, bottom: 0.6, left: 0.8 },
    },
    footStyles: {
      fillColor: WHITE,
      textColor: BLACK,
      fontStyle: "bold",
      lineColor: BLACK,
      lineWidth: 0.25,
      cellPadding: { top: 0.6, right: 0.8, bottom: 0.6, left: 0.8 },
    },
    columnStyles: {
      0: { halign: "center", cellWidth: columnWidths[0] },
      1: { halign: "center", cellWidth: columnWidths[1] },
      2: { cellWidth: columnWidths[2] },
      3: { cellWidth: columnWidths[3] },
      4: { halign: "left", cellWidth: columnWidths[4], overflow: "visible" },
      5: { halign: "center", cellWidth: columnWidths[5] },
      6: { halign: "center", cellWidth: columnWidths[6] },
      7: { halign: "center", cellWidth: columnWidths[7] },
      8: { halign: "right", cellWidth: columnWidths[8] },
      9: { halign: "center", cellWidth: columnWidths[9] },
      10: { halign: "right", cellWidth: columnWidths[10] },
    },
    didParseCell: (data) => {
      data.cell.styles.textColor = BLACK;
      data.cell.styles.lineColor = BLACK;

      if (data.section === "head" || data.section === "foot") {
        data.cell.styles.fillColor = WHITE;
        return;
      }

      if (data.section !== "body") {
        return;
      }

      if (!highlightIssueRows) {
        data.cell.styles.fillColor = WHITE;
        return;
      }

      const line = invoice.lines[data.row.index];
      if (line?.issues.length) {
        data.cell.styles.fillColor = ISSUE_YELLOW;
      }
    },
    margin: { left: margin, right: margin, top: 8, bottom: 12 },
    showHead: "everyPage",
    showFoot: "lastPage",
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 20;

  if (finalY < doc.internal.pageSize.getHeight() - 30) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let guidelineY = finalY + 6;
    doc.text("Statutory Guidelines:", margin, guidelineY);
    guidelineY += 3;
    for (const guideline of statutoryGuidelines.slice(0, 3)) {
      doc.text(`• ${guideline}`, margin, guidelineY, {
        maxWidth: pageWidth - margin * 2,
      });
      guidelineY += 4;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`for ${businessDetails.name}`, pageWidth - margin, guidelineY + 4, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.text("Authorised Signatory", pageWidth - margin, guidelineY + 9, {
      align: "right",
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setBlackText(doc);
    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" },
    );
  }

  doc.save(getInvoiceFilename(invoice, "pdf"));
}

export { getInvoiceFilename };
