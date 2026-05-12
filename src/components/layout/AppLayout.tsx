import { BrandMark } from "@/components/ui/BrandMark";
import { SyncPill } from "@/components/ui/SyncPill";
import { useAppStore } from "@/lib/store";
import { Calculator, Plus, Repeat2, Settings, TrendingUp } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

export function AppLayout() {
  const location = useLocation();
  const { currentBookId, syncState, pendingCount } = useAppStore();
  const showVat = currentBookId === "book-business";

  // Hide FAB where a focused transaction flow owns the bottom action area.
  const showFab = location.pathname !== "/add" && !location.pathname.startsWith("/transactions/");

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="topbar sticky top-0 z-10">
        <Link to="/" aria-label="Αρχική">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-2">
          <SyncPill status={syncState} pendingCount={pendingCount} />
          <Link
            to="/recurring"
            className="p-1 rounded-md text-text-secondary hover:text-charcoal hover:bg-sand transition-colors"
            aria-label="Πάγια"
          >
            <Repeat2 className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </Link>
          {showVat ? (
            <Link
              to="/vat"
              className="p-1 rounded-md text-text-secondary hover:text-charcoal hover:bg-sand transition-colors"
              aria-label="Σύνοψη ΦΠΑ"
            >
              <Calculator className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </Link>
          ) : null}
          <Link
            to="/forecast"
            className="p-1 rounded-md text-text-secondary hover:text-charcoal hover:bg-sand transition-colors"
            aria-label="Πρόβλεψη"
          >
            <TrendingUp className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </Link>
          <Link
            to="/settings"
            className="p-1 rounded-md text-text-secondary hover:text-charcoal hover:bg-sand transition-colors"
            aria-label="Ρυθμίσεις"
          >
            <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </Link>
        </div>
      </header>

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
