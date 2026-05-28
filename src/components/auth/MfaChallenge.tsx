import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

function mfaErrorMessage(message: string): string {
  if (message.includes("verification")) {
    return "Ο κωδικός δεν είναι σωστός. Δοκίμασε τον νέο 6ψήφιο κωδικό.";
  }

  if (message.includes("factor")) {
    return "Δεν βρέθηκε ενεργό authenticator για τον λογαριασμό.";
  }

  return "Δεν ολοκληρώθηκε η επιβεβαίωση. Δοκίμασε ξανά.";
}

export function MfaChallenge() {
  const { setAuth, setMfaStatus } = useAppStore();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Δώσε τον 6ψήφιο κωδικό από το authenticator.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setSubmitting(false);
      console.error("Failed to list MFA factors:", factors.error);
      setError(mfaErrorMessage(factors.error.message));
      return;
    }

    const factor = factors.data.totp[0];
    if (!factor) {
      setSubmitting(false);
      setError("Δεν υπάρχει ενεργό authenticator για αυτόν τον λογαριασμό.");
      return;
    }

    const verification = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: normalizedCode,
    });

    setSubmitting(false);

    if (verification.error) {
      console.error("Failed to verify MFA challenge:", verification.error);
      setError(mfaErrorMessage(verification.error.message));
      return;
    }

    const { data } = await supabase.auth.getSession();
    setAuth(data.session?.user ?? null, data.session);
    setMfaStatus(false, false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex">
            <BrandMark />
          </div>
          <p className="text-text-muted mt-2">Επιβεβαίωση authenticator</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="mfa-code">
              Κωδικός
            </label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoComplete="one-time-code"
              autoFocus
              className="bg-cream border-border-light text-center"
            />
          </div>

          {error ? (
            <p className="text-expense text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-charcoal text-text-on-dark rounded-md py-3 text-sm font-medium hover:bg-charcoal-soft disabled:opacity-50 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />
            {submitting ? "Έλεγχος…" : "Επιβεβαίωση"}
          </button>
        </form>
      </div>
    </div>
  );
}
