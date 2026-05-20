import { ArrowLeft, ArrowRight } from "lucide-react";

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("el-GR", { month: "long", year: "numeric" }).format(date);
}

interface MonthNavigatorProps {
  date: Date;
  onPrevious: () => void;
  onNext: () => void;
}

export function MonthNavigator({ date, onPrevious, onNext }: MonthNavigatorProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-light pb-4">
      <button
        type="button"
        onClick={onPrevious}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-text-secondary hover:bg-sand"
        aria-label="Προηγούμενος μήνας"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
      </button>
      <div className="min-w-0 text-center">
        <h1 className="text-h2 capitalize text-text-primary">{monthLabel(date)}</h1>
        <p className="text-caption text-text-muted">Κάλυψη εξόδων μήνα</p>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-text-secondary hover:bg-sand"
        aria-label="Επόμενος μήνας"
      >
        <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
      </button>
    </div>
  );
}
