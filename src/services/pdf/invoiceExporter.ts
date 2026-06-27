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
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, boxHeight);

  let currentY = y + 4;
  doc.setFontSize(8);

  for (const [label, value] of rows) {
    const isTotal = label.includes("Total");
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.text(label, x + 2, currentY);
    doc.text(value, x + width - 2, currentY, { align: "right" });
    currentY += rowHeight;
  }

  return boxHeight;
}

export function exportInvoiceToPdf(invoice: GeneratedInvoice): void {
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
  doc.text("Tax Invoice", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
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
  doc.text(businessDetails.addressLine, margin, y, { maxWidth: 120 });
  y += 4;
  doc.text(
    `${businessDetails.city} - ${businessDetails.pincode} ${businessDetails.state}. India.`,
    margin,
    y,
  );
  y += 4;
  doc.text(`GSTIN/UIN:- ${businessDetails.gstin}`, margin, y);
  y += 4;
  doc.text(
    `State Name : ${businessDetails.state}, Code : ${businessDetails.stateCode}`,
    margin,
    y,
  );
  y += 4;
  doc.text(`E-Mail :- ${businessDetails.email}`, margin, y);

  y = Math.max(y + 6, y - 20 + summaryHeight + 6);
  doc.setFont("helvetica", "bold");
  doc.text("Buyer", margin, y);
  y += 4;
  doc.text(client.name, margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(client.addressLine, margin, y);
  y += 4;
  doc.text(
    `${client.city} - ${client.pincode} ${client.state}. India.`,
    margin,
    y,
  );
  y += 4;
  doc.text(`GSTIN/UIN:- ${client.gstin}`, margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Amount in Words:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(amountToWords(summary.gst.totalInvoiceValue), margin + 28, y, {
    maxWidth: pageWidth - margin * 2 - 28,
  });
  y += 6;

  doc.text(
    `Description of Services: Courier Services    SAC No: ${businessDetails.sacNo}`,
    margin,
    y,
  );
  y += 5;
  doc.text(
    `Bank: ${businessDetails.bankName} | A/C: ${businessDetails.accountNo} | IFSC: ${businessDetails.ifsc} | ${businessDetails.branch}`,
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 },
  );
  y += 4;
  doc.text(
    `Payment Due: ${formatPaymentDueDate(invoice.invoiceDate, paymentSettings.dueDaysAfterInvoice)}`,
    margin,
    y,
  );
  y += 6;

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
  y += 4;

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

  autoTable(doc, {
    startY: y,
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
          styles: { halign: "right", fontStyle: "bold" },
        },
        {
          content: formatCurrency(summary.totalFreight),
          styles: { halign: "right", fontStyle: "bold" },
        },
      ],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 1.2,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 0,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 16 },
      8: { halign: "right" },
      9: { halign: "center", cellWidth: 10 },
      10: { halign: "right", cellWidth: 14 },
    },
    didParseCell: (data) => {
      if (data.section !== "body") {
        return;
      }
      const line = invoice.lines[data.row.index];
      if (line?.issues.length) {
        data.cell.styles.fillColor = [255, 243, 205];
      }
    },
    margin: { left: margin, right: margin },
    showHead: "everyPage",
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
