import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, Printer, Building2, MapPin, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { AWB, BoxRow, InvoiceItem, Party, GstMode } from "@/lib/types";
import { computeCharges, generateAWBNumber, generateForwardingNumber, totalActual, totalVolumetric, volumetricFromBox, amountInWords } from "@/lib/calc";
import { getSettings, saveAWB, saveAddressEntry, getAddressBook, getAWBs, saveDraft, getDraft } from "@/lib/storage";
import { generateProformaInvoice, generateAddressLabel, generateCourierSlip, downloadPDF } from "@/lib/pdf";
import { CountrySelect } from "@/components/CountrySelect";
import { ProductSuggest } from "@/components/ProductSuggest";

const SERVICES = ["DHL_AMD", "FEDEX", "UPS", "ARAMEX", "DTDC", "BLUE_DART", "INDIA_POST"];
const PRODUCTS = ["INTERNATIONAL", "DOMESTIC"];
const KYC_TYPES = ["AADHAR", "PAN", "PASSPORT", "GST", "DL"];
const UNIT_TYPES = ["Pc", "Pkt", "Set", "Kg", "Box"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];
const INCOTERMS = ["FOB", "CIF", "CFR", "EXW", "DDP", "DDU"];

function emptyParty(): Party {
  return { code: "", company: "", personName: "", address1: "", address2: "", address3: "", postZip: "", city: "", state: "", country: "", phone: "", email: "", kycType: "AADHAR", kycNumber: "" };
}

function emptyBox(): BoxRow {
  return { id: crypto.randomUUID(), parcelNo: "1", boxNo: "1", actualWt: 0, length: 0, breadth: 0, height: 0 };
}

function emptyItem(boxNo: string, sr: number): InvoiceItem {
  return { id: crypto.randomUUID(), boxNo, srNo: sr, description: "", hsCode: "", unitType: "Pc", quantity: 1, unitWeight: 0, unitRate: 0 };
}

