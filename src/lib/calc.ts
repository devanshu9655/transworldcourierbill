import type { AWB, BoxRow, GstMode } from "./types";

export function volumetricFromBox(b: BoxRow): number {
  return (Number(b.length || 0) * Number(b.breadth || 0) * Number(b.height || 0)) / 5000;
}

export function totalActual(boxes: BoxRow[]): number {
  return boxes.reduce((s, b) => s + Number(b.actualWt || 0), 0);
}

export function totalVolumetric(boxes: BoxRow[]): number {
  return boxes.reduce((s, b) => s + volumetricFromBox(b), 0);
}

export function chargeableWeight(actual: number, volumetric: number): number {
  const max = Math.max(actual, volumetric);
  // round up to nearest 0.5 kg
  return Math.ceil(max * 2) / 2;
}

export function resolveGstMode(mode: GstMode, consigneeState: string): "cgst_sgst" | "igst" {
  if (mode === "cgst_sgst") return "cgst_sgst";
  if (mode === "igst") return "igst";
  // auto
  return /gujarat/i.test(consigneeState || "") ? "cgst_sgst" : "igst";
}

export interface Charges {
  chargeable: number;
  freight: number;
  fsc: number;
  other: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  total: number;
  gstResolved: "cgst_sgst" | "igst";
}

export function computeCharges(awb: Pick<AWB, "boxes" | "ratePerKg" | "fscPercent" | "otherCharges" | "gstMode" | "consignee">): Charges {
  const actual = totalActual(awb.boxes);
  const vol = totalVolumetric(awb.boxes);
  const chargeable = chargeableWeight(actual, vol);
  const freight = Number(awb.ratePerKg || 0) * chargeable;
  const fsc = (freight * Number(awb.fscPercent || 0)) / 100;
  const other = Number(awb.otherCharges || 0);
  const taxable = freight + fsc + other;
  const gstResolved = resolveGstMode(awb.gstMode, awb.consignee?.state || "");
  let cgst = 0, sgst = 0, igst = 0;
  if (gstResolved === "cgst_sgst") {
    cgst = +(taxable * 0.09).toFixed(2);
    sgst = +(taxable * 0.09).toFixed(2);
  } else {
    igst = +(taxable * 0.18).toFixed(2);
  }
  const gstTotal = cgst + sgst + igst;
  const total = +(taxable + gstTotal).toFixed(2);
  return { chargeable, freight: +freight.toFixed(2), fsc: +fsc.toFixed(2), other, taxable: +taxable.toFixed(2), cgst, sgst, igst, gstTotal: +gstTotal.toFixed(2), total, gstResolved };
}

// Indian numbering amount in words
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10), o = n % 10;
  return tens[t] + (o ? " " + ones[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s = "";
  if (h) s += ones[h] + " Hundred";
  if (r) s += (s ? " " : "") + twoDigits(r);
  return s;
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  let n = rupees;
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const rest = n;

  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (rest) parts.push(threeDigits(rest));
  let result = parts.join(" ") + " Rupees";
  if (paise) result += " And " + twoDigits(paise) + " Paise";
  return result + " Only";
}

export function generateAWBNumber(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `TRANSWORLD${yyyy}${mm}${dd}${rand}`;
}

export function generateForwardingNumber(): string {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}
