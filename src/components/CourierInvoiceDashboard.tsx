"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ManualShipmentEntry } from "@/components/ManualShipmentEntry";
import { businessDetails, clients } from "@/config/invoiceSettings";
import { loadPincodeMaster } from "@/config/pincodeMaster";
import { parseDelhiveryFile } from "@/services/csv/parser";
import {
  exportInvoiceToExcel,
} from "@/services/excel/invoiceExporter";
import { exportInvoiceToPdf } from "@/services/pdf/invoiceExporter";
import { buildInvoice } from "@/services/invoice/invoiceBuilder";
import { hasLineIssues } from "@/services/invoice/validation";
import { formatCurrency } from "@/utils/currency";
import { formatPickupDate } from "@/utils/date";
import { getInvoiceFilename } from "@/utils/invoiceFilename";
import { applyPickupDateRangeToForm } from "@/utils/shipmentDates";
import { formatWeightGrams } from "@/utils/weight";
import type {
  BuyerDetails,
  DelhiveryShipment,
  GeneratedInvoice,
  PincodeMaster,
} from "@/types";

const formSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    billingFrom: z.string().min(1, "Billing from date is required"),
    billingTo: z.string().min(1, "Billing to date is required"),
    invoiceNumber: z.string().optional(),
    supplierName: z.string().min(1, "Supplier name is required"),
    supplierGstin: z.string().min(1, "Supplier GST is required"),
    buyerName: z.string().min(1, "Buyer name is required"),
    buyerGstin: z.string().min(1, "Buyer GST is required"),
    buyerAddressLine: z.string().min(1, "Buyer address is required"),
    buyerCity: z.string().min(1, "Buyer city is required"),
    buyerPincode: z.string().min(1, "Buyer pincode is required"),
    buyerState: z.string().min(1, "Buyer state is required"),
    buyerStateCode: z.string().min(1, "Buyer state code is required"),
  })
  .refine((data) => new Date(data.billingFrom) <= new Date(data.billingTo), {
    message: "Billing from date must be on or before billing to date",
    path: ["billingTo"],
  });

type FormValues = z.infer<typeof formSchema>;

function getClientDefaults(clientId: string): BuyerDetails {
  const client = clients.find((item) => item.id === clientId) ?? clients[0];
  return {
    name: client?.name ?? "",
    gstin: client?.gstin ?? "",
    addressLine: client?.addressLine ?? "",
    city: client?.city ?? "",
    pincode: client?.pincode ?? "",
    state: client?.state ?? "",
    stateCode: client?.stateCode ?? "",
  };
}

function applyBuyerDefaults(
  defaults: BuyerDetails,
  setValue: (
    field: keyof Pick<
      FormValues,
      | "buyerName"
      | "buyerGstin"
      | "buyerAddressLine"
      | "buyerCity"
      | "buyerPincode"
      | "buyerState"
      | "buyerStateCode"
    >,
    value: string,
    options?: { shouldValidate?: boolean },
  ) => void,
): void {
  setValue("buyerName", defaults.name, { shouldValidate: true });
  setValue("buyerGstin", defaults.gstin, { shouldValidate: true });
  setValue("buyerAddressLine", defaults.addressLine, { shouldValidate: true });
  setValue("buyerCity", defaults.city, { shouldValidate: true });
  setValue("buyerPincode", defaults.pincode, { shouldValidate: true });
  setValue("buyerState", defaults.state, { shouldValidate: true });
  setValue("buyerStateCode", defaults.stateCode, { shouldValidate: true });
}

