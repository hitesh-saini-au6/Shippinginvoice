"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  buildManualShipment,
  MANUAL_SHIPMENT_ZONES,
  type ManualShipmentInput,
} from "@/services/invoice/manualShipment";
import { formatPickupDate } from "@/utils/date";
import { formatWeightGrams } from "@/utils/weight";
import type { DelhiveryShipment } from "@/types";

const EMPTY_FORM: ManualShipmentInput = {
  waybillNumber: "",
  pickupDate: "",
  orderId: "",
  pincode: "",
  zone: "",
  weightGrams: "",
};

interface ManualShipmentEntryProps {
  manualShipments: DelhiveryShipment[];
  allShipments: DelhiveryShipment[];
  billingFrom: string;
  billingTo: string;
  onManualShipmentsChange: (shipments: DelhiveryShipment[]) => void;
  onInvoiceStale: () => void;
}

export function ManualShipmentEntry({
  manualShipments,
  allShipments,
  billingFrom,
  billingTo,
  onManualShipmentsChange,
  onInvoiceStale,
}: ManualShipmentEntryProps) {
  const [form, setForm] = useState<ManualShipmentInput>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateField = (field: keyof ManualShipmentInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors([]);
    setSuccessMessage(null);
  };

  const handleAdd = () => {
    const result = buildManualShipment(form);

    if (result.errors.length > 0 || !result.shipment) {
      setFormErrors(result.errors);
      setSuccessMessage(null);
      return;
    }

    const duplicate = allShipments.some(
      (shipment) =>
        shipment.waybillNumber === result.shipment!.waybillNumber &&
        shipment.pickupDate.toDateString() ===
          result.shipment!.pickupDate.toDateString(),
    );

    if (duplicate) {
      setFormErrors([
        "A shipment with this AWB and pickup date already exists in the list.",
      ]);
      setSuccessMessage(null);
      return;
    }

    onManualShipmentsChange([...manualShipments, result.shipment]);
    onInvoiceStale();
    setForm(EMPTY_FORM);
    setFormErrors([]);

    const inBillingPeriod =
      billingFrom &&
      billingTo &&
      result.shipment.pickupDate >= new Date(`${billingFrom}T00:00:00`) &&
      result.shipment.pickupDate <= new Date(`${billingTo}T23:59:59`);

    setSuccessMessage(
      inBillingPeriod
        ? `Added AWB ${result.shipment.waybillNumber}. Click Generate Invoice again to include it in Excel/PDF.`
        : `Added AWB ${result.shipment.waybillNumber}, but its pickup date is outside the current billing range (${billingFrom} to ${billingTo}). Widen billing dates or change the pickup date, then generate again.`,
    );
  };

  const handleRemove = (manualId: string) => {
    onManualShipmentsChange(
      manualShipments.filter((shipment) => shipment.manualId !== manualId),
    );
    onInvoiceStale();
    setSuccessMessage("Manual entry removed. Generate invoice again to refresh exports.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Missing Shipment Manually</CardTitle>
        <CardDescription>
          Use this when one row was missing from the uploaded file. The entry is
          sorted by pickup date with your uploaded shipments in Excel and PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="manual-awb">AWB No</Label>
            <Input
              id="manual-awb"
              placeholder="Waybill number"
              value={form.waybillNumber}
              onChange={(event) =>
                updateField("waybillNumber", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-pickup-date">Pickup Date</Label>
            <Input
              id="manual-pickup-date"
              type="date"
              value={form.pickupDate}
              onChange={(event) =>
                updateField("pickupDate", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-order-id">Reference / Order ID</Label>
            <Input
              id="manual-order-id"
              placeholder="Order reference"
              value={form.orderId}
              onChange={(event) => updateField("orderId", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-pincode">Pincode</Label>
            <Input
              id="manual-pincode"
              placeholder="Destination pincode"
              value={form.pincode}
              onChange={(event) => updateField("pincode", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Zone</Label>
            <Select
              value={form.zone}
              onValueChange={(value) => {
                if (value) {
                  updateField("zone", value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_SHIPMENT_ZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-weight">Weight (grams)</Label>
            <Input
              id="manual-weight"
              inputMode="decimal"
              placeholder="e.g. 500"
              value={form.weightGrams}
              onChange={(event) =>
                updateField("weightGrams", event.target.value)
              }
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Type is <strong>Non Dox</strong> and mode is <strong>SF</strong> for
          all shipments. Destination is looked up from pincode master.
        </p>

        {formErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Cannot add shipment</AlertTitle>
            <AlertDescription>{formErrors.join(" ")}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertTitle>Shipment added</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Button type="button" onClick={handleAdd}>
          Add shipment to list
        </Button>

        {manualShipments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Manually added ({manualShipments.length})
            </p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AWB No</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Reference No</TableHead>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Weight (g)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualShipments.map((shipment) => (
                    <TableRow key={shipment.manualId}>
                      <TableCell>{shipment.waybillNumber}</TableCell>
                      <TableCell>
                        {formatPickupDate(shipment.pickupDate)}
                      </TableCell>
                      <TableCell>{shipment.orderId || "—"}</TableCell>
                      <TableCell>{shipment.pincode}</TableCell>
                      <TableCell>{shipment.zone}</TableCell>
                      <TableCell className="text-right">
                        {formatWeightGrams(shipment.chargedWeightGrams)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(shipment.manualId!)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
