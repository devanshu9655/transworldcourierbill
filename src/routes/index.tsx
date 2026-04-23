import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { Plus, Eye, Edit2, FileText, Tag, FileBox, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAWBs, deleteAWB } from "@/lib/storage";
import { computeCharges } from "@/lib/calc";
import { generateProformaInvoice, generateAddressLabel, generateCourierSlip, downloadPDF } from "@/lib/pdf";
import { toast } from "sonner";
import type { AWB } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({ meta: [{ title: "AWB Entries — Transworld Courier Service" }, { name: "description", content: "Manage Air Waybill entries, generate invoices, labels and slips." }] }),
});

function Index() {
  const [list, setList] = React.useState<AWB[]>([]);
  const [q, setQ] = React.useState("");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  React.useEffect(() => { setList(getAWBs()); }, []);

  function refresh() { setList(getAWBs()); }

  function onDelete(id: string) {
    deleteAWB(id);
    setConfirmId(null);
    refresh();
    toast.success("AWB deleted");
  }

  const filtered = list.filter((a) =>
    !q ||
    a.awbNumber.toLowerCase().includes(q.toLowerCase()) ||
    a.consignee.personName.toLowerCase().includes(q.toLowerCase()) ||
    a.consignee.company.toLowerCase().includes(q.toLowerCase()) ||
    a.destination.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-primary">AWB Entries</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Search AWB / consignee / destination" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
          <Button asChild><Link to="/awb/new"><Plus className="h-4 w-4" /> New AWB</Link></Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AWB Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Chg Wt</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No AWB entries yet. Click "New AWB" to create one.</TableCell></TableRow>
              )}
              {filtered.map((a) => {
                const c = computeCharges(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.awbNumber}</TableCell>
                    <TableCell className="text-sm">{a.bookingDate}</TableCell>
                    <TableCell className="text-sm">{a.service}</TableCell>
                    <TableCell className="text-sm">{a.consignee.personName || a.consignee.company}</TableCell>
                    <TableCell className="text-sm">{a.destination}</TableCell>
                    <TableCell className="text-right text-sm">{c.chargeable.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{c.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="Edit"><Link to="/awb/$id" params={{ id: a.id }}><Edit2 className="h-3.5 w-3.5" /></Link></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Invoice PDF" onClick={() => downloadPDF(generateProformaInvoice(a), `INVOICE_${a.awbNumber}.pdf`)}><FileText className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Label PDF" onClick={() => downloadPDF(generateAddressLabel(a), `LABEL_${a.awbNumber}.pdf`)}><Tag className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="AWB Slip PDF" onClick={() => downloadPDF(generateCourierSlip(a), `AWB_${a.awbNumber}.pdf`)}><FileBox className="h-3.5 w-3.5" /></Button>
                        {confirmId === a.id ? (
                          <span className="flex items-center gap-1">
                            <span className="text-xs text-destructive font-medium">Delete?</span>
                            <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => onDelete(a.id)}>Yes</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmId(null)}>No</Button>
                          </span>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setConfirmId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