export function buildEmptyAWB(): AWB {
  const settings = getSettings();
  return {
    id: crypto.randomUUID(),
    awbNumber: generateAWBNumber(),
    forwardingNumber: generateForwardingNumber(),
    customer: "",
    origin: settings.defaultOrigin,
    destination: "",
    product: "INTERNATIONAL",
    bookingDate: new Date().toISOString().slice(0, 10),
    service: settings.defaultService,
    referenceNumber: "",
    referenceName: "",
    shipmentValue: 0,
    currency: "INR",
    invoiceDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: "",
    content: "",
    remarks: "",
    shipper: emptyParty(),
    consignee: emptyParty(),
    pcs: 1,
    boxes: [emptyBox()],
    createInvoice: true,
    invoiceType: "PROFORMA",
    invoiceCurrency: "INR",
    incoterms: "FOB",
    notePreset: "Goods of Indian Origin",
    customNote: "",
    items: [],
    ratePerKg: 0,
    fscPercent: settings.defaultFscPercent,
    otherCharges: 0,
    gstMode: settings.defaultGstMode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className={`text-xs font-medium uppercase ${required ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>{label}</Label>
      {children}
    </div>
  );
}

function formatInputText(k: string, v: string) {
  if (typeof v !== 'string') return v;
  const upperFields = ["city", "state", "country", "origin", "destination"];
  const properFields = ["personName", "company", "customer", "referenceName"];
  if (upperFields.includes(k)) return v.toUpperCase();
  if (properFields.includes(k)) {
    return v.replace(/\b\w/g, c => c.toUpperCase());
  }
  return v;
}

function PartyForm({ value, onChange, title }: { value: Party; onChange: (p: Party) => void; title: string }) {
  const addrBook = getAddressBook();
  const [search, setSearch] = React.useState("");
  const filtered = search ? addrBook.filter((a) => (a.code + a.company + a.personName).toLowerCase().includes(search.toLowerCase())) : [];

  function pick(id: string) {
    const a = addrBook.find((x) => x.id === id);
    if (a) {
      const { id: _i, type: _t, ...rest } = a;
      onChange(rest);
      setSearch("");
    }
  }

  function update<K extends keyof Party>(k: K, v: Party[K]) {
    const formattedV = typeof v === 'string' ? formatInputText(k as string, v) : v;
    onChange({ ...value, [k]: formattedV });
  }

  function uploadFile(field: "kycFile" | "imageFile", file: File) {
    if (file.size > 500 * 1024) {
      toast.error("File too large (max 500KB)");
      return;
    }
    const r = new FileReader();
    r.onload = () => onChange({ ...value, [field]: r.result as string });
    r.readAsDataURL(file);
  }

  function saveToBook() {
    if (!value.code || !value.company) {
      toast.error("Code and Company required");
      return;
    }
    saveAddressEntry({ ...value, id: crypto.randomUUID(), type: title.toLowerCase().includes("shipper") ? "shipper" : "consignee" });
    toast.success("Saved to address book");
  }

  return (
    <Card>
      <CardHeader className="bg-secondary py-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-secondary-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs">Search Address Book</Label>
            <div className="relative">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code, company, name…" />
              {filtered.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow">
                  {filtered.slice(0, 8).map((a) => (
                    <button key={a.id} type="button" onClick={() => pick(a.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-accent">
                      <span className="font-medium">{a.code}</span> — {a.company} ({a.personName})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Field label="Code">
            <Input value={value.code} onChange={(e) => update("code", e.target.value)} />
          </Field>
        </div>

        <FieldRow>
          <Field label="Company" required={!title.toLowerCase().includes("shipper")}><Input value={value.company} onChange={(e) => update("company", e.target.value)} /></Field>
          <Field label="Person Name" required><Input value={value.personName} onChange={(e) => update("personName", e.target.value)} /></Field>
          <Field label="Phone Number" required><Input value={value.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
          <Field label="Email Address"><Input type="email" value={value.email} onChange={(e) => update("email", e.target.value)} /></Field>
        </FieldRow>

        <FieldRow>
          <Field label="Address 1" required><Input value={value.address1} onChange={(e) => update("address1", e.target.value)} /></Field>
          <Field label="Address 2" required><Input value={value.address2} onChange={(e) => update("address2", e.target.value)} /></Field>
          <Field label="Address 3"><Input value={value.address3} onChange={(e) => update("address3", e.target.value)} /></Field>
          <Field label="Post / Zip Code" required><Input value={value.postZip} onChange={(e) => update("postZip", e.target.value)} /></Field>
        </FieldRow>

        <FieldRow>
          <Field label="City" required><Input list="cities-list" value={value.city} onChange={(e) => update("city", e.target.value)} /></Field>
          <Field label="State / County" required><Input value={value.state} onChange={(e) => update("state", e.target.value)} /></Field>
          <Field label="Country" required>
            <CountrySelect value={value.country} onChange={(v) => update("country", v)} />
          </Field>
          <Field label="KYC Type">
            <Select value={value.kycType} onValueChange={(v) => update("kycType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KYC_TYPES.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="KYC Number"><Input value={value.kycNumber} onChange={(e) => update("kycNumber", e.target.value)} /></Field>
          <Field label="Upload KYC">
            <Input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && uploadFile("kycFile", e.target.files[0])} />
          </Field>
          <Field label="Upload Image">
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadFile("imageFile", e.target.files[0])} />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="outline" size="sm" onClick={saveToBook}>Save to Address Book</Button>
          </div>
        </FieldRow>
      </CardContent>
    </Card>
  );
}

export function AWBForm({ initial }: { initial?: AWB }) {
  const navigate = useNavigate();
  const [awb, setAwb] = React.useState<AWB>(initial ?? buildEmptyAWB());

  function update<K extends keyof AWB>(k: K, v: AWB[K]) {
    const formattedV = typeof v === 'string' ? formatInputText(k as string, v) : v;
    setAwb((a) => ({ ...a, [k]: formattedV }));
  }

  function updateBox(idx: number, patch: Partial<BoxRow>) {
    setAwb((a) => ({ ...a, boxes: a.boxes.map((b, i) => (i === idx ? { ...b, ...patch } : b)) }));
  }

  function addBox() {
    setAwb((a) => ({ ...a, boxes: [...a.boxes, { ...emptyBox(), boxNo: String(a.boxes.length + 1), parcelNo: String(a.boxes.length + 1) }], pcs: a.boxes.length + 1 }));
  }

  function removeBox(idx: number) {
    setAwb((a) => ({ ...a, boxes: a.boxes.filter((_, i) => i !== idx), pcs: Math.max(1, a.boxes.length - 1) }));
  }

  function addItem() {
    const sr = awb.items.length + 1;
    const boxNo = awb.boxes[0]?.boxNo || "1";
    setAwb((a) => ({ ...a, items: [...a.items, emptyItem(boxNo, sr)] }));
  }

  function updateItem(idx: number, patch: Partial<InvoiceItem>) {
    setAwb((a) => ({ ...a, items: a.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  }

  function removeItem(idx: number) {
    setAwb((a) => ({ ...a, items: a.items.filter((_, i) => i !== idx) }));
  }

  const charges = computeCharges(awb);
  const actual = totalActual(awb.boxes);
  const vol = totalVolumetric(awb.boxes);

  const pastAWBs = React.useMemo(() => getAWBs(), []);
  const uniqueCities = React.useMemo(() => Array.from(new Set(pastAWBs.flatMap(a => [a.shipper.city, a.consignee.city]).filter(Boolean))), [pastAWBs]);
  const uniqueDestinations = React.useMemo(() => Array.from(new Set(pastAWBs.flatMap(a => [a.destination]).filter(Boolean))), [pastAWBs]);
  const uniqueCustomers = React.useMemo(() => Array.from(new Set(pastAWBs.flatMap(a => [a.customer]).filter(Boolean))), [pastAWBs]);

  function validate(): string[] {
    const errs: string[] = [];
    if (!awb.awbNumber?.trim()) errs.push("- AWB Number is required");
    if (!awb.destination?.trim()) errs.push("- Destination is required");
    if (!awb.product?.trim()) errs.push("- Product is required");
    if (!awb.service?.trim()) errs.push("- Service is required");

    // Shipper — check each required field individually
    const s = awb.shipper;
    const shipperMissing: string[] = [];
    if (!s.personName?.trim()) shipperMissing.push("Person Name");
    if (!s.phone?.trim()) shipperMissing.push("Phone Number");
    if (!s.address1?.trim()) shipperMissing.push("Address 1");
    if (!s.postZip?.trim()) shipperMissing.push("Zip / Post Code");
    if (!s.city?.trim()) shipperMissing.push("City");
    if (!s.state?.trim()) shipperMissing.push("State");
    if (!s.country?.trim()) shipperMissing.push("Country");
    if (shipperMissing.length > 0)
      errs.push(`- Shipper missing: ${shipperMissing.join(", ")}`);

    // Consignee — check each required field individually
    const c = awb.consignee;
    const consigneeMissing: string[] = [];
    if (!c.company?.trim()) consigneeMissing.push("Company");
    if (!c.personName?.trim()) consigneeMissing.push("Person Name");
    if (!c.phone?.trim()) consigneeMissing.push("Phone Number");
    if (!c.address1?.trim()) consigneeMissing.push("Address 1");
    if (!c.postZip?.trim()) consigneeMissing.push("Zip / Post Code");
    if (!c.city?.trim()) consigneeMissing.push("City");
    if (!c.state?.trim()) consigneeMissing.push("State");
    if (!c.country?.trim()) consigneeMissing.push("Country");
    if (consigneeMissing.length > 0)
      errs.push(`- Consignee missing: ${consigneeMissing.join(", ")}`);

    awb.boxes.forEach((b) => {
      if (b.actualWt <= 0 || b.length <= 0 || b.breadth <= 0 || b.height <= 0) {
        errs.push(`- Box ${b.boxNo}: Actual Wt, L, W, and H must be > 0`);
      }
    });
    return errs;
  }

  function save(): AWB {
    const final = { ...awb, updatedAt: new Date().toISOString() };
    saveAWB(final);
    return final;
  }

  function onCreate() {
    const errs = validate();
    if (errs.length > 0) return toast.error("Missing Required Fields", { description: errs.join("\n") });
    save();
    toast.success("AWB created");
    navigate({ to: "/" });
  }

  function onCreateAndPrint() {
    const errs = validate();
    if (errs.length > 0) return toast.error("Missing Required Fields", { description: errs.join("\n") });
    const saved = save();
    const lbl = generateAddressLabel(saved);
    downloadPDF(lbl, `LABEL_${saved.awbNumber}.pdf`);
    toast.success("AWB created · Label downloaded");
  }

  const [previewPdfUrl, setPreviewPdfUrl] = React.useState<string | null>(null);
  const [previewPdfAction, setPreviewPdfAction] = React.useState<(() => void) | null>(null);

  function checkRestricted(text: string) {
    // We get settings dynamically because the useEffect loads it asynchronously.
    const currentSettings = getSettings();
    if (!currentSettings.restrictedKeywords || !text) return false;
    const txt = text.toLowerCase();
    return currentSettings.restrictedKeywords.some(kw => txt.includes(kw));
  }

  function handleSaveDraft() {
    saveDraft(awb);
    toast.success("Draft saved successfully.");
  }

  function handleLoadDraft() {
    const d = getDraft();
    if (d) {
      setAwb(d);
      toast.success("Draft loaded successfully.");
    }
  }

  function handleDownloadAll() {
    const slip = generateCourierSlip(save());
    const inv = generateProformaInvoice(save());
    const lbl = generateAddressLabel(save());
    setPreviewPdfUrl(slip.output("bloburl") as unknown as string);
    setPreviewPdfAction(() => () => {
      downloadPDF(slip, `AWB_${awb.awbNumber}.pdf`);
      setTimeout(() => downloadPDF(inv, `INVOICE_${awb.awbNumber}.pdf`), 500);
      setTimeout(() => downloadPDF(lbl, `LABEL_${awb.awbNumber}.pdf`), 1000);
      setPreviewPdfUrl(null);
    });
  }

  function downloadInvoice() {
    const doc = generateProformaInvoice(save());
    setPreviewPdfUrl(doc.output("bloburl") as unknown as string);
    setPreviewPdfAction(() => () => { downloadPDF(doc, `INVOICE_${awb.awbNumber}.pdf`); setPreviewPdfUrl(null); });
  }

  function downloadLabel() {
    const doc = generateAddressLabel(save());
    setPreviewPdfUrl(doc.output("bloburl") as unknown as string);
    setPreviewPdfAction(() => () => { downloadPDF(doc, `LABEL_${awb.awbNumber}.pdf`); setPreviewPdfUrl(null); });
  }

  function downloadSlip() {
    const doc = generateCourierSlip(save());
    setPreviewPdfUrl(doc.output("bloburl") as unknown as string);
    setPreviewPdfAction(() => () => { downloadPDF(doc, `AWB_${awb.awbNumber}.pdf`); setPreviewPdfUrl(null); });
  }

  const totalItemsAmount = awb.items.reduce((s, it) => s + it.quantity * it.unitRate, 0);
  const totalItemsWeight = awb.items.reduce((s, it) => s + it.quantity * it.unitWeight, 0);

  const [settings, setSettings] = React.useState<import("@/lib/types").Settings | null>(null);
  React.useEffect(() => { setSettings(getSettings()); }, []);

  return (
    <div className="space-y-4">
      {/* Settings Summary Banner — only renders client-side after settings load */}
      {settings && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-primary">
                {settings.companyName || "Company Name not set"}
              </span>
              {settings.gstin && (
                <span className="text-xs text-muted-foreground border-l border-border pl-2 ml-1">
                  GSTIN: <span className="font-mono font-medium text-foreground">{settings.gstin}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Origin: <strong className="text-foreground ml-1">{settings.defaultOrigin}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Settings2 className="h-3 w-3" />
                Service: <strong className="text-foreground ml-1">{settings.defaultService}</strong>
              </span>
              <span>FSC: <strong className="text-foreground">{settings.defaultFscPercent}%</strong></span>
              <span>GST: <strong className="text-foreground">{settings.defaultGstMode === "auto" ? "Auto" : settings.defaultGstMode === "cgst_sgst" ? "CGST+SGST" : "IGST"}</strong></span>
              {settings.personalPhone && (
                <span>📞 <strong className="text-foreground">{settings.personalPhone}</strong></span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">ADD AWB</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadInvoice}>Download Invoice</Button>
          <Button variant="outline" size="sm" onClick={downloadLabel}>Download Label</Button>
          <Button variant="outline" size="sm" onClick={downloadSlip}>Download AWB Slip</Button>
        </div>
      </div>

      {/* AIR WAYBILL INFORMATION */}
      <Card>
        <CardHeader className="bg-secondary py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-secondary-foreground">Air Waybill Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <datalist id="cities-list">{uniqueCities.map(c => <option key={c} value={c} />)}</datalist>
          <datalist id="destinations-list">{uniqueDestinations.map(c => <option key={c} value={c} />)}</datalist>
          <datalist id="customers-list">{uniqueCustomers.map(c => <option key={c} value={c} />)}</datalist>

          <FieldRow>
            <Field label="AWB Number" required><Input value={awb.awbNumber} onChange={(e) => update("awbNumber", e.target.value)} className="font-mono" /></Field>
            <Field label="Customer"><Input list="customers-list" value={awb.customer} onChange={(e) => update("customer", e.target.value)} /></Field>
            <Field label="Origin"><Input value={awb.origin} onChange={(e) => update("origin", e.target.value)} /></Field>
            <Field label="Destination" required><Input list="destinations-list" value={awb.destination} onChange={(e) => update("destination", e.target.value)} /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Product" required>
              <Select value={awb.product} onValueChange={(v) => update("product", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Booking Date"><Input type="date" value={awb.bookingDate} onChange={(e) => update("bookingDate", e.target.value)} /></Field>
            <Field label="Service" required>
              <Select value={awb.service} onValueChange={(v) => update("service", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Reference Number"><Input value={awb.referenceNumber} onChange={(e) => update("referenceNumber", e.target.value)} /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Reference Name"><Input value={awb.referenceName} onChange={(e) => update("referenceName", e.target.value)} /></Field>
            <Field label="Shipment Value"><Input type="number" value={awb.shipmentValue} onChange={(e) => update("shipmentValue", +e.target.value)} /></Field>
            <Field label="Currency">
              <Select value={awb.currency} onValueChange={(v) => update("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Invoice Date"><Input type="date" value={awb.invoiceDate} onChange={(e) => update("invoiceDate", e.target.value)} /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Invoice Number"><Input value={awb.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} /></Field>
            <Field label="Content">
              <div className="space-y-1">
                <ProductSuggest value={awb.content} onChange={(v) => update("content", v)} placeholder="e.g. Clothes, Gifts..." />
                {checkRestricted(awb.content) && <div className="text-xs font-semibold text-destructive">⚠️ This item may require special documentation.</div>}
              </div>
            </Field>
            <div className="md:col-span-2">
              <Field label="Remarks"><Textarea value={awb.remarks} onChange={(e) => update("remarks", e.target.value)} rows={2} /></Field>
            </div>
          </FieldRow>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PartyForm title="SHIPPER / CONSIGNOR / FROM" value={awb.shipper} onChange={(p) => update("shipper", p)} />
        <PartyForm title="CONSIGNEE / RECEIVER / TO" value={awb.consignee} onChange={(p) => update("consignee", p)} />
      </div>

      {/* WEIGHTS & DIMENSIONS */}
      <Card>
        <CardHeader className="bg-secondary py-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-secondary-foreground">Weights and Dimensions</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addBox}><Plus className="h-3 w-3" /> Add Box</Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-3">
            <Field label="PCS"><Input type="number" value={awb.pcs} onChange={(e) => update("pcs", +e.target.value)} /></Field>
            <Field label="Total Actual Wt (kg)"><Input value={actual.toFixed(2)} readOnly /></Field>
            <Field label="Total Volumetric Wt (kg)"><Input value={vol.toFixed(2)} readOnly /></Field>
            <Field label="Chargeable Wt (kg)"><Input value={charges.chargeable.toFixed(2)} readOnly className="font-bold" /></Field>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Parcel No</TableHead>
                <TableHead className="w-20">Box No</TableHead>
                <TableHead className="text-red-500 font-bold uppercase">Actual Wt (kg)</TableHead>
                <TableHead className="text-red-500 font-bold uppercase">L (cm)</TableHead>
                <TableHead className="text-red-500 font-bold uppercase">B (cm)</TableHead>
                <TableHead className="text-red-500 font-bold uppercase">H (cm)</TableHead>
                <TableHead>Volumetric (kg)</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awb.boxes.map((b, i) => (
                <TableRow key={b.id}>
                  <TableCell><Input className="h-8" value={b.parcelNo} onChange={(e) => updateBox(i, { parcelNo: e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" value={b.boxNo} onChange={(e) => updateBox(i, { boxNo: e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" type="number" step="0.01" value={b.actualWt} onChange={(e) => updateBox(i, { actualWt: +e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" type="number" value={b.length} onChange={(e) => updateBox(i, { length: +e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" type="number" value={b.breadth} onChange={(e) => updateBox(i, { breadth: +e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" type="number" value={b.height} onChange={(e) => updateBox(i, { height: +e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" value={volumetricFromBox(b).toFixed(2)} readOnly /></TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeBox(i)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE INVOICE TOGGLE */}
      <Card>
        <CardHeader className="bg-secondary py-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-secondary-foreground">Create Shipment Invoice</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Create Invoice?</Label>
            <Switch checked={awb.createInvoice} onCheckedChange={(v) => update("createInvoice", v)} />
          </div>
        </CardHeader>
        {awb.createInvoice && (
          <CardContent className="space-y-3 pt-4">
            <FieldRow>
              <Field label="Invoice Type">
                <Select value={awb.invoiceType} onValueChange={(v) => update("invoiceType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="PROFORMA">PROFORMA</SelectItem><SelectItem value="COMMERCIAL">COMMERCIAL</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Currency">
                <Select value={awb.invoiceCurrency} onValueChange={(v) => update("invoiceCurrency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Incoterms">
                <Select value={awb.incoterms} onValueChange={(v) => update("incoterms", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOTERMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Note Preset"><Input value={awb.notePreset} onChange={(e) => update("notePreset", e.target.value)} /></Field>
            </FieldRow>
            <Field label="Custom Note"><Textarea rows={2} value={awb.customNote} onChange={(e) => update("customNote", e.target.value)} /></Field>
          </CardContent>
        )}
      </Card>

      {/* SHIPMENT INVOICE ITEMS */}
      <Card>
        <CardHeader className="bg-secondary py-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-secondary-foreground">Shipment Invoice Items</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3" /> Add Item</Button>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Box No</TableHead>
                <TableHead className="w-12">Sr</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">HS Code</TableHead>
                <TableHead className="w-20">Unit</TableHead>
                <TableHead className="w-16">Qty</TableHead>
                <TableHead className="w-24">Unit Wt</TableHead>
                <TableHead className="w-24">Unit Rate</TableHead>
                <TableHead className="w-28 text-right">Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awb.items.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">No items. Click "Add Item".</TableCell></TableRow>
              )}
              {awb.items.map((it, i) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <Select value={it.boxNo} onValueChange={(v) => updateItem(i, { boxNo: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{awb.boxes.map((b) => <SelectItem key={b.id} value={b.boxNo}>{b.boxNo}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs">{i + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <ProductSuggest
                        value={it.description}
                        onChange={(v) => updateItem(i, { description: v })}
                        placeholder="Search product..."
                        className="h-8"
                      />
                      {checkRestricted(it.description) && <div className="text-[10px] font-semibold text-destructive">⚠️ Restricted</div>}
                    </div>
                  </TableCell>
                  <TableCell><Input className="h-8" value={it.hsCode} onChange={(e) => updateItem(i, { hsCode: e.target.value })} /></TableCell>
                  <TableCell>
                    <Select value={it.unitType} onValueChange={(v) => updateItem(i, { unitType: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNIT_TYPES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input className="h-8" type="number" value={it.quantity} onChange={(e) => updateItem(i, { quantity: +e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" type="number" step="0.001" value={it.unitWeight} onChange={(e) => updateItem(i, { unitWeight: +e.target.value })} /></TableCell>
                  <TableCell><Input className="h-8" type="number" step="0.01" value={it.unitRate} onChange={(e) => updateItem(i, { unitRate: +e.target.value })} /></TableCell>
                  <TableCell className="text-right text-sm font-medium">{(it.quantity * it.unitRate).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
              {awb.items.length > 0 && (
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={6} className="text-right">TOTAL</TableCell>
                  <TableCell>{totalItemsWeight.toFixed(3)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{totalItemsAmount.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CHARGES */}
      <Card>
        <CardHeader className="bg-secondary py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-secondary-foreground">Charges & Tax</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <FieldRow>
            <Field label="Rate per kg (₹)"><Input type="number" step="0.01" value={awb.ratePerKg} onChange={(e) => update("ratePerKg", +e.target.value)} /></Field>
            <Field label="Freight (auto)"><Input value={charges.freight.toFixed(2)} readOnly className="font-bold" /></Field>
            <Field label="FSC %"><Input type="number" step="0.01" value={awb.fscPercent} onChange={(e) => update("fscPercent", +e.target.value)} /></Field>
            <Field label="FSC Amount (auto)"><Input value={charges.fsc.toFixed(2)} readOnly /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="Other Charges (₹)"><Input type="number" step="0.01" value={awb.otherCharges} onChange={(e) => update("otherCharges", +e.target.value)} /></Field>
            <Field label="GST Mode">
              <Select value={awb.gstMode} onValueChange={(v) => update("gstMode", v as GstMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (by State)</SelectItem>
                  <SelectItem value="cgst_sgst">CGST + SGST</SelectItem>
                  <SelectItem value="igst">IGST</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="CGST 9% (auto)"><Input value={charges.cgst.toFixed(2)} readOnly /></Field>
            <Field label="SGST 9% (auto)"><Input value={charges.sgst.toFixed(2)} readOnly /></Field>
          </FieldRow>
          <FieldRow>
            <Field label="IGST 18% (auto)"><Input value={charges.igst.toFixed(2)} readOnly /></Field>
            <Field label="Taxable"><Input value={charges.taxable.toFixed(2)} readOnly /></Field>
            <Field label="GST Total"><Input value={charges.gstTotal.toFixed(2)} readOnly /></Field>
            <Field label="GRAND TOTAL (₹)"><Input value={charges.total.toFixed(2)} readOnly className="font-bold text-base text-primary" /></Field>
          </FieldRow>
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <span className="font-semibold">In Words: </span>{amountInWords(charges.total)}
          </div>
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <div className="sticky bottom-0 -mx-4 border-t bg-card px-4 py-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={handleSaveDraft}><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
            {getDraft() && <Button variant="outline" type="button" onClick={handleLoadDraft}>Load Draft</Button>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={downloadInvoice} className="hidden lg:flex"><Printer className="mr-2 h-4 w-4" /> Invoice</Button>
            <Button variant="outline" type="button" onClick={downloadLabel} className="hidden lg:flex"><Printer className="mr-2 h-4 w-4" /> Label</Button>
            <Button variant="outline" type="button" onClick={downloadSlip} className="hidden lg:flex"><Printer className="mr-2 h-4 w-4" /> Slip</Button>
            <Button variant="secondary" type="button" onClick={handleDownloadAll}><Printer className="mr-2 h-4 w-4" /> Download All</Button>
            <Button type="button" onClick={onCreate}><Save className="h-4 w-4 mr-2" /> Create AWB</Button>
          </div>
        </div>
      </div>

      <Dialog open={!!previewPdfUrl} onOpenChange={(open) => !open && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30 rounded-md overflow-hidden border">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full border-0" title="PDF Preview" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPdfUrl(null)}>Cancel</Button>
            <Button onClick={previewPdfAction || undefined}>Confirm & Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
