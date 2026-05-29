import { lazy, Suspense, useEffect } from "react";
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
// Critical path — eagerly loaded
import { AddTransaction } from "@/pages/AddTransaction";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";
import { TransactionsList } from "@/pages/TransactionsList";

// Lazy-loaded routes
const CategorySettings = lazy(() =>
  import("@/pages/CategorySettings").then((m) => ({ default: m.CategorySettings })),
);
const Forecast = lazy(() => import("@/pages/Forecast").then((m) => ({ default: m.Forecast })));
const MonthlyCoverage = lazy(() =>
  import("@/pages/MonthlyCoverage").then((m) => ({ default: m.MonthlyCoverage })),
);
const PlanBuilder = lazy(() =>
  import("@/pages/PlanBuilder").then((m) => ({ default: m.PlanBuilder })),
);
const PlanHub = lazy(() => import("@/pages/PlanHub").then((m) => ({ default: m.PlanHub })));
const Recurring = lazy(() => import("@/pages/Recurring").then((m) => ({ default: m.Recurring })));
const ReviewQueue = lazy(() =>
  import("@/pages/ReviewQueue").then((m) => ({ default: m.ReviewQueue })),
);
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const TransactionDetail = lazy(() =>
  import("@/pages/TransactionDetail").then((m) => ({ default: m.TransactionDetail })),
);
const VatSummary = lazy(() =>
  import("@/pages/VatSummary").then((m) => ({ default: m.VatSummary })),
);

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-24 animate-shimmer rounded bg-sand" />
    </div>
  );
}

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
      {
        path: "transactions/:id",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <TransactionDetail />
          </Suspense>
        ),
      },
      {
        path: "recurring",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <Recurring />
          </Suspense>
        ),
      },
      {
        path: "vat",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <VatSummary />
          </Suspense>
        ),
      },
      {
        path: "forecast",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <Forecast />
          </Suspense>
        ),
      },
      {
        path: "plans",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <PlanHub />
          </Suspense>
        ),
      },
      {
        path: "plans/:id",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <PlanBuilder />
          </Suspense>
        ),
      },
      {
        path: "coverage",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <MonthlyCoverage />
          </Suspense>
        ),
      },
      {
        path: "review",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <ReviewQueue />
          </Suspense>
        ),
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <Settings />
          </Suspense>
        ),
      },
      {
        path: "settings/categories/:type",
        element: (
          <Suspense fallback={<LazyFallback />}>
            <CategorySettings />
          </Suspense>
        ),
      },
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
