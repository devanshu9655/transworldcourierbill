import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";
import type { AWB } from "./types";
import { computeCharges, amountInWords, totalActual, totalVolumetric } from "./calc";
import { COMPANY as DEFAULT_COMPANY } from "./company";
import { getSettings } from "./storage";

function getCompany() {
  const s = getSettings();
  return {
    name: s.companyName || DEFAULT_COMPANY.name,
    address: s.companyAddress || DEFAULT_COMPANY.address,
    phone: s.personalPhone || DEFAULT_COMPANY.phone,
    email: s.personalEmail || DEFAULT_COMPANY.email,
    gstin: s.gstin || DEFAULT_COMPANY.gstin,
  };
}

function barcodeDataUrl(value: string, opts?: { width?: number; height?: number; displayValue?: boolean }) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    width: opts?.width ?? 1.6,
    height: opts?.height ?? 40,
    displayValue: opts?.displayValue ?? true,
    fontSize: 12,
    margin: 0,
  });
  return canvas.toDataURL("image/png");
}

function fmt(n: number) {
  const s = Math.floor(n).toString();
  const dec = n.toFixed(2).split(".")[1];
  const lastThree = s.substring(s.length - 3);
  const otherNumbers = s.substring(0, s.length - 3);
  const formattedInt = otherNumbers !== "" ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree : lastThree;
  return formattedInt + "." + dec;
}

function partyLines(p: AWB["shipper"]): string[] {
  return [
    p.company,
    p.personName,
    p.address1,
    p.address2,
    p.address3,
    [p.city, p.state, p.postZip].filter(Boolean).join(", "),
    p.country,
    p.phone ? `Phone: ${p.phone}` : "",
    p.email ? `Email: ${p.email}` : "",
  ].filter(Boolean);
}

