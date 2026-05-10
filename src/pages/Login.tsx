import { BrandMark } from "@/components/ui/BrandMark";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInError) {
      console.error("Failed to sign in with password:", signInError);
      setError(authErrorMessage(signInError.message));
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex">
            <BrandMark />
          </div>
          <p className="text-text-muted mt-2">Διαχείριση οικονομικών</p>
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
              placeholder="example@evochia.gr"
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
      </div>
    </div>
  );
}
