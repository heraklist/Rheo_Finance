import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
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
  const { setAuth, setAuthLoading } = useAppStore();

  useEffect(() => {
    let cancelled = false;

    async function initializeAuth() {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        console.error("Failed to initialize auth:", error);
        setAuth(null, null);
        return;
      }

      setAuth(data.session?.user ?? null, data.session);
    }

    void initializeAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setAuth, setAuthLoading]);

  return <RouterProvider router={router} />;
}