// ============================================================
// PROFORMA INVOICE
// ============================================================
export function generateProformaInvoice(awb: AWB): jsPDF {
  const COMPANY = getCompany();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 10;
  let y = M;

  const nameLines = COMPANY.name.split('\n');
  const nameOffset = (nameLines.length - 1) * 6;

  // Company header
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text(COMPANY.name, W / 2, y + 6, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(COMPANY.address, W / 2, y + 11 + nameOffset, { align: "center" });
  doc.text(`Phone: ${COMPANY.phone}  |  Email: ${COMPANY.email}`, W / 2, y + 15 + nameOffset, { align: "center" });
  y += 19 + nameOffset;
  doc.setLineWidth(0.4).line(M, y, W - M, y);
  y += 4;

  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text("PROFORMA INVOICE", W / 2, y + 4, { align: "center" });
  y += 8;

  const ch = computeCharges(awb);

  // Top info table - left/right
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
    margin: { left: M, right: M },
    body: [
      [
        { content: `Invoice No: ${awb.invoiceNumber || awb.awbNumber}`, styles: { fontStyle: "bold" } },
        { content: `Forwarding No: ${awb.forwardingNumber}`, styles: { fontStyle: "bold" } },
      ],
      [`Invoice Date: ${awb.invoiceDate || awb.bookingDate}`, `AWB No: ${awb.awbNumber}`],
      [`Total Pieces: ${awb.pcs}`, `Reference: ${awb.referenceNumber || "-"}`],
      [`Chargeable Wt: ${ch.chargeable.toFixed(2)} KG`, `Aadhar/KYC: ${awb.shipper.kycNumber || "-"}`],
    ],
    columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 95 } },
  });
  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 2;

  // Shipper / Consignee blocks
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0], valign: "top" },
    margin: { left: M, right: M },
    head: [[{ content: "SHIPPER", styles: { fillColor: [220, 230, 245], fontStyle: "bold" } }, { content: "CONSIGNEE", styles: { fillColor: [220, 230, 245], fontStyle: "bold" } }]],
    body: [[partyLines(awb.shipper).join("\n"), partyLines(awb.consignee).join("\n")]],
    columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 95 } },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 2;

  // Items grouped per box
  const itemsByBox = new Map<string, typeof awb.items>();
  awb.items.forEach((it) => {
    const k = it.boxNo || "1";
    if (!itemsByBox.has(k)) itemsByBox.set(k, []);
    itemsByBox.get(k)!.push(it);
  });
  if (itemsByBox.size === 0) itemsByBox.set("1", []);

  const body: any[] = [];
  Array.from(itemsByBox.entries()).forEach(([boxNo, items]) => {
    const box = awb.boxes.find((b) => b.boxNo === boxNo) ?? awb.boxes[0];
    const dims = box ? `${box.length}*${box.breadth}*${box.height}` : "-";
    const wt = box ? `${box.actualWt}` : "-";
    body.push([
      {
        content: `BOX NO: ${boxNo}     DIMENSIONS: ${dims} CM     ACTUAL WEIGHT: ${wt} KG`,
        colSpan: 8,
        styles: { fillColor: [240, 240, 240], fontStyle: "bold", fontSize: 8 },
      },
    ]);
    items.forEach((it, i) => {
      const amount = it.quantity * it.unitRate;
      body.push([
        i + 1,
        it.description,
        it.hsCode,
        it.unitType,
        it.quantity,
        it.unitWeight.toFixed(3),
        fmt(it.unitRate),
        fmt(amount),
      ]);
    });
  });

  const totalItemsAmount = awb.items.reduce((s, it) => s + it.quantity * it.unitRate, 0);
  const totalItemsWeight = awb.items.reduce((s, it) => s + it.unitWeight * it.quantity, 0);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
    headStyles: { fillColor: [50, 90, 160], textColor: 255, fontStyle: "bold" },
    margin: { left: M, right: M },
    head: [["Sr", "Description", "HS Code", "Unit", "Qty", "Unit Wt", "Unit Rate", "Amount"]],
    body,
    foot: [[
      { content: "TOTAL", colSpan: 4, styles: { fontStyle: "bold", halign: "right" } },
      { content: awb.items.reduce((s, it) => s + it.quantity, 0).toString(), styles: { fontStyle: "bold" } },
      { content: totalItemsWeight.toFixed(3), styles: { fontStyle: "bold" } },
      { content: "", styles: {} },
      { content: fmt(totalItemsAmount), styles: { fontStyle: "bold" } },
    ]],
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 18 },
      3: { cellWidth: 14 },
      4: { cellWidth: 12 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
      7: { cellWidth: 26 },
    },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 2;

  // Total in words
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
    margin: { left: M, right: M },
    body: [
      [
        { content: "TOTAL VALUE (in words):", styles: { fontStyle: "bold" } },
        { content: amountInWords(totalItemsAmount) },
      ],
    ],
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 140 } },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 3;

  // Notes & sign
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0], valign: "top", minCellHeight: 25 },
    margin: { left: M, right: M },
    head: [[{ content: "NOTES", styles: { fillColor: [220, 230, 245], fontStyle: "bold" } }, { content: "FOR " + COMPANY.name, styles: { fillColor: [220, 230, 245], fontStyle: "bold", halign: "center" } }]],
    body: [[awb.customNote || "Goods of Indian Origin. Value declared for customs purposes only.\nNo commercial value.", "\n\n\nAuthorised Signatory"]],
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 70, halign: "center" } },
  });

  return doc;
}

