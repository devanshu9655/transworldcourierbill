import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { chargeableWeight, amountInWords } from "@/lib/calc";

export const Route = createFileRoute("/rate-calculator")({
  component: RateCalc,
  head: () => ({ meta: [{ title: "Rate Calculator — Transworld Courier Service" }] }),
});

function RateCalc() {
  const [actual, setActual] = React.useState(0);
  const [l, setL] = React.useState(0);
  const [b, setB] = React.useState(0);
  const [h, setH] = React.useState(0);
  const [rate, setRate] = React.useState(0);
  const [fsc, setFsc] = React.useState(46);
  const [other, setOther] = React.useState(0);
  const [gst, setGst] = React.useState<"cgst_sgst" | "igst">("cgst_sgst");

  const vol = (l * b * h) / 5000;
  const chg = chargeableWeight(actual, vol);
  const freight = rate * chg;
  const fscAmt = (freight * fsc) / 100;
  const taxable = freight + fscAmt + other;
  const cgst = gst === "cgst_sgst" ? +(taxable * 0.09).toFixed(2) : 0;
  const sgst = gst === "cgst_sgst" ? +(taxable * 0.09).toFixed(2) : 0;
  const igst = gst === "igst" ? +(taxable * 0.18).toFixed(2) : 0;
  const total = +(taxable + cgst + sgst + igst).toFixed(2);

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold text-primary">Rate Calculator</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="bg-secondary py-3"><CardTitle className="text-sm uppercase">Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Actual Wt (kg)</Label><Input type="number" step="0.01" value={actual} onChange={(e) => setActual(+e.target.value)} /></div>
              <div><Label>L (cm)</Label><Input type="number" value={l} onChange={(e) => setL(+e.target.value)} /></div>
              <div><Label>B (cm)</Label><Input type="number" value={b} onChange={(e) => setB(+e.target.value)} /></div>
              <div><Label>H (cm)</Label><Input type="number" value={h} onChange={(e) => setH(+e.target.value)} /></div>
              <div><Label>Rate per kg ₹</Label><Input type="number" step="0.01" value={rate} onChange={(e) => setRate(+e.target.value)} /></div>
              <div><Label>FSC %</Label><Input type="number" step="0.01" value={fsc} onChange={(e) => setFsc(+e.target.value)} /></div>
              <div><Label>Other Charges ₹</Label><Input type="number" step="0.01" value={other} onChange={(e) => setOther(+e.target.value)} /></div>
              <div><Label>GST</Label>
                <Select value={gst} onValueChange={(v) => setGst(v as "cgst_sgst" | "igst")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cgst_sgst">CGST + SGST</SelectItem><SelectItem value="igst">IGST 18%</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="bg-secondary py-3"><CardTitle className="text-sm uppercase">Result</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-4 text-sm">
            <div className="flex justify-between"><span>Volumetric Wt</span><span className="font-medium">{vol.toFixed(2)} kg</span></div>
            <div className="flex justify-between"><span>Chargeable Wt</span><span className="font-medium">{chg.toFixed(2)} kg</span></div>
            <div className="flex justify-between"><span>Freight</span><span className="font-medium">₹ {freight.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>FSC ({fsc}%)</span><span className="font-medium">₹ {fscAmt.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Other Charges</span><span className="font-medium">₹ {other.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2"><span>Taxable</span><span className="font-medium">₹ {taxable.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>CGST 9%</span><span>₹ {cgst.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>SGST 9%</span><span>₹ {sgst.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>IGST 18%</span><span>₹ {igst.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary"><span>TOTAL</span><span>₹ {total.toFixed(2)}</span></div>
            <div className="rounded-md bg-muted/40 p-2 text-xs">{amountInWords(total)}</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
