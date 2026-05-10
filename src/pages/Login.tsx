import { BrandMark } from "@/components/ui/BrandMark";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export function Login() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !email.includes("@")) {
      setError("Δώσε έγκυρο email.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    setSubmitting(false);

    if (signInError) {
      console.error("Failed to send magic link:", signInError);
      setError("Δεν στάλθηκε το magic link. Δοκίμασε ξανά.");
      return;
    }

    setSent(true);
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

        {!sent ? (
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
                autoFocus
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
              className="w-full bg-charcoal text-text-on-dark rounded-md py-3 text-sm font-medium hover:bg-charcoal-soft disabled:opacity-50 transition-colors"
            >
              {submitting ? "Αποστολή…" : "Αποστολή magic link"}
            </button>

            <p className="text-caption text-center">Θα λάβεις email με σύνδεσμο για είσοδο.</p>
          </form>
        ) : (
          <div className="text-center space-y-3 py-8">
            <div className="text-h2">Έλεγξε το email σου</div>
            <p className="text-text-secondary">
              Στείλαμε σύνδεσμο εισόδου στο <strong>{email}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail("");
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-gold text-sm font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.7} />
              Άλλο email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
