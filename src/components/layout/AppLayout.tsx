import { BrandMark } from "@/components/ui/BrandMark";
import { SyncPill, type SyncState } from "@/components/ui/SyncPill";
import { Plus, Settings } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export function AppLayout() {
  const location = useLocation();
  // Phase 2 will wire this to real sync state
  const [syncStatus] = useState<SyncState>("synced");

  // Hide FAB on the add-transaction page itself
  const showFab = location.pathname !== "/add";

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="topbar sticky top-0 z-10">
        <Link to="/" aria-label="Αρχική">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-2">
          <SyncPill status={syncStatus} />
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
