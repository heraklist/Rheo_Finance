import { MfaChallenge } from "@/components/auth/MfaChallenge";
import { useAppStore } from "@/lib/store";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, authLoading, mfaLoading, mfaRequired } = useAppStore();

  if (authLoading || mfaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-text-muted">Φόρτωση…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (mfaRequired) return <MfaChallenge />;

  return <>{children}</>;
}
