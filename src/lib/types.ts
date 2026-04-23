export interface Party {
  code: string;
  company: string;
  personName: string;
  address1: string;
  address2: string;
  address3: string;
  postZip: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  kycType: string;
  kycNumber: string;
  kycFile?: string; // base64
  imageFile?: string; // base64
}

export interface BoxRow {
  id: string;
  parcelNo: string;
  boxNo: string;
  actualWt: number;
  length: number;
  breadth: number;
  height: number;
}

export interface InvoiceItem {
  id: string;
  boxNo: string;
  srNo: number;
  description: string;
  hsCode: string;
  unitType: string;
  quantity: number;
  unitWeight: number;
  unitRate: number;
}

export type GstMode = "auto" | "cgst_sgst" | "igst";

export interface AWB {
  id: string;
  awbNumber: string;
  forwardingNumber: string;
  customer: string;
  origin: string;
  destination: string;
  product: string; // INTERNATIONAL / DOMESTIC
  bookingDate: string;
  service: string;
  referenceNumber: string;
  referenceName: string;
  shipmentValue: number;
  currency: string;
  invoiceDate: string;
  invoiceNumber: string;
  content: string;
  remarks: string;

  shipper: Party;
  consignee: Party;

  pcs: number;
  boxes: BoxRow[];

  createInvoice: boolean;
  invoiceType: string;
  invoiceCurrency: string;
  incoterms: string;
  notePreset: string;
  customNote: string;
  items: InvoiceItem[];

  ratePerKg: number;
  fscPercent: number;
  otherCharges: number;
  gstMode: GstMode;

  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  defaultFscPercent: number;
  defaultGstMode: GstMode;
  defaultOrigin: string;
  defaultService: string;
  gstin: string;
  personalEmail?: string;
  personalPhone?: string;
  companyName?: string;
  companyAddress?: string;
  companyWebsite?: string;
  restrictedKeywords?: string[];
}

export interface AddressBookEntry extends Party {
  id: string;
  type: "shipper" | "consignee";
}
