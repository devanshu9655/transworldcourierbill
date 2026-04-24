import { Link, useLocation } from "@tanstack/react-router";
import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "AWB Entries" },
  { to: "/manifest", label: "Manifest" },
  { to: "/invoices", label: "Invoices" },
  { to: "/rate-calculator", label: "Rate Calculator" },
  { to: "/accounts", label: "Accounts" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1400px] px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Transworld Logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-bold text-primary whitespace-pre-wrap leading-tight">{COMPANY.name}</h1>
              </div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <div>GSTIN: {COMPANY.gstin}</div>
            </div>
          </div>
        </div>
        <nav className="border-t bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-2">
            {NAV.map((n) => {
              const active = n.to === "/" ? location.pathname === "/" || location.pathname.startsWith("/awb") : location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/10",
                    active && "bg-white/15",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-4">{children}</main>
    </div>
  );
}