// ============================================================
// ADDRESS LABEL
// ============================================================
export function generateAddressLabel(awb: AWB): jsPDF {
  const COMPANY = getCompany();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 10;
  let y = M;

  const nameLines = COMPANY.name.split('\n');
  const nameOffset = (nameLines.length - 1) * 5;

  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(COMPANY.name, W / 2, y + 6, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  doc.text(`${COMPANY.address}  |  ${COMPANY.phone}`, W / 2, y + 11 + nameOffset, { align: "center" });
  y += 14 + nameOffset;

  // Forwarding barcode
  const fwd = barcodeDataUrl(awb.forwardingNumber, { height: 35 });
  doc.addImage(fwd, "PNG", W / 2 - 50, y, 100, 18);
  y += 22;

  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(`AWB: ${awb.awbNumber}`, M, y);
  doc.text(`Pieces: 1/${awb.pcs}`, W - M, y, { align: "right" });
  y += 4;

  // Two columns shipper / consignee
  const colW = (W - 2 * M - 4) / 2;
  const blockH = 95;

  function drawBlock(x: number, yy: number, title: string, p: AWB["shipper"]) {
    doc.setLineWidth(0.4);
    doc.rect(x, yy, colW, blockH);
    doc.setFillColor(50, 90, 160);
    doc.rect(x, yy, colW, 7, "F");
    doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(11);
    doc.text(title, x + colW / 2, yy + 5, { align: "center" });
    doc.setTextColor(0).setFont("helvetica", "normal").setFontSize(9.5);
    let ly = yy + 12;
    const lines = partyLines(p);
    lines.forEach((l) => {
      const wrapped = doc.splitTextToSize(l, colW - 6);
      wrapped.forEach((w: string) => {
        doc.text(w, x + 3, ly);
        ly += 4.2;
      });
    });
  }
  drawBlock(M, y, "FROM (SHIPPER)", awb.shipper);
  drawBlock(M + colW + 4, y, "TO (CONSIGNEE)", awb.consignee);
  y += blockH + 4;

  // Service / Origin / Destination box
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
    margin: { left: M, right: M },
    body: [
      [
        { content: `ORIGIN\n${awb.origin}`, styles: { fontStyle: "bold" } },
        { content: `DESTINATION\n${awb.destination}`, styles: { fontStyle: "bold" } },
        { content: `SERVICE\n${awb.service}`, styles: { fontStyle: "bold" } },
        { content: `WEIGHT\n${computeCharges(awb).chargeable.toFixed(2)} KG`, styles: { fontStyle: "bold" } },
      ],
    ],
  });

  return doc;
}

