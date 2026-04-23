import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAWBs } from "@/lib/storage";
import { computeCharges } from "@/lib/calc";
import { generateProformaInvoice, downloadPDF } from "@/lib/pdf";

export const Route = createFileRoute("/invoices")({
  component: InvoicesPage,
  head: () => ({ meta: [{ title: "Invoices — Transworld Courier Service" }] }),
});

function InvoicesPage() {
  const [list, setList] = React.useState(getAWBs);
  React.useEffect(() => setList(getAWBs()), []);
  const invoices = list.filter((a) => a.createInvoice);

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold text-primary">Invoices</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>AWB</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((a) => {
                const c = computeCharges(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.invoiceNumber || a.awbNumber}</TableCell>
                    <TableCell className="text-sm">{a.invoiceDate || a.bookingDate}</TableCell>
                    <TableCell className="font-mono text-xs">{a.awbNumber}</TableCell>
                    <TableCell className="text-sm">{a.consignee.personName || a.consignee.company}</TableCell>
                    <TableCell className="text-sm">{a.invoiceType}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{c.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => downloadPDF(generateProformaInvoice(a), `INVOICE_${a.awbNumber}.pdf`)}><Download className="h-3 w-3" /> PDF</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {invoices.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
