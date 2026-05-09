import { AppLayout } from "@/components/layout/AppLayout";
import { AddTransaction } from "@/pages/AddTransaction";
import { Dashboard } from "@/pages/Dashboard";
import { Placeholder } from "@/pages/Placeholder";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "add", element: <AddTransaction /> },
      {
        path: "transactions",
        element: (
          <Placeholder
            title="Συναλλαγές"
            description="Λίστα όλων των συναλλαγών — υπό κατασκευή."
          />
        ),
      },
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
      {
        path: "settings",
        element: (
          <Placeholder title="Ρυθμίσεις" description="Προτιμήσεις & εξαγωγές — υπό κατασκευή." />
        ),
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
