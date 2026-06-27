export interface BusinessDetails {
  name: string;
  addressLine: string;
  city: string;
  pincode: string;
  state: string;
  stateCode: string;
  gstin: string;
  email: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  sacNo: string;
}

export interface ClientDetails {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  pincode: string;
  state: string;
  stateCode: string;
  gstin: string;
}

export const businessDetails: BusinessDetails = {
  name: "Lalima Label",
  addressLine:
    "201, Shri vinayak homes Kailash vihar new Sanganer Road Jaipur",
  city: "Jaipur",
  pincode: "302029",
  state: "Rajasthan",
  stateCode: "08",
  gstin: "08BCNPT9914J1ZQ",
  email: "HITESH.HITESH.SAINI8@GMAIL.COM",
  bankName: "Indusind Bank",
  accountNo: "259549501902",
  ifsc: "INDB0002278",
  branch: "Sanganer Jaipur",
  sacNo: "996719",
};

/** V1: single hardcoded client — extend for multi-client later */
export const clients: ClientDetails[] = [
  {
    id: "sivayii",
    name: "Sivayii textile",
    addressLine: "Sanganer jaipur",
    city: "Jaipur",
    pincode: "302029",
    state: "Rajasthan",
    stateCode: "08",
    gstin: "08KLFPS2205R2ZC",
  },
];

export const gstSettings = {
  sgstRate: 9,
  cgstRate: 9,
  igstRate: 0,
  fuelSurchargePercent: 0,
  fovInsurance: 0,
  otherCharges: 0,
};

export const paymentSettings = {
  dueDaysAfterInvoice: 12,
  latePaymentAnnualRatePercent: 24,
  disputeReportDays: 5,
};

export const statutoryGuidelines = [
  `PAYMENT DUE DATE: Payment is due within ${paymentSettings.dueDaysAfterInvoice} days of invoice date.`,
  "Payment should be made by cheque OR NEFT to the designated account.",
  `Any delay in payment after due date will be charged ${paymentSettings.latePaymentAnnualRatePercent}% per annum on a pro-rata basis.`,
  "While making the payment please hand over the payment advice with full details.",
  `Any mistakes or corrections found in the invoice must be reported in writing within ${paymentSettings.disputeReportDays} days from receipt of the invoice.`,
  "This is a computer-generated invoice and hence does not require signature.",
];
