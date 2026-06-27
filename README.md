# Courier Invoice Generator

Internal web app to generate GST courier invoices from Delhivery billing CSV files.

## Features

- Upload Delhivery billing CSV (header-based column detection)
- Filter shipments by **Pickup Date** only
- Destination lookup from bundled Pincode Master
- Freight calculation using configurable rate card (Rajasthan override at ₹40/kg)
- Raw gram weight display with rounded-up kg used for billing
- GST invoice layout (9% SGST + 9% CGST) matching your manual PDF template
- Excel export — `Invoice_<FromDate>_to_<ToDate>.xlsx`
- Row highlighting for missing weight, zone, pincode, order ID, or unknown pincode

## Tech Stack

- Next.js 15 (App Router)
- TypeScript, Tailwind CSS, shadcn/ui
- ExcelJS, PapaParse, date-fns, React Hook Form, Zod

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

| File | Purpose |
|------|---------|
| `src/config/invoiceSettings.ts` | Business, client, bank, GST, payment terms |
| `src/config/rateCard.ts` | Zone rates and Rajasthan rule |
| `public/data/pincode-master.json` | Pincode → district + state (replace without code changes) |

## Project Structure

```
src/
  app/           # Next.js pages
  components/    # UI components
  config/        # Business config, rate card, pincode loader
  services/
    csv/         # CSV parsing
    invoice/     # Filter, lookup, rates, builder
    excel/       # Excel export
  utils/         # Date, weight, currency helpers
  types/         # Shared TypeScript types
```

## V1 Scope

- Single client: **Sivayii textile**
- Single courier: Delhivery
- No database, auth, or backend API — everything runs locally in the browser
