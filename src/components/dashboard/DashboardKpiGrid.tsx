import { KPITile } from "@/components/ui/KPITile";

interface DashboardKpiGridProps {
  empty: boolean;
  loading: boolean;
  showVat: boolean;
  totals: {
    income: number;
    expense: number;
    net: number;
    vat_net: number;
  } | null;
}

export function DashboardKpiGrid({ empty, loading, showVat, totals }: DashboardKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-6">
      <KPITile
        label="Έσοδα"
        value={totals?.income}
        accent="income"
        loading={loading}
        empty={empty}
      />
      <KPITile
        label="Έξοδα"
        value={totals?.expense}
        accent="expense"
        loading={loading}
        empty={empty}
      />
      <KPITile label="Καθαρό" value={totals?.net} sand loading={loading} empty={empty} />
      {showVat ? (
        <KPITile
          label="ΦΠΑ Πληρωτέο"
          value={totals?.vat_net}
          sand
          loading={loading}
          empty={empty}
        />
      ) : null}
    </div>
  );
}
