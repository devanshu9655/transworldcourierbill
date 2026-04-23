
## Transworld Courier Service — Build Plan

A production-ready courier billing app (LocalStorage-based, no backend) that mirrors the uploaded AWB screen and produces three pixel-faithful PDFs.

### App shell
- **Top nav**: AWB Entries · Manifest · Invoices · Rate Calculator · Accounts · Reports · Settings
- **Brand strip** with company block (Transworld Courier Service · Sadhu Vasvani Road, Rajkot · 9328277677 · transworldcourierservice@yahoo.com)
- White + blue admin theme, dense form layout matching the screenshot

### Routes
- `/` → AWB Entries list (table + "New AWB" button)
- `/awb/new` and `/awb/$id` → ADD/EDIT AWB form (the big screen)
- `/manifest`, `/invoices`, `/accounts`, `/reports` → list views reading saved AWBs (stub-but-useful: search, filter by date, totals)
- `/rate-calculator` → standalone freight calculator (rate × chargeable wt + FSC% + GST)
- `/settings` → company info, default FSC%, GST mode

### ADD AWB screen — exact section parity with screenshot
1. **Air Waybill Information** — AWB Number (auto, editable), Customer, Origin, Destination, Product, Booking Date, Service (DHL_AMD, FEDEX, UPS, ARAMEX…), Reference Number, Reference Name, Shipment Value + Currency, Invoice Date, Invoice Number, Content, Remarks
2. **Shipper / Consignor / From** — Search Address Book, Code, Update Address Book?, Company, Person Name, Address 1/2/3, Post/Zip, City, State, Country, Phone, Email, KYC Type, KYC Number, Upload KYC, Upload Shipper Image, Save to Address Book
3. **Consignee / Receiver / To** — same field set
4. **Weights & Dimensions** — PCS, Actual Wt, Volumetric Wt (auto), Chargeable Wt (auto), per-box rows: Parcel No, Box No, Actual Wt(kg), L, B, H, Volumetric Wt(kg), Chargeable Wt(kg)
5. **Create Shipment Invoice?** toggle → Invoice Type (Proforma/Commercial), Currency, Incoterms (FOB…), Note preset, custom note
6. **Shipment Invoice Items** table — Box No, Sr No, Description, HS Code, Unit Type (Pc/Pkt/Set/Kg), Qty, Unit Weight, Unit Rate, Amount, Remove + Add Item; auto Total Weight + Total Amount
7. **Charges block** — Rate per kg, Freight (auto = rate × chargeable wt), FSC %, FSC amount (auto), Other Charges, GST mode (Auto/CGST+SGST/IGST), CGST 9% / SGST 9% / IGST 18% (auto), **Grand Total** + amount-in-words

Bottom buttons: **Create AWB** · **Create AWB and Print Label**

### Calculation engine
- Volumetric = (L×B×H)/5000 per box, summed
- Chargeable = max(actual, volumetric), rounded up to 0.5 kg
- Freight = rate × chargeable
- FSC = freight × FSC%
- Taxable = Freight + FSC + Other Charges
- GST: Auto → if consignee state contains "Gujarat" → CGST 9% + SGST 9%, else IGST 18% (manual override available)
- Total = Taxable + GST; converted to words (Indian numbering)

### AWB Number & Barcode
- Format: `TRANSWORLD` + `YYYYMMDD` + 4-digit random (e.g. `TRANSWORLD202604170001`)
- Forwarding No: 10-digit random; barcode rendered with JsBarcode (CODE128) on label + slip

### PDF outputs (jsPDF + jspdf-autotable, pixel-faithful to samples)
1. **Proforma Invoice** — Header "PROFORMA INVOICE"; left block (Invoice No, Date, Total Pieces, Chargeable Wt) | right block (Forwarding No, Aadhar/Reference); Shipper & Consignee blocks side-by-side; items table grouped per Box with "BOX NO: x, DIMENSIONS L*B*H, ACTUAL WEIGHT" header row; columns Sr/Description/HS Code/Unit Type/Qty/Unit Rate/Amount(FOB)/COO; Total + amount in words; Notes + Signature/Stamp box
2. **Address Label** — Two columns (Shipper | Consignee) with Name, Address, Pincode, City, State, Country, Phone; Forwarding No + barcode in each column; "1/1" piece indicator
3. **AWB Courier Slip** — Two copies on page 1 (ACCOUNTS COPY + SHIPPER COPY), page 2 with terms & conditions; layout matches sample: company header, big AWB number, grid with Account/Origin/Destination/Chargeable Wt/Actual Wt/PCS/Volumetric Wt/Dimensions, sender & recipient blocks, Booking Date/Description/Ship Value/INTERNATIONAL+NON-DOX, Service/Forwarding No/Ref/Other Charges/FSC, GSTIN line, CGST/SGST/IGST/Invoice No, **TOTAL**, EWAY BILL NO, copy label

### Persistence & actions
- All data in LocalStorage: `tcs_awbs`, `tcs_address_book`, `tcs_settings`
- Per-AWB row actions: View · Edit · Download Invoice PDF · Download Label PDF · Download AWB PDF · Print All (opens print dialog with all 3)
- Address Book: Save shipper/consignee, search by Code, autofill on select
- File uploads (KYC, shipper image): stored as base64 in LocalStorage with size guard

### Other modules
- **Manifest**: filter by date range + service, export CSV, lists AWB / Forwarding / Destination / PCS / Chargeable / Total
- **Invoices**: list of generated proforma invoices with download
- **Accounts**: aggregates totals per customer (credit limit + balance, like the header in the screenshot)
- **Reports**: monthly summary (count, total weight, freight, GST, revenue)
- **Rate Calculator**: standalone form to compute freight + GST without saving

### Tech
- TanStack Start routes; React Hook Form + Zod for AWB form validation
- shadcn/ui (Card, Input, Select, Table, Tabs, Dialog, Sonner toasts)
- jsPDF + jspdf-autotable for PDFs; JsBarcode for barcodes
- number-to-words helper for Indian rupees ("Three Thousand Four Hundred And Seventy Rupees Only")

### Acceptance
- Filling the sample data (Rojasara → Mr K. Balasri, 39×24×22, 5.35 kg actual, rate giving Freight 3906, FSC 1796.76, Other 165, CGST/SGST 528.10 each → Total 6923.96) reproduces all three PDFs visually matching the uploaded samples.
