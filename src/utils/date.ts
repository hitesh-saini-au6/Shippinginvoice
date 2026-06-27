import {
  format,
  isValid,
  parse,
  parseISO,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";

const DATE_FORMATS = [
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd",
  "dd-MM-yyyy HH:mm:ss",
  "dd-MM-yyyy",
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy",
  "d-M-yyyy",
  "d/M/yyyy",
];

export function parseDelhiveryDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoAttempt = parseISO(trimmed);
  if (isValid(isoAttempt)) {
    return isoAttempt;
  }

  for (const pattern of DATE_FORMATS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

export function formatPickupDate(date: Date): string {
  return format(date, "dd-MM-yyyy");
}

export function formatInvoiceDate(date: Date): string {
  return format(date, "dd.MM.yyyy");
}

export function formatInvoicePeriod(from: Date, to: Date): string {
  return `${format(from, "d MMM")} To ${format(to, "d MMM yyyy")}`;
}

export function formatFilenameDate(date: Date): string {
  return format(date, "dMMMyyyy");
}

export function formatPaymentDueDate(invoiceDate: Date, dueDays: number): string {
  const due = new Date(invoiceDate);
  due.setDate(due.getDate() + dueDays);
  return format(due, "dd.MM.yyyy");
}

export function isDateInBillingRange(
  date: Date,
  from: Date,
  to: Date,
): boolean {
  return isWithinInterval(date, {
    start: startOfDay(from),
    end: endOfDay(to),
  });
}

export function toInputDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseInputDate(value: string): Date | null {
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : null;
}
