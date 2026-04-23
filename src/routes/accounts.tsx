import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAWBs } from "@/lib/storage";
import { computeCharges } from "@/lib/calc";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
  head: () => ({ meta: [{ title: "Accounts — Transworld Courier Service" }] }),
});

function AccountsPage() {
  const [list, setList] = React.useState(getAWBs);
  React.useEffect(() => setList(getAWBs()), []);
  const byCustomer = new Map<string, { count: number; total: number; chargeable: number }>();
  list.forEach((a) => {
    const key = a.customer || a.shipper.company || "—";
    const c = computeCharges(a);
    const cur = byCustomer.get(key) ?? { count: 0, total: 0, chargeable: 0 };
    cur.count++; cur.total += c.total; cur.chargeable += c.chargeable;
    byCustomer.set(key, cur);
  });
  const rows = Array.from(byCustomer.entries()).sort((a, b) => b[1].total - a[1].total);

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold text-primary">Accounts</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">AWBs</TableHead>
                <TableHead className="text-right">Total Chg Wt</TableHead>
                <TableHead className="text-right">Total Billed ₹</TableHead>
                <TableHead className="text-right">Balance ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell className="font-medium">{k}</TableCell>
                  <TableCell className="text-right">{v.count}</TableCell>
                  <TableCell className="text-right">{v.chargeable.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{v.total.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">{v.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No accounts yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
