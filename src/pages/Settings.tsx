import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Settings() {
  const { user } = useAppStore();
  const navigate = useNavigate();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out:", error);
      return;
    }

    navigate("/login");
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-h1">Ρυθμίσεις</h1>
        <p className="text-caption mt-1">Λογαριασμός και συγχρονισμός</p>
      </div>

      <section className="bg-cream border border-border-light rounded-md p-4">
        <h2 className="text-h3 mb-2">Λογαριασμός</h2>
        <p className="text-text-muted text-sm mb-4">{user?.email ?? "Συνδεδεμένος χρήστης"}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 text-expense text-sm font-medium hover:underline"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.7} />
          Αποσύνδεση
        </button>
      </section>

      <p className="text-caption">
        Περισσότερες ρυθμίσεις σύντομα: backup, export και sync settings.
      </p>
    </div>
  );
}
