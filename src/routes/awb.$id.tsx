import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AWBForm } from "@/components/AWBForm";
import { getAWB } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/awb/$id")({
  component: EditAWB,
  head: () => ({ meta: [{ title: "Edit AWB — Transworld Courier Service" }] }),
});

function EditAWB() {
  const { id } = Route.useParams();
  const awb = getAWB(id);
  if (!awb) {
    return (
      <AppShell>
        <div className="rounded-md border bg-card p-8 text-center">
          <p className="text-muted-foreground">AWB not found.</p>
          <Button asChild className="mt-4"><Link to="/">Back to AWB list</Link></Button>
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <AWBForm initial={awb} />
    </AppShell>
  );
}
