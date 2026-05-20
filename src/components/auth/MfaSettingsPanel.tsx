import { Input } from "@/components/ui/input";
import { useCompanyName } from "@/hooks/useCompanyName";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface EnrollmentState {
  factorId: string;
  qrCode: string;
  secret: string;
}

function qrCodeSource(qrCode: string): string {
  if (qrCode.startsWith("data:")) {
    return qrCode;
  }

  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`;
}

function mfaErrorMessage(message: string): string {
  if (message.includes("already exists") || message.includes("conflict")) {
    return "Υπάρχει ήδη authenticator με αυτό το όνομα.";
  }

  if (message.includes("verified")) {
    return "Πρέπει πρώτα να επιβεβαιώσεις τον authenticator κωδικό.";
  }

  if (message.includes("verification")) {
    return "Ο κωδικός δεν είναι σωστός. Δοκίμασε τον νέο 6ψήφιο κωδικό.";
  }

  return "Η ρύθμιση authenticator απέτυχε. Δοκίμασε ξανά.";
}

export function MfaSettingsPanel() {
  const { setAuth, setMfaStatus } = useAppStore();
  const companyName = useCompanyName();
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshFactors = useCallback(async () => {
    const factors = await supabase.auth.mfa.listFactors();

    if (factors.error) {
      console.error("Failed to load MFA factors:", factors.error);
      setError(mfaErrorMessage(factors.error.message));
      return;
    }

    setVerifiedCount(factors.data.totp.length);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await refreshFactors();
      } catch (err) {
        console.error("Failed to load MFA factors:", err);
        if (!cancelled) setError("Δεν φορτώθηκαν οι authenticator ρυθμίσεις. Δοκίμασε ξανά.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshFactors]);

  async function handleStartEnrollment() {
    if (busy) return;

    setBusy(true);
    setMessage("");
    setError("");

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: `${companyName} Finance`,
      friendlyName: `${companyName} Finance ${new Date().toISOString()}`,
    });

    setBusy(false);

    if (enrollError) {
      console.error("Failed to enroll MFA factor:", enrollError);
      setError(mfaErrorMessage(enrollError.message));
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setVerificationCode("");
    setMessage("Σκάναρε το QR με Microsoft Authenticator και γράψε τον 6ψήφιο κωδικό.");
  }

  async function handleVerifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enrollment || busy) return;

    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Δώσε τον 6ψήφιο κωδικό από το authenticator.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
    if (challenge.error) {
      setBusy(false);
      console.error("Failed to create MFA challenge:", challenge.error);
      setError(mfaErrorMessage(challenge.error.message));
      return;
    }

    const verification = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: challenge.data.id,
      code,
    });

    setBusy(false);

    if (verification.error) {
      console.error("Failed to verify MFA enrollment:", verification.error);
      setError(mfaErrorMessage(verification.error.message));
      return;
    }

    const { data } = await supabase.auth.getSession();
    setAuth(data.session?.user ?? null, data.session);
    setMfaStatus(false, false);
    setEnrollment(null);
    setVerificationCode("");
    setMessage("Ο authenticator ενεργοποιήθηκε.");
    await refreshFactors();
  }

  async function handleUnenroll() {
    if (busy) return;

    setBusy(true);
    setMessage("");
    setError("");

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setBusy(false);
      console.error("Failed to list MFA factors:", factors.error);
      setError(mfaErrorMessage(factors.error.message));
      return;
    }

    const factor = factors.data.totp[0];
    if (!factor) {
      setBusy(false);
      setVerifiedCount(0);
      return;
    }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);

    if (unenrollError) {
      console.error("Failed to unenroll MFA factor:", unenrollError);
      setError(mfaErrorMessage(unenrollError.message));
      return;
    }

    setVerifiedCount(0);
    setMessage("Ο authenticator απενεργοποιήθηκε.");
  }

  return (
    <section className="bg-cream border border-border-light rounded-md p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-h3 mb-1">Authenticator</h2>
          <p className="text-text-muted text-sm">Password login με 6ψήφιο κωδικό TOTP.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted">
          <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />
          {loading ? "Έλεγχος…" : verifiedCount > 0 ? "Ενεργό" : "Ανενεργό"}
        </div>
      </div>

      {enrollment ? (
        <form className="space-y-4" onSubmit={handleVerifyEnrollment}>
          <div className="flex justify-center">
            <img
              src={qrCodeSource(enrollment.qrCode)}
              alt="QR code για authenticator"
              className="w-44 h-44 border border-border-light rounded-md bg-white p-2"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="mfa-secret">
              Secret
            </label>
            <Input
              id="mfa-secret"
              type="text"
              value={enrollment.secret}
              readOnly
              className="bg-sand border-border-light font-mono text-xs"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="mfa-enrollment-code">
              Κωδικός
            </label>
            <Input
              id="mfa-enrollment-code"
              type="text"
              inputMode="numeric"
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              autoComplete="one-time-code"
              className="bg-cream border-border-light text-center"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:underline disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />
              {busy ? "Έλεγχος…" : "Ενεργοποίηση"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEnrollment(null);
                setVerificationCode("");
                setError("");
                setMessage("");
              }}
              className="text-text-muted text-sm font-medium hover:underline disabled:opacity-50"
            >
              Ακύρωση
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleStartEnrollment}
            disabled={busy}
            className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:underline disabled:opacity-50"
          >
            <ShieldPlus className="w-4 h-4" strokeWidth={1.7} />
            {verifiedCount > 0 ? "Νέος authenticator" : "Σύνδεση authenticator"}
          </button>

          {verifiedCount > 0 ? (
            <button
              type="button"
              onClick={handleUnenroll}
              disabled={busy}
              className="inline-flex items-center gap-2 text-expense text-sm font-medium hover:underline disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.7} />
              Απενεργοποίηση
            </button>
          ) : null}
        </div>
      )}

      {message ? <p className="text-caption mt-3">{message}</p> : null}
      {error ? (
        <p className="text-expense text-sm mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
