import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSettings, saveSettings } from "@/lib/storage";
import { toast } from "sonner";
import type { Settings } from "@/lib/types";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Transworld Courier Service" }] }),
});

function SettingsPage() {
  const [s, setS] = React.useState<Settings>(getSettings);
  const [newKeyword, setNewKeyword] = React.useState("");

  function save() {
    saveSettings(s);
    toast.success("Settings saved");
  }

  function addKeyword() {
    if (!newKeyword.trim()) return;
    const kw = newKeyword.trim().toLowerCase();
    const current = s.restrictedKeywords || [];
    if (!current.includes(kw)) {
      setS({ ...s, restrictedKeywords: [...current, kw] });
    }
    setNewKeyword("");
  }

  function removeKeyword(idx: number) {
    setS({ ...s, restrictedKeywords: s.restrictedKeywords?.filter((_, i) => i !== idx) });
  }

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold text-primary">Settings</h1>
      <Card className="max-w-2xl">
        <CardHeader className="bg-secondary py-3"><CardTitle className="text-sm uppercase">Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Default FSC %</Label><Input type="number" step="0.01" value={s.defaultFscPercent} onChange={(e) => setS({ ...s, defaultFscPercent: +e.target.value })} /></div>
            <div><Label>Default GST Mode</Label>
              <Select value={s.defaultGstMode} onValueChange={(v) => setS({ ...s, defaultGstMode: v as Settings["defaultGstMode"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (by State)</SelectItem>
                  <SelectItem value="cgst_sgst">CGST + SGST</SelectItem>
                  <SelectItem value="igst">IGST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Default Origin</Label><Input value={s.defaultOrigin} onChange={(e) => setS({ ...s, defaultOrigin: e.target.value })} /></div>
            <div><Label>Default Service</Label><Input value={s.defaultService} onChange={(e) => setS({ ...s, defaultService: e.target.value })} /></div>
            <div className="col-span-2"><Label>GSTIN</Label><Input value={s.gstin} onChange={(e) => setS({ ...s, gstin: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>
      <Card className="max-w-2xl mt-4">
        <CardHeader className="bg-secondary py-3"><CardTitle className="text-sm uppercase">Personal & Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
             <div><Label>Personal Email</Label><Input type="email" value={s.personalEmail || ''} onChange={(e) => setS({...s, personalEmail: e.target.value})} /></div>
             <div><Label>Personal Phone</Label><Input value={s.personalPhone || ''} onChange={(e) => setS({...s, personalPhone: e.target.value})} /></div>
             <div className="col-span-2"><Label>Company Name</Label><Input value={s.companyName || ''} onChange={(e) => setS({...s, companyName: e.target.value})} /></div>
             <div className="col-span-2"><Label>Company Address</Label><Input value={s.companyAddress || ''} onChange={(e) => setS({...s, companyAddress: e.target.value})} /></div>
             <div className="col-span-2"><Label>Company Website</Label><Input type="url" value={s.companyWebsite || ''} onChange={(e) => setS({...s, companyWebsite: e.target.value})} /></div>
          </div>
         <Button onClick={save} className="mt-4">Save Settings</Button>
        </CardContent>
      </Card>

      <Card className="max-w-2xl mt-4">
        <CardHeader className="bg-secondary py-3"><CardTitle className="text-sm uppercase">Restricted Items Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">Receive a warning if any of these keywords are typed in the item Description or Content field.</p>
          <div className="flex flex-wrap gap-2">
            {s.restrictedKeywords?.map((kw, idx) => (
              <div key={idx} className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
                <span>{kw}</span>
                <button type="button" onClick={() => removeKeyword(idx)} className="hover:text-destructive/80"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 max-w-sm mt-2">
            <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addKeyword()} placeholder="Add keyword (e.g., liquid)" />
            <Button type="button" variant="outline" size="icon" onClick={addKeyword}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
