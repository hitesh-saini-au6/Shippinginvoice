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
import { clients } from "@/config/invoiceSettings";
import { loadPincodeMaster } from "@/config/pincodeMaster";
import { parseDelhiveryCsv } from "@/services/csv/parser";
import {
  exportInvoiceToExcel,
  getInvoiceFilename,
} from "@/services/excel/invoiceExporter";
import { buildInvoice } from "@/services/invoice/invoiceBuilder";
import { hasLineIssues } from "@/services/invoice/validation";
import { formatCurrency } from "@/utils/currency";
import { formatPickupDate, toInputDateValue } from "@/utils/date";
import { formatWeightGrams } from "@/utils/weight";
import type {
  DelhiveryShipment,
  GeneratedInvoice,
  PincodeMaster,
} from "@/types";

const formSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    billingFrom: z.string().min(1, "Billing from date is required"),
    billingTo: z.string().min(1, "Billing to date is required"),
  })
  .refine(
    (data) => new Date(data.billingFrom) <= new Date(data.billingTo),
    {
      message: "Billing from date must be on or before billing to date",
      path: ["billingTo"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

export function CourierInvoiceDashboard() {
  const [pincodeMaster, setPincodeMaster] = useState<PincodeMaster | null>(null);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [shipments, setShipments] = useState<DelhiveryShipment[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [invoice, setInvoice] = useState<GeneratedInvoice | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: clients[0]?.id ?? "",
      billingFrom: toInputDateValue(new Date()),
      billingTo: toInputDateValue(new Date()),
    },
  });

  const clientId = watch("clientId");

  useEffect(() => {
    loadPincodeMaster()
      .then(setPincodeMaster)
      .catch(() => {
        setMasterError("Failed to load pincode master. Please refresh the page.");
      });
  }, []);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const content = await file.text();
      const result = parseDelhiveryCsv(content);

      setCsvFileName(file.name);
      setShipments(result.shipments);
      setCsvErrors(result.errors);
      setInvoice(null);
      setGenerateError(null);
    },
    [],
  );

  const onGenerate = handleSubmit((values) => {
    if (!pincodeMaster) {
      setGenerateError("Pincode master is still loading. Please wait.");
      return;
    }

    if (csvErrors.length > 0) {
      setGenerateError("Fix CSV errors before generating the invoice.");
      return;
    }

    if (shipments.length === 0) {
      setGenerateError("Upload a Delhivery CSV with shipment data first.");
      return;
    }

    setGenerateError(null);
    const generated = buildInvoice(
      shipments,
      pincodeMaster,
      new Date(values.billingFrom),
      new Date(values.billingTo),
      values.clientId,
    );
    setInvoice(generated);
  });

  const handleDownload = async () => {
    if (!invoice) {
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await exportInvoiceToExcel(invoice);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getInvoiceFilename(invoice);
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const issueCount = useMemo(
    () => invoice?.lines.filter(hasLineIssues).length ?? 0,
    [invoice],
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Courier Invoice Generator
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload Delhivery billing CSV, filter by pickup date, and generate a
          GST invoice for Sivayii.
        </p>
      </div>

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
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Upload Delhivery CSV</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
            />
            {csvFileName && (
              <p className="text-sm text-muted-foreground">
                Loaded: {csvFileName} ({shipments.length} shipments)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={clientId}
              onValueChange={(value) => {
                if (value) {
                  setValue("clientId", value, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-from">Billing From Date</Label>
            <Input id="billing-from" type="date" {...register("billingFrom")} />
            {errors.billingFrom && (
              <p className="text-sm text-destructive">
                {errors.billingFrom.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-to">Billing To Date</Label>
            <Input id="billing-to" type="date" {...register("billingTo")} />
            {errors.billingTo && (
              <p className="text-sm text-destructive">
                {errors.billingTo.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="button" onClick={onGenerate}>
              Generate Invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!invoice || isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? "Preparing..." : "Download Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {csvErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>CSV error</AlertTitle>
          <AlertDescription>{csvErrors.join(" ")}</AlertDescription>
        </Alert>
      )}

      {generateError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to generate</AlertTitle>
          <AlertDescription>{generateError}</AlertDescription>
        </Alert>
      )}

      {invoice && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
            <CardDescription>
              {invoice.summary.totalShipments} shipments · Freight{" "}
              {formatCurrency(invoice.summary.totalFreight)} · GST invoice{" "}
              {formatCurrency(invoice.summary.gst.totalInvoiceValue)}
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
                      <TableCell colSpan={11} className="text-center">
                        No shipments found for the selected billing period.
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
                <span className="text-muted-foreground">Total Invoice Value</span>
                <p className="text-lg font-semibold">
                  {formatCurrency(invoice.summary.gst.totalInvoiceValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
