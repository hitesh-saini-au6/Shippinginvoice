const ones = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];

const tens = [
  "",
  "",
  "TWENTY",
  "THIRTY",
  "FORTY",
  "FIFTY",
  "SIXTY",
  "SEVENTY",
  "EIGHTY",
  "NINETY",
];

function twoDigitsToWords(n: number): string {
  if (n < 20) {
    return ones[n];
  }

  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${tens[ten]}${one ? ` ${ones[one]}` : ""}`.trim();
}

function threeDigitsToWords(n: number): string {
  if (n === 0) {
    return "";
  }

  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];

  if (hundred) {
    parts.push(`${ones[hundred]} HUNDRED`);
  }
  if (remainder) {
    parts.push(twoDigitsToWords(remainder));
  }

  return parts.join(" ");
}

/** Indian numbering: lakh, crore */
export function amountToWords(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) {
    return "ZERO ONLY";
  }

  let n = rounded;
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundredRest = n;

  if (crore) {
    parts.push(`${threeDigitsToWords(crore)} CRORE`);
  }
  if (lakh) {
    parts.push(`${threeDigitsToWords(lakh)} LAKH`);
  }
  if (thousand) {
    parts.push(`${threeDigitsToWords(thousand)} THOUSAND`);
  }
  if (hundredRest) {
    parts.push(threeDigitsToWords(hundredRest));
  }

  return `${parts.join(" ")} ONLY`;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
