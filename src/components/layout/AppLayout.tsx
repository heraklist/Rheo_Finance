import { BrandMark } from "@/components/ui/BrandMark";
import { SyncPill } from "@/components/ui/SyncPill";
import { UpdateBanner } from "@/components/ui/UpdateBanner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppStore } from "@/lib/store";
import { Calculator, MoreHorizontal, Plus, Repeat2, Settings, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export function AppLayout() {
  const location = useLocation();
  const { currentBookId, syncState, pendingCount } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const showVat = currentBookId === "book-business";
  const hideAppHeader =
    location.pathname === "/add" ||
    location.pathname.startsWith("/transactions/") ||
    location.pathname.startsWith("/settings/categories");
  const navItems = [
    {
      to: "/recurring",
      label: "Πάγια",
      description: "Πρότυπα και αυτόματες εγγραφές",
      icon: Repeat2,
      visible: true,
    },
    {
      to: "/vat",
      label: "ΦΠΑ",
      description: "Τριμηνιαία σύνοψη",
      icon: Calculator,
      visible: showVat,
    },
    {
      to: "/forecast",
      label: "Πρόβλεψη",
      description: "12μηνη ταμειακή ροή",
      icon: TrendingUp,
      visible: true,
    },
    {
      to: "/settings",
      label: "Ρυθμίσεις",
      description: "Λογαριασμός και sync",
      icon: Settings,
      visible: true,
    },
  ].filter((item) => item.visible);

  // Hide FAB where a focused transaction flow owns the bottom action area.
  const showFab =
    location.pathname !== "/add" &&
    !location.pathname.startsWith("/transactions/") &&
    !location.pathname.startsWith("/settings/categories");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <UpdateBanner />
      {!hideAppHeader ? (
        <header className="topbar app-topbar sticky top-0 z-10">
          <Link to="/" aria-label="Αρχική">
            <BrandMark />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <SyncPill status={syncState} pendingCount={pendingCount} />
            <div className="hidden items-center gap-2 sm:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`p-1 rounded-md transition-colors ${
                      active
                        ? "bg-sand text-charcoal"
                        : "text-text-secondary hover:text-charcoal hover:bg-sand"
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  </Link>
                );
              })}
            </div>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-md bg-sand p-1 text-charcoal transition-colors hover:bg-cream sm:hidden"
                  aria-label="Περισσότερα"
                >
                  <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 border-border-light bg-cream p-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors ${
                        active ? "bg-sand text-charcoal" : "text-text-secondary hover:bg-sand"
                      }`}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-light bg-sand text-charcoal">
                        <Icon className="h-4 w-4" strokeWidth={1.6} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-text-primary">
                          {item.label}
                        </span>
                        <span className="block text-caption">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        </header>
      ) : null}

      <main className="flex-1">
        <Outlet />
      </main>

      {showFab && (
        <Link to="/add" className="fab" aria-label="Νέα συναλλαγή">
          <Plus className="w-5.5 h-5.5" strokeWidth={1.8} />
        </Link>
      )}
    </div>
  );
}
