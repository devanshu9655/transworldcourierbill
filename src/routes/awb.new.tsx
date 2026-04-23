import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AWBForm } from "@/components/AWBForm";

export const Route = createFileRoute("/awb/new")({
  component: NewAWB,
  head: () => ({ meta: [{ title: "New AWB — Transworld Courier Service" }] }),
});

function NewAWB() {
  return (
    <AppShell>
      <AWBForm />
    </AppShell>
  );
}
