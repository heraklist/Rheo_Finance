import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSyncWorker } from "@/hooks/useSyncWorker";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { AddTransaction } from "@/pages/AddTransaction";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { Placeholder } from "@/pages/Placeholder";
import { Settings } from "@/pages/Settings";
import { TransactionDetail } from "@/pages/TransactionDetail";
import { TransactionsList } from "@/pages/TransactionsList";
import { useEffect } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "add", element: <AddTransaction /> },
      { path: "transactions", element: <TransactionsList /> },
      { path: "transactions/:id", element: <TransactionDetail /> },
      {
        path: "recurring",
        element: (
          <Placeholder
            title="Πάγια έσοδα/έξοδα"
            description="Recurring templates — υπό κατασκευή."
          />
        ),
      },
      {
        path: "vat",
        element: (
          <Placeholder title="Σύνοψη ΦΠΑ" description="Τριμηνιαία ανάλυση — υπό κατασκευή." />
        ),
      },
      {
        path: "forecast",
        element: <Placeholder title="Forecast" description="Προβολή 12 μηνών — υπό κατασκευή." />,
      },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

export function App() {
  const { setAuth, setAuthLoading, setMfaStatus } = useAppStore();
  useSyncWorker();

  useEffect(() => {
    let cancelled = false;

    async function updateMfaStatus(hasSession: boolean) {
      if (!hasSession) {
        setMfaStatus(false, false);
        return;
      }

      setMfaStatus(false, true);
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (cancelled) return;

      if (error) {
        console.error("Failed to check MFA status:", error);
        setMfaStatus(false, false);
        return;
      }

      setMfaStatus(data.nextLevel === "aal2" && data.currentLevel !== "aal2", false);
    }

    async function applySession(
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
    ) {
      setAuth(session?.user ?? null, session);
      await updateMfaStatus(Boolean(session));
    }

    async function initializeAuth() {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        console.error("Failed to initialize auth:", error);
        setAuth(null, null);
        setMfaStatus(false, false);
        return;
      }

      await applySession(data.session);
    }

    void initializeAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setAuth, setAuthLoading, setMfaStatus]);

  return <RouterProvider router={router} />;
}
