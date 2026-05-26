import { ArrowRight, FileDown, FolderKanban, ReceiptText, Repeat2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BOUNDARY_COPY =
  "Προσομοίωση, οργάνωση και εξαγωγή για έλεγχο. Δεν αποτελεί λογιστική, φορολογική υποβολή ή συμμόρφωση.";

interface QuickAddTile {
  title: string;
  desc: string;
  icon: React.ElementType;
  path: string;
}

const tiles: QuickAddTile[] = [
  {
    title: "Συναλλαγή",
    desc: "Καταχώριση εσόδου, εξόδου ή άλλης κίνησης.",
    icon: ReceiptText,
    path: "/add",
  },
  {
    title: "Πάγιο",
    desc: "Οργάνωση επαναλαμβανόμενης πληρωμής.",
    icon: Repeat2,
    path: "/recurring",
  },
  {
    title: "Στοιχείο πλάνου",
    desc: "Προσθήκη γραμμής σε σχέδιο ή σενάριο.",
    icon: FolderKanban,
    path: "/plans",
  },
  {
    title: "Export",
    desc: "Εξαγωγή αρχείου για προσωπικό έλεγχο.",
    icon: FileDown,
    path: "/settings",
  },
];

interface QuickAddDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddDrawer({ open, onClose }: QuickAddDrawerProps): React.JSX.Element | null {
  const navigate = useNavigate();

  if (!open) return null;

  function handleTileClick(path: string): void {
    navigate(path);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-charcoal/35"
        onClick={onClose}
        aria-label="Κλείσιμο"
      />

      {/* Drawer panel — bottom sheet on mobile, right panel on desktop */}
      <aside className="absolute bottom-0 left-0 right-0 rounded-t-lg border border-border-light bg-cream p-4 md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-full md:w-[390px] md:rounded-none md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border-light pb-4">
          <div>
            <p className="text-lg font-semibold">Γρήγορη προσθήκη</p>
            <p className="mt-1 text-sm text-text-secondary">Επιλέξτε τι θέλετε να προσθέσετε.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-light bg-sand p-2 text-text-secondary transition-colors hover:bg-border-light"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tile grid */}
        <div className="mt-4 grid gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.title}
                type="button"
                onClick={() => handleTileClick(tile.path)}
                className="group flex items-center gap-3 rounded-md border border-border-light bg-sand/70 p-3 text-left transition-colors hover:bg-sand"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border-light bg-cream text-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-text-primary">{tile.title}</span>
                  <span className="block text-sm text-text-secondary">{tile.desc}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>

        {/* Boundary copy */}
        <p className="mt-5 rounded-md border border-border-light bg-sand p-3 text-xs leading-relaxed text-text-secondary">
          {BOUNDARY_COPY}
        </p>
      </aside>
    </div>
  );
}
