"use client";

import { useEffect, useState } from "react";
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
  DEFAULT_FREIGHT_RATE_SETTINGS,
  loadFreightRateSettings,
  normalizeFreightRateSettings,
  saveFreightRateSettings,
} from "@/utils/rateSettingsStorage";
import type { FreightRateSettings } from "@/types";

interface FreightRateSettingsCardProps {
  settings: FreightRateSettings;
  onSettingsChange: (settings: FreightRateSettings) => void;
  onInvoiceStale: () => void;
}

export function FreightRateSettingsCard({
  settings,
  onSettingsChange,
  onInvoiceStale,
}: FreightRateSettingsCardProps) {
  const [draft, setDraft] = useState<FreightRateSettings>(settings);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const updateDraft = (field: keyof FreightRateSettings, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value === "" ? Number.NaN : Number.parseFloat(value),
    }));
    setError(null);
    setSavedMessage(null);
  };

  const handleSave = () => {
    const normalized = normalizeFreightRateSettings(draft);

    if (
      !Number.isFinite(draft.rajasthanRatePerKg) ||
      draft.rajasthanRatePerKg <= 0 ||
      !Number.isFinite(draft.defaultRatePerKg) ||
      draft.defaultRatePerKg <= 0
    ) {
      setError("Both rates must be positive numbers.");
      setSavedMessage(null);
      return;
    }

    saveFreightRateSettings(normalized);
    onSettingsChange(normalized);
    onInvoiceStale();
    setDraft(normalized);
    setError(null);
    setSavedMessage(
      "Rates saved in this browser. Click Generate Invoice again to apply to Excel/PDF.",
    );
  };

  const handleReset = () => {
    saveFreightRateSettings(DEFAULT_FREIGHT_RATE_SETTINGS);
    onSettingsChange(DEFAULT_FREIGHT_RATE_SETTINGS);
    onInvoiceStale();
    setDraft(DEFAULT_FREIGHT_RATE_SETTINGS);
    setError(null);
    setSavedMessage("Reset to default rates. Generate invoice again to apply.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Freight Rates</CardTitle>
        <CardDescription>
          Change rates here anytime — no code or backend needed. Saved in your
          browser for next visit. Rajasthan uses pincode master (state RJ).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rajasthan-rate">Rajasthan (₹ per kg)</Label>
            <Input
              id="rajasthan-rate"
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={draft.rajasthanRatePerKg}
              onChange={(event) =>
                updateDraft("rajasthanRatePerKg", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-rate">All other destinations (₹ per kg)</Label>
            <Input
              id="default-rate"
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={draft.defaultRatePerKg}
              onChange={(event) =>
                updateDraft("defaultRatePerKg", event.target.value)
              }
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Billing uses rounded-up kg: ceil(grams ÷ 1000) × rate. Zone letter on
          the invoice does not change the rate — only Rajasthan vs non-Rajasthan.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {savedMessage && (
          <p className="text-sm text-muted-foreground">{savedMessage}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave}>
            Save rates
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function useFreightRateSettings(): [
  FreightRateSettings,
  (settings: FreightRateSettings) => void,
] {
  const [settings, setSettings] = useState(DEFAULT_FREIGHT_RATE_SETTINGS);

  useEffect(() => {
    setSettings(loadFreightRateSettings());
  }, []);

  return [settings, setSettings];
}
