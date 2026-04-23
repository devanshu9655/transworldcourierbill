import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAWBs } from "@/lib/storage";
import { computeCharges } from "@/lib/calc";
import type { AWB } from "@/lib/types";

export const Route = createFileRoute("/manifest")({
  component: ManifestPage,
  head: () => ({ meta: [{ title: "Manifest — Transworld Courier Service" }] }),
});

function ManifestPage() {
  const [list, setList] = React.useState<AWB[]>([]);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [service, setService] = React.useState("");

  React.useEffect(() => setList(getAWBs()), []);

  const filtered = list.filter((a) => {
    if (from && a.bookingDate < from) return false;
    if (to && a.bookingDate > to) return false;
    if (service && !a.service.toLowerCase().includes(service.toLowerCase())) return false;
    return true;
  });

  function exportCSV() {
    const rows = [["AWB", "Forwarding", "Date", "Service", "Destination", "PCS", "Chargeable", "Total"]];
    filtered.forEach((a) => {
      const c = computeCharges(a);
      rows.push([a.awbNumber, a.forwardingNumber, a.bookingDate, a.service, a.destination, String(a.pcs), c.chargeable.toFixed(2), c.total.toFixed(2)]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPcs = filtered.reduce((s, a) => s + a.pcs, 0);
  const totalWt = filtered.reduce((s, a) => s + computeCharges(a).chargeable, 0);
  const totalAmt = filtered.reduce((s, a) => s + computeCharges(a).total, 0);

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold text-primary">Manifest</h1>
      <Card className="mb-4">
        <CardContent className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-4">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label className="text-xs">Service</Label><Input value={service} onChange={(e) => setService(e.target.value)} placeholder="DHL_AMD…" /></div>
          <div className="flex items-end"><Button onClick={exportCSV}>Export CSV</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AWB</TableHead>
                <TableHead>Forwarding</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">PCS</TableHead>
                <TableHead className="text-right">Chg Wt</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const c = computeCharges(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.awbNumber}</TableCell>
                    <TableCell className="text-xs">{a.forwardingNumber}</TableCell>
                    <TableCell className="text-sm">{a.bookingDate}</TableCell>
                    <TableCell className="text-sm">{a.service}</TableCell>
                    <TableCell className="text-sm">{a.destination}</TableCell>
                    <TableCell className="text-right">{a.pcs}</TableCell>
                    <TableCell className="text-right">{c.chargeable.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{c.total.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">No entries.</TableCell></TableRow>}
              {filtered.length > 0 && (
                <TableRow className="bg-muted/40 font-bold">
                  <TableCell colSpan={5} className="text-right">TOTALS</TableCell>
                  <TableCell className="text-right">{totalPcs}</TableCell>
                  <TableCell className="text-right">{totalWt.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{totalAmt.toFixed(2)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
