import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAWBs } from "@/lib/storage";
import { computeCharges } from "@/lib/calc";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Transworld Courier Service" }] }),
});

function ReportsPage() {
  const [list, setList] = React.useState(getAWBs);
  React.useEffect(() => setList(getAWBs()), []);
  const byMonth = new Map<string, { count: number; wt: number; freight: number; gst: number; total: number }>();
  list.forEach((a) => {
    const m = (a.bookingDate || "").slice(0, 7);
    const c = computeCharges(a);
    const cur = byMonth.get(m) ?? { count: 0, wt: 0, freight: 0, gst: 0, total: 0 };
    cur.count++; cur.wt += c.chargeable; cur.freight += c.freight; cur.gst += c.gstTotal; cur.total += c.total;
    byMonth.set(m, cur);
  });
  const rows = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold text-primary">Reports</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">AWBs</TableHead>
                <TableHead className="text-right">Total Wt (kg)</TableHead>
                <TableHead className="text-right">Freight ₹</TableHead>
                <TableHead className="text-right">GST ₹</TableHead>
                <TableHead className="text-right">Revenue ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([m, v]) => (
                <TableRow key={m}>
                  <TableCell className="font-medium">{m}</TableCell>
                  <TableCell className="text-right">{v.count}</TableCell>
                  <TableCell className="text-right">{v.wt.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{v.freight.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{v.gst.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">{v.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No data.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