// ============================================================
// AWB COURIER SLIP (Accounts + Shipper copies)
// ============================================================
export function generateCourierSlip(awb: AWB): jsPDF {
  const COMPANY = getCompany();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ch = computeCharges(awb);
  const actual = totalActual(awb.boxes);
  const vol = totalVolumetric(awb.boxes);
  const dimsStr = awb.boxes.map((b) => `${b.length}x${b.breadth}x${b.height}`).join(", ") || "-";

  function drawCopy(yOffset: number, copyLabel: string) {
    const M = 8;
    const W = 210;
    let y = yOffset;

    const nameLines = COMPANY.name.split('\n');
    const nameOffset = (nameLines.length - 1) * 4.5;

    // Header band
    doc.setFillColor(50, 90, 160);
    doc.rect(M, y, W - 2 * M, 12 + nameOffset, "F");
    doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(13);
    doc.text(COMPANY.name, M + 3, y + 5);
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text(`${COMPANY.address}  |  Ph: ${COMPANY.phone}  |  ${COMPANY.email}`, M + 3, y + 10 + nameOffset);
    doc.setFontSize(9).setFont("helvetica", "bold");
    doc.text(copyLabel, W - M - 3, y + 7 + nameOffset / 2, { align: "right" });
    doc.setTextColor(0);
    y += 13 + nameOffset;

    // AWB number + barcode row
    doc.setLineWidth(0.4);
    doc.rect(M, y, W - 2 * M, 18);
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("AWB NUMBER", M + 2, y + 4);
    doc.setFontSize(14);
    doc.text(awb.awbNumber, M + 2, y + 12);
    const bc = barcodeDataUrl(awb.awbNumber, { height: 30, displayValue: false });
    doc.addImage(bc, "PNG", W - M - 75, y + 2, 73, 14);
    y += 18;

    // Grid: Origin/Dest/Service/PCS/Weights
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
      margin: { left: M, right: M },
      body: [
        [
          { content: `ACCOUNT\n${awb.customer || "-"}`, styles: { fontStyle: "bold" } },
          { content: `ORIGIN\n${awb.origin}`, styles: { fontStyle: "bold" } },
          { content: `DESTINATION\n${awb.destination}`, styles: { fontStyle: "bold" } },
          { content: `SERVICE\n${awb.service}`, styles: { fontStyle: "bold" } },
          { content: `PCS\n${awb.pcs}`, styles: { fontStyle: "bold" } },
        ],
        [
          { content: `ACTUAL WT\n${actual.toFixed(2)} KG` },
          { content: `VOLUMETRIC WT\n${vol.toFixed(2)} KG` },
          { content: `CHARGEABLE WT\n${ch.chargeable.toFixed(2)} KG` },
          { content: `DIMENSIONS (CM)\n${dimsStr}`, colSpan: 2 },
        ],
      ],
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY;

    // Shipper / Consignee
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], textColor: [0, 0, 0], valign: "top", minCellHeight: 28 },
      margin: { left: M, right: M },
      head: [[{ content: "SENDER (SHIPPER)", styles: { fillColor: [220, 230, 245], fontStyle: "bold" } }, { content: "RECIPIENT (CONSIGNEE)", styles: { fillColor: [220, 230, 245], fontStyle: "bold" } }]],
      body: [[partyLines(awb.shipper).join("\n"), partyLines(awb.consignee).join("\n")]],
      columnStyles: { 0: { cellWidth: 97 }, 1: { cellWidth: 97 } },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY;

    // Booking / Description
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
      margin: { left: M, right: M },
      body: [
        [
          { content: `BOOKING DATE\n${awb.bookingDate}` },
          { content: `DESCRIPTION\n${awb.content || "-"}` },
          { content: `SHIP VALUE\n${awb.currency} ${awb.shipmentValue}` },
          { content: `TYPE\n${awb.product || "INTERNATIONAL"} / NON-DOX` },
        ],
        [
          { content: `FORWARDING NO\n${awb.forwardingNumber}` },
          { content: `REFERENCE\n${awb.referenceNumber || "-"} ${awb.referenceName || ""}` },
          { content: `OTHER CHARGES\nRs. ${fmt(ch.other)}` },
          { content: `FSC (${awb.fscPercent}%)\nRs. ${fmt(ch.fsc)}` },
        ],
        [
          { content: `FREIGHT\nRs. ${fmt(ch.freight)}` },
          { content: `CGST 9%\nRs. ${fmt(ch.cgst)}` },
          { content: `SGST 9%\nRs. ${fmt(ch.sgst)}` },
          { content: `IGST 18%\nRs. ${fmt(ch.igst)}` },
        ],
        [
          { content: `INVOICE NO\n${awb.invoiceNumber || "-"}` },
          { content: `GSTIN\n${COMPANY.gstin}` },
          { content: `EWAY BILL NO\n-` },
          { content: `TOTAL\nRs. ${fmt(ch.total)}`, styles: { fontStyle: "bold", fillColor: [240, 245, 255] } },
        ],
      ],
    });
  }

  drawCopy(8, "ACCOUNTS COPY");
  drawCopy(150, "SHIPPER COPY");

  // Page 2 — terms
  doc.addPage();
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("TERMS & CONDITIONS", 105, 20, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  const terms = [
    "1. The shipper warrants that the contents are correctly described and lawful.",
    "2. Liability is limited as per Carrier's standard terms.",
    "3. Delivery times are estimated and not guaranteed.",
    "4. Insurance is the responsibility of the shipper unless arranged separately.",
    "5. Customs duties and taxes at destination are payable by the consignee.",
    "6. Disputes are subject to Rajkot jurisdiction only.",
  ];
  let ty = 30;
  terms.forEach((t) => {
    const w = doc.splitTextToSize(t, 180);
    doc.text(w, 15, ty);
    ty += w.length * 5 + 2;
  });

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  // data URI approach — most reliable across all browsers & dev environments
  const dataUri = doc.output("datauristring");
  const a = document.createElement("a");
  a.href = dataUri;
  a.download = safeName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 200);
}

export function printAll(awb: AWB) {
  const merged = generateProformaInvoice(awb);
  merged.addPage();
  // Append label
  const labelDoc = generateAddressLabel(awb);
  const labelPages = labelDoc.getNumberOfPages();
  for (let i = 1; i <= labelPages; i++) {
    if (i > 1) merged.addPage();
    // jsPDF doesn't merge; just open three windows? Easier: open print of each
  }
  // simpler approach: open print dialogs sequentially
  const slip = generateCourierSlip(awb);
  const inv = generateProformaInvoice(awb);
  const lbl = generateAddressLabel(awb);
  inv.autoPrint();
  window.open(inv.output("bloburl"), "_blank");
  setTimeout(() => {
    lbl.autoPrint();
    window.open(lbl.output("bloburl"), "_blank");
  }, 500);
  setTimeout(() => {
    slip.autoPrint();
    window.open(slip.output("bloburl"), "_blank");
  }, 1000);
}
