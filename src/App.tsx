import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useAutoBackupWorker } from "@/hooks/useAutoBackupWorker";
import { useBookInit } from "@/hooks/useBookInit";
import { useRecurringWorker } from "@/hooks/useRecurringWorker";
import { useSyncWorker } from "@/hooks/useSyncWorker";
import { useAppStore } from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";
import { AddTransaction } from "@/pages/AddTransaction";
import { CategorySettings } from "@/pages/CategorySettings";
import { Dashboard } from "@/pages/Dashboard";
import { Forecast } from "@/pages/Forecast";
import { Login } from "@/pages/Login";
import { MonthlyCoverage } from "@/pages/MonthlyCoverage";
import { PlanBuilder } from "@/pages/PlanBuilder";
import { PlanHub } from "@/pages/PlanHub";
import { Recurring } from "@/pages/Recurring";
import { ReviewQueue } from "@/pages/ReviewQueue";
import { Settings } from "@/pages/Settings";
import { Signup } from "@/pages/Signup";
import { TransactionDetail } from "@/pages/TransactionDetail";
import { TransactionsList } from "@/pages/TransactionsList";
import { VatSummary } from "@/pages/VatSummary";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
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
      { path: "recurring", element: <Recurring /> },
      { path: "vat", element: <VatSummary /> },
      { path: "forecast", element: <Forecast /> },
      { path: "plans", element: <PlanHub /> },
      { path: "plans/:id", element: <PlanBuilder /> },
      { path: "coverage", element: <MonthlyCoverage /> },
      { path: "review", element: <ReviewQueue /> },
      { path: "settings", element: <Settings /> },
      { path: "settings/categories/:type", element: <CategorySettings /> },
    ],
  },
]);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function App() {
  const { setAuth, setAuthLoading, setMfaStatus } = useAppStore();
  const user = useAppStore((state) => state.user);
  const booksReady = useBookInit(Boolean(user));
  useAutoBackupWorker();
  useRecurringWorker();
  useSyncWorker();

  useEffect(() => {
    let cancelled = false;
    let initialized = false;

    if (!isSupabaseConfigured()) {
      setAuth(null, null);
      setMfaStatus(false, false);
      setAuthLoading(false);
      return;
    }

    async function updateMfaStatus(hasSession: boolean) {
      if (!hasSession) {
        setMfaStatus(false, false);
        return;
      }

      setMfaStatus(false, true);
      let result: Awaited<ReturnType<typeof supabase.auth.mfa.getAuthenticatorAssuranceLevel>>;
      try {
        result = await withTimeout(
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          5000,
          "MFA status check timed out",
        );
      } catch (err) {
        console.error("Failed to check MFA status:", err);
        if (!cancelled) setMfaStatus(false, false);
        return;
      }

      const { data, error } = result;

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
      try {
        const { data, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          console.error("Failed to initialize auth:", error);
          setAuth(null, null);
          setMfaStatus(false, false);
          return;
        }

        await applySession(data.session);
      } catch (err) {
        console.error("Failed to initialize auth:", err);
        if (!cancelled) {
          setAuth(null, null);
          setMfaStatus(false, false);
        }
      } finally {
        if (!cancelled) {
          initialized = true;
          setAuthLoading(false);
        }
      }
    }

    void initializeAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (!initialized) return;
      if (!session && event !== "SIGNED_OUT") {
        showToast("Η συνεδρία σας έληξε. Συνδεθείτε ξανά.", "warning", 8000);
      }
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setAuth, setAuthLoading, setMfaStatus]);

  if (user && !booksReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-10 w-32 rounded-md bg-sand" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastContainer />
    </ErrorBoundary>
  );
}
