import { APP_VERSION } from "@/components/settings/settingsOptions";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { LockKeyhole, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function authErrorMessage(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Λάθος email ή password.";
  }

  if (message.includes("Email not confirmed")) {
    return "Το email δεν έχει επιβεβαιωθεί στο Supabase.";
  }

  if (message.includes("rate limit")) {
    return "Έχουν γίνει πολλές προσπάθειες. Περίμενε λίγο και δοκίμασε ξανά.";
  }

  return "Δεν έγινε σύνδεση. Έλεγξε τα στοιχεία και δοκίμασε ξανά.";
}

export function Login() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [navigate, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !email.includes("@")) {
      setError("Δώσε έγκυρο email.");
      return;
    }

    if (password.length < 12) {
      setError("Το password πρέπει να έχει τουλάχιστον 12 χαρακτήρες.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let signInError: Error | null = null;
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      signInError = result.error;
    } catch (err) {
      signInError = err instanceof Error ? err : new Error(String(err));
    }

    setSubmitting(false);

    if (signInError) {
      console.error("Failed to sign in with password:", signInError);
      setError(authErrorMessage(signInError.message));
      return;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="relative w-full max-w-sm space-y-6">
        {/* Decorative diamond */}
        <div
          className="absolute bottom-8 right-8 text-gold opacity-10 text-6xl font-bold pointer-events-none select-none"
          aria-hidden
        >
          ◆
        </div>

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-charcoal text-gold-soft inline-flex items-center justify-center mb-4">
            <User className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div className="text-display">Rheo</div>
          <div className="text-body-lg text-text-secondary">Finance</div>
          <div className="text-caption mt-2 text-text-muted">
            Local-first finance for independent professionals
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="login-email">
              Email
            </label>
            <Input
              id="login-email"
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
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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
            <LockKeyhole className="w-4 h-4" strokeWidth={1.7} />
            {submitting ? "Σύνδεση…" : "Σύνδεση"}
          </button>

          <p className="text-caption text-center">
            Με ενεργό authenticator θα ζητηθεί 6ψήφιος κωδικός στο επόμενο βήμα.
          </p>
        </form>

        <div className="text-center text-caption mt-8 text-text-muted">
          v{APP_VERSION} · Tauri · Local SQLite
        </div>
      </div>
    </div>
  );
}
