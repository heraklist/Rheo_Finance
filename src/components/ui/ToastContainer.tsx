import type { ToastType } from "@/lib/toast";
import { useToastStore } from "@/lib/toast";

const ICON_MAP: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const STYLE_MAP: Record<ToastType, string> = {
  success: "bg-income/10 border-income text-income",
  error: "bg-expense/10 border-expense text-expense",
  warning: "bg-gold/10 border-gold text-charcoal",
  info: "bg-sand border-border-light text-charcoal",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg border text-sm shadow-sm animate-slide-up ${STYLE_MAP[toast.type]}`}
        >
          <span className="text-base leading-none">{ICON_MAP[toast.type]}</span>
          <span className="flex-1 text-charcoal">{toast.message}</span>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-charcoal-light hover:text-charcoal ml-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