export function CourierInvoiceDashboard() {
  const [pincodeMaster, setPincodeMaster] = useState<PincodeMaster | null>(null);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [shipments, setShipments] = useState<DelhiveryShipment[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<GeneratedInvoice | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateInfo, setGenerateInfo] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [highlightPdfIssues, setHighlightPdfIssues] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      const buyerDefaults = getClientDefaults(clients[0]?.id ?? "");
      return {
        clientId: clients[0]?.id ?? "",
        billingFrom: "",
        billingTo: "",
        invoiceNumber: "",
        supplierName: businessDetails.name,
        supplierGstin: businessDetails.gstin,
        buyerName: buyerDefaults.name,
        buyerGstin: buyerDefaults.gstin,
        buyerAddressLine: buyerDefaults.addressLine,
        buyerCity: buyerDefaults.city,
        buyerPincode: buyerDefaults.pincode,
        buyerState: buyerDefaults.state,
        buyerStateCode: buyerDefaults.stateCode,
      };
    })(),
  });

  const clientId = watch("clientId");
  const billingFrom = watch("billingFrom");
  const billingTo = watch("billingTo");

  useEffect(() => {
    applyBuyerDefaults(getClientDefaults(clientId), setValue);
  }, [clientId, setValue]);

  useEffect(() => {
    loadPincodeMaster()
      .then((master) => {
        setPincodeMaster(master);
        setMasterLoading(false);
      })
      .catch(() => {
        setMasterError(
          "Failed to load pincode master. Please refresh the page.",
        );
        setMasterLoading(false);
      });
  }, []);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setIsUploading(true);
      setCsvErrors([]);
      setUploadMessage(null);
      setGenerateError(null);
      setGenerateInfo(null);
      setDownloadError(null);
      setInvoice(null);

      try {
        const result = await parseDelhiveryFile(file);

        setCsvFileName(file.name);
        setShipments(result.shipments);
        setCsvErrors(result.errors);

        if (result.errors.length > 0) {
          setUploadMessage(null);
          return;
        }

        const dateRange = applyPickupDateRangeToForm(
          result.shipments,
          (field, value) => setValue(field, value, { shouldValidate: true }),
        );

        setValue("invoiceNumber", "", { shouldValidate: true });
        setValue("supplierName", businessDetails.name, { shouldValidate: true });
        setValue("supplierGstin", businessDetails.gstin, { shouldValidate: true });
        applyBuyerDefaults(getClientDefaults(clientId), setValue);

        setUploadMessage(
          `Loaded ${result.shipments.length} shipments from ${file.name}.${dateRange ? ` Billing dates set to ${dateRange.from} → ${dateRange.to} (pickup date range).` : ""} Now click Generate Invoice.`,
        );
      } catch {
        setCsvErrors([
          "Failed to read the uploaded file. Use Delhivery billing CSV or .xlsx.",
        ]);
        setShipments([]);
        setCsvFileName(null);
      } finally {
        setIsUploading(false);
        event.target.value = "";
      }
    },
    [setValue, clientId],
  );

  const onGenerate = handleSubmit((values) => {
    setGenerateError(null);
    setGenerateInfo(null);
    setDownloadError(null);

    if (masterLoading) {
      setGenerateError("Pincode master is still loading. Please wait a moment.");
      return;
    }

    if (!pincodeMaster) {
      setGenerateError("Pincode master failed to load. Please refresh the page.");
      return;
    }

    if (csvErrors.length > 0) {
      setGenerateError("Fix file errors before generating the invoice.");
      return;
    }

    if (shipments.length === 0) {
      setGenerateError(
        "Upload a Delhivery billing file first (CSV or Excel .xlsx).",
      );
      return;
    }

    const generated = buildInvoice(
      shipments,
      pincodeMaster,
      new Date(`${values.billingFrom}T00:00:00`),
      new Date(`${values.billingTo}T23:59:59`),
      values.clientId,
      {
        invoiceNumber: values.invoiceNumber,
        supplierName: values.supplierName,
        supplierGstin: values.supplierGstin,
        buyerName: values.buyerName,
        buyerGstin: values.buyerGstin,
        buyerAddressLine: values.buyerAddressLine,
        buyerCity: values.buyerCity,
        buyerPincode: values.buyerPincode,
        buyerState: values.buyerState,
        buyerStateCode: values.buyerStateCode,
      },
    );

    setInvoice(generated);

    if (generated.lines.length === 0) {
      setGenerateInfo(
        `No shipments have pickup dates between ${values.billingFrom} and ${values.billingTo}. Adjust the billing dates — your file has ${shipments.length} total shipments.`,
      );
      return;
    }

    setGenerateInfo(
      `Invoice ready: ${generated.summary.totalShipments} shipments, freight ${formatCurrency(generated.summary.totalFreight)}, total with GST ${formatCurrency(generated.summary.gst.totalInvoiceValue)}. Download Excel or PDF.`,
    );
  });

  const handleDownloadExcel = async () => {
    if (!invoice || invoice.lines.length === 0) {
      setDownloadError("Generate an invoice with at least one shipment first.");
      return;
    }

    setIsDownloadingExcel(true);
    setDownloadError(null);

    try {
      const blob = await exportInvoiceToExcel(invoice);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getInvoiceFilename(invoice, "xlsx");
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setGenerateInfo(`Downloaded ${getInvoiceFilename(invoice, "xlsx")}`);
    } catch {
      setDownloadError(
        "Excel download failed. Try again or use a desktop browser (Chrome/Edge).",
      );
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!invoice || invoice.lines.length === 0) {
      setDownloadError("Generate an invoice with at least one shipment first.");
      return;
    }

    setIsDownloadingPdf(true);
    setDownloadError(null);

    try {
      exportInvoiceToPdf(invoice, {
        highlightIssueRows: highlightPdfIssues,
      });
      setGenerateInfo(`Downloaded ${getInvoiceFilename(invoice, "pdf")}`);
    } catch {
      setDownloadError(
        "PDF download failed. Try again or use a desktop browser (Chrome/Edge).",
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const issueCount = useMemo(
    () => invoice?.lines.filter(hasLineIssues).length ?? 0,
    [invoice],
  );

  const canGenerate =
    !masterLoading &&
    !isUploading &&
    shipments.length > 0 &&
    csvErrors.length === 0 &&
    billingFrom &&
    billingTo;

  const showInvoiceDetails = shipments.length > 0 && csvErrors.length === 0;
  const manualShipmentCount = useMemo(
    () => shipments.filter((shipment) => shipment.manualId).length,
    [shipments],
  );
  const uploadedShipmentCount = shipments.length - manualShipmentCount;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Courier Invoice Generator
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload Delhivery billing CSV or Excel, filter by pickup date, generate
          GST invoice for Sivayii.
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How to use</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-6">
          <p>
            <strong className="text-foreground">1.</strong> Upload Delhivery
            billing file (.csv or .xlsx)
          </p>
          <p>
            <strong className="text-foreground">2.</strong> Add any missing row
            manually (optional)
          </p>
          <p>
            <strong className="text-foreground">3.</strong> Check billing dates
            (auto-filled from pickup dates)
          </p>
          <p>
            <strong className="text-foreground">4.</strong> Click{" "}
            <strong className="text-foreground">Generate Invoice</strong>
          </p>
          <p>
            <strong className="text-foreground">5.</strong> Download{" "}
            <strong className="text-foreground">Excel</strong> or{" "}
            <strong className="text-foreground">PDF</strong>
          </p>
          <p>
            <strong className="text-foreground">6.</strong> Print PDF directly
            for bills
          </p>
        </CardContent>
      </Card>

      {masterError && (
        <Alert variant="destructive">
          <AlertTitle>Pincode master error</AlertTitle>
          <AlertDescription>{masterError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoice Inputs</CardTitle>
          <CardDescription>
            All processing happens locally in your browser.
            {masterLoading && " Loading pincode master..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Upload Delhivery CSV or Excel</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Accepts .csv and .xlsx from Delhivery billing (not your manual
              invoice PDF).
            </p>
            {isUploading && (
              <p className="text-sm text-muted-foreground">Reading file...</p>
            )}
            {csvFileName && !isUploading && (
              <p className="text-sm font-medium text-foreground">
                File: {csvFileName} · {uploadedShipmentCount} from file
                {manualShipmentCount > 0
                  ? ` · ${manualShipmentCount} added manually`
                  : ""}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Client preset</Label>
            <Select
              value={clientId}
              onValueChange={(value) => {
                if (value) {
                  setValue("clientId", value, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select client preset" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pre-fills buyer name, GST, and address. You can edit all fields
              below after upload.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-from">Billing From Date (Pickup Date)</Label>
            <Input id="billing-from" type="date" {...register("billingFrom")} />
            {errors.billingFrom && (
              <p className="text-sm text-destructive">
                {errors.billingFrom.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-to">Billing To Date (Pickup Date)</Label>
            <Input id="billing-to" type="date" {...register("billingTo")} />
            {errors.billingTo && (
              <p className="text-sm text-destructive">
                {errors.billingTo.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={highlightPdfIssues}
                onChange={(event) => setHighlightPdfIssues(event.target.checked)}
                className="size-4 rounded border"
              />
              <span>
                Highlight issue rows in PDF (yellow) — leave unchecked for
                clean black print
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onGenerate} disabled={!canGenerate}>
              Generate Invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                !invoice || invoice.lines.length === 0 || isDownloadingExcel
              }
              onClick={handleDownloadExcel}
            >
              {isDownloadingExcel ? "Preparing..." : "Download Excel"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                !invoice || invoice.lines.length === 0 || isDownloadingPdf
              }
              onClick={handleDownloadPdf}
            >
              {isDownloadingPdf ? "Preparing..." : "Download PDF"}
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showInvoiceDetails && (
        <ManualShipmentEntry
          shipments={shipments}
          billingFrom={billingFrom}
          billingTo={billingTo}
          onShipmentsChange={setShipments}
          onInvoiceStale={() => {
            setInvoice(null);
            setGenerateInfo(null);
            setGenerateError(null);
            setDownloadError(null);
          }}
        />
      )}

      {showInvoiceDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice & Party Details</CardTitle>
            <CardDescription>
              Set invoice number, supplier (your business), and buyer (client)
              details for Excel and PDF export.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium">Supplier (You)</p>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="invoice-number">Invoice No</Label>
                  <Input
                    id="invoice-number"
                    placeholder="e.g. 998"
                    {...register("invoiceNumber")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to auto-generate
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Supplier Name</Label>
                  <Input
                    id="supplier-name"
                    placeholder="Your business name"
                    {...register("supplierName")}
                  />
                  {errors.supplierName && (
                    <p className="text-sm text-destructive">
                      {errors.supplierName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-gstin">Supplier GSTIN</Label>
                  <Input
                    id="supplier-gstin"
                    placeholder="e.g. 08BCNPT9914J1ZQ"
                    {...register("supplierGstin")}
                  />
                  {errors.supplierGstin && (
                    <p className="text-sm text-destructive">
                      {errors.supplierGstin.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">Buyer (Client)</p>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="buyer-name">Buyer Name</Label>
                  <Input
                    id="buyer-name"
                    placeholder="Client / buyer name"
                    {...register("buyerName")}
                  />
                  {errors.buyerName && (
                    <p className="text-sm text-destructive">
                      {errors.buyerName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-gstin">Buyer GSTIN</Label>
                  <Input
                    id="buyer-gstin"
                    placeholder="e.g. 08KLFPS2205R2ZC"
                    {...register("buyerGstin")}
                  />
                  {errors.buyerGstin && (
                    <p className="text-sm text-destructive">
                      {errors.buyerGstin.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="buyer-address">Buyer Address</Label>
                  <Input
                    id="buyer-address"
                    placeholder="Street / area address"
                    {...register("buyerAddressLine")}
                  />
                  {errors.buyerAddressLine && (
                    <p className="text-sm text-destructive">
                      {errors.buyerAddressLine.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-city">City</Label>
                  <Input
                    id="buyer-city"
                    placeholder="e.g. Jaipur"
                    {...register("buyerCity")}
                  />
                  {errors.buyerCity && (
                    <p className="text-sm text-destructive">
                      {errors.buyerCity.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-pincode">Pincode</Label>
                  <Input
                    id="buyer-pincode"
                    placeholder="e.g. 302029"
                    {...register("buyerPincode")}
                  />
                  {errors.buyerPincode && (
                    <p className="text-sm text-destructive">
                      {errors.buyerPincode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-state">State</Label>
                  <Input
                    id="buyer-state"
                    placeholder="e.g. Rajasthan"
                    {...register("buyerState")}
                  />
                  {errors.buyerState && (
                    <p className="text-sm text-destructive">
                      {errors.buyerState.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-state-code">State Code</Label>
                  <Input
                    id="buyer-state-code"
                    placeholder="e.g. 08"
                    {...register("buyerStateCode")}
                  />
                  {errors.buyerStateCode && (
                    <p className="text-sm text-destructive">
                      {errors.buyerStateCode.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadMessage && (
        <Alert>
          <AlertTitle>File loaded</AlertTitle>
          <AlertDescription>{uploadMessage}</AlertDescription>
        </Alert>
      )}

      {csvErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>File error</AlertTitle>
          <AlertDescription>{csvErrors.join(" ")}</AlertDescription>
        </Alert>
      )}

      {generateError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to generate</AlertTitle>
          <AlertDescription>{generateError}</AlertDescription>
        </Alert>
      )}

      {generateInfo && (
        <Alert>
          <AlertTitle>Status</AlertTitle>
          <AlertDescription>{generateInfo}</AlertDescription>
        </Alert>
      )}

      {downloadError && (
        <Alert variant="destructive">
          <AlertTitle>Download error</AlertTitle>
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      {invoice && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
            <CardDescription>
              {invoice.summary.totalShipments} shipments in selected period
              {invoice.summary.totalShipments > 0 && (
                <>
                  {" "}
                  · Freight {formatCurrency(invoice.summary.totalFreight)} ·
                  GST invoice{" "}
                  {formatCurrency(invoice.summary.gst.totalInvoiceValue)}
                </>
              )}
              {issueCount > 0 && (
                <Badge variant="outline" className="ml-2">
                  {issueCount} rows with issues
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sr No</TableHead>
                    <TableHead>AWB No</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Reference No</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Weight (g)</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="py-8 text-center">
                        No shipments in this billing period. Widen the date
                        range — your uploaded file has {shipments.length}{" "}
                        shipments total.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoice.lines.map((line) => (
                      <TableRow
                        key={`${line.awbNo}-${line.srNo}`}
                        className={
                          hasLineIssues(line) ? "bg-amber-50" : undefined
                        }
                      >
                        <TableCell>{line.srNo}</TableCell>
                        <TableCell>{line.awbNo}</TableCell>
                        <TableCell>
                          {formatPickupDate(line.pickupDate)}
                        </TableCell>
                        <TableCell>{line.referenceNo || "—"}</TableCell>
                        <TableCell>{line.destination || "—"}</TableCell>
                        <TableCell>{line.pincode || "—"}</TableCell>
                        <TableCell>{line.type}</TableCell>
                        <TableCell>{line.mode}</TableCell>
                        <TableCell className="text-right">
                          {formatWeightGrams(line.weightGrams) || "—"}
                        </TableCell>
                        <TableCell>{line.zone || "—"}</TableCell>
                        <TableCell className="text-right">
                          {line.amount != null
                            ? formatCurrency(line.amount)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {invoice.lines.length > 0 && (
              <div className="flex flex-wrap gap-6 rounded-md border bg-muted/40 p-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Shipments</span>
                  <p className="text-lg font-semibold">
                    {invoice.summary.totalShipments}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Freight</span>
                  <p className="text-lg font-semibold">
                    {formatCurrency(invoice.summary.totalFreight)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">SGST @ 9%</span>
                  <p className="text-lg font-semibold">
                    {formatCurrency(invoice.summary.gst.sgstAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">CGST @ 9%</span>
                  <p className="text-lg font-semibold">
                    {formatCurrency(invoice.summary.gst.cgstAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Total Invoice Value
                  </span>
                  <p className="text-lg font-semibold">
                    {formatCurrency(invoice.summary.gst.totalInvoiceValue)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
