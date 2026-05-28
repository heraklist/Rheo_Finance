import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { APP_VERSION } from "@/components/settings/settingsOptions";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const LANDING_URL =
  (import.meta.env.VITE_LANDING_URL as string | undefined) ??
  "https://landing-two-dun-95.vercel.app";

function signUpErrorMessage(message: string): string {
  if (message.includes("already registered") || message.includes("already exists")) {
    return "Αυτό το email χρησιμοποιείται ήδη. Δοκίμασε σύνδεση.";
  }

  if (message.includes("rate limit")) {
    return "Πολλές προσπάθειες. Περίμενε λίγο και δοκίμασε ξανά.";
  }

  if (message.includes("password") && message.includes("weak")) {
    return "Το password είναι πολύ αδύναμο. Χρησιμοποίησε τουλάχιστον 12 χαρακτήρες.";
  }

  return "Η εγγραφή απέτυχε. Έλεγξε τα στοιχεία και δοκίμασε ξανά.";
}

export function Signup() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [navigate, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Η σύνδεση Supabase δεν έχει ρυθμιστεί σε αυτό το build.");
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail?.includes("@")) {
      setError("Δώσε έγκυρο email.");
      return;
    }

    if (password.length < 12) {
      setError("Το password πρέπει να έχει τουλάχιστον 12 χαρακτήρες.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Τα passwords δεν ταιριάζουν.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${LANDING_URL}/auth/confirmed`,
        },
      });

      if (signUpError) {
        console.error("Sign up failed:", signUpError);
        setError(signUpErrorMessage(signUpError.message));
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Sign up failed:", err);
      setError("Η εγγραφή απέτυχε. Δοκίμασε ξανά αργότερα.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-14 h-14 rounded-full bg-income/20 text-income inline-flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h1 className="text-h1">Η εγγραφή ολοκληρώθηκε</h1>
          <p className="text-body text-text-secondary">
            Έλεγξε το email σου για τον σύνδεσμο επιβεβαίωσης. Μετά την επιβεβαίωση μπορείς να
            συνδεθείς.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-charcoal text-text-on-dark rounded-md py-3 px-6 text-sm font-medium hover:bg-charcoal-soft transition-colors"
          >
            Πίσω στη σύνδεση
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="relative w-full max-w-sm space-y-6">
        <div
          className="absolute bottom-8 right-8 text-gold opacity-10 text-6xl font-bold pointer-events-none select-none"
          aria-hidden
        >
          ◆
        </div>

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-charcoal text-gold-soft inline-flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div className="text-display">Rheo</div>
          <div className="text-body-lg text-text-secondary">Finance</div>
          <div className="text-caption mt-2 text-text-muted">Δημιουργία νέου λογαριασμού</div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="signup-email">
              Email
            </label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              className="bg-cream border-border-light"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="signup-password">
              Password
            </label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Τουλάχιστον 12 χαρακτήρες"
              autoComplete="new-password"
              className="bg-cream border-border-light"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="signup-password-confirm">
              Επιβεβαίωση password
            </label>
            <Input
              id="signup-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="Ξαναγράψε το password"
              autoComplete="new-password"
              className="bg-cream border-border-light"
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
            <UserPlus className="w-4 h-4" strokeWidth={1.7} />
            {submitting ? "Εγγραφή..." : "Εγγραφή"}
          </button>

          <p className="text-caption text-center">
            Έχεις ήδη λογαριασμό;{" "}
            <Link to="/login" className="text-charcoal underline underline-offset-2">
              Σύνδεση
            </Link>
          </p>
        </form>

        <div className="text-center text-caption mt-8 text-text-muted">
          v{APP_VERSION} · Tauri · Local SQLite
        </div>
      </div>
    </div>
  );
}
