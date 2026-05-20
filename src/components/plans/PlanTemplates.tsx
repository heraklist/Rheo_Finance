import { PLAN_TEMPLATES } from "@/lib/plans";
import type { PlanType } from "@/lib/types";
import { Briefcase, CreditCard, Plane, Plus, ShieldCheck, Wallet } from "lucide-react";

const ICONS = {
  purchase: Wallet,
  travel: Plane,
  project: Briefcase,
  emergency: ShieldCheck,
  debt: CreditCard,
  custom: Plus,
} satisfies Record<PlanType, typeof Plus>;

interface PlanTemplatesProps {
  onCreate: (type: PlanType, name: string) => void;
  disabled?: boolean;
}

export function PlanTemplates({ onCreate, disabled = false }: PlanTemplatesProps) {
  return (
    <section className="rounded-md border border-border-light bg-cream p-4">
      <div className="mb-3">
        <p className="text-label uppercase text-text-muted">Πρότυπα</p>
        <h2 className="mt-1 text-h3 text-text-primary">Δημιουργία από πρότυπο</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PLAN_TEMPLATES.map((template) => {
          const Icon = ICONS[template.type];
          return (
            <button
              key={template.type}
              type="button"
              disabled={disabled}
              onClick={() => onCreate(template.type, template.label)}
              className="flex min-h-[78px] items-start gap-3 rounded-md border border-border-light bg-sand/60 p-3 text-left transition-colors hover:bg-sand disabled:opacity-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-light bg-cream text-gold">
                <Icon className="h-4 w-4" strokeWidth={1.7} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-primary">
                  {template.label}
                </span>
                <span className="mt-1 block text-caption text-text-muted">
                  {template.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
