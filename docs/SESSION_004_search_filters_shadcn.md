# Session 004 — Search + filters + shadcn setup

> Πρερequisite: Sessions 002 + 003 ολοκληρωμένα. CRUD loop δουλεύει σε desktop.

---

## Σκοπός

Κάνει το transactions list **πραγματικά usable** πέρα από τις πρώτες 50 εγγραφές. Παράλληλα στήνει shadcn/ui properly ώστε επόμενα screens (login, settings) να έχουν consistent primitives.

---

## Expected outputs

1. **shadcn/ui** initialized + 5 components installed (Input, Select, Sheet, Popover, Calendar)
2. **Search bar** στο `/transactions` με 250ms debounce
3. **Filter sheet** (slide-up): Date range, Book, Category, Amount range
4. **Updated `listTransactions`** με νέα params: `search`, `categoryId`, `minAmount`, `maxAmount`
5. **AddTransaction + TransactionForm** χρησιμοποιούν shadcn `Select` αντί native `<select>` (cascading καλύτερο UX)
6. Manual test: search + filter + edit, όλα δουλεύουν

---

## Prompt για Claude Code

````
Διάβασε CLAUDE.md, src/pages/TransactionsList.tsx, src/lib/transactions.ts.
Πες μία γραμμή τι κατάλαβες, μετά συνέχισε.

5 checkpoints. Stop on broken state.

═════════════════════════════════════════════════════════
CHECKPOINT 1: shadcn/ui setup
═════════════════════════════════════════════════════════

```bash
pnpm dlx shadcn@latest init
```

Όταν ρωτήσει:
- Style: **Default** (όχι New York)
- Base color: **Stone** (closest to charcoal/cream)
- CSS variables: **Yes**
- Tailwind config: `tailwind.config.ts` (auto-detect)
- Global CSS: `src/index.css`
- Components alias: `@/components`
- Utils alias: `@/lib/utils`

Αν προτείνει αλλαγή χρωμάτων στο tailwind.config.ts ή src/index.css, **ΟΧΙ — review πρώτα**. Τα δικά μας tokens είναι already there. Επιλέξε "skip" ή merge manually.

Πιθανότατα θα δημιουργήσει `components.json` στο root + προσθέσει shadcn deps. Επιβεβαίωσε:
- `tailwind.config.ts` ΔΕΝ έχασε τα δικά μας colors (charcoal, gold, cream, etc.)
- `src/index.css` ΔΕΝ έχασε τα design tokens
- Νέο `components.json` υπάρχει

Μετά:
```bash
pnpm dlx shadcn@latest add input select sheet popover calendar
```

Αυτά εγκαθιστούν 5 primitives σε `src/components/ui/` (νέα αρχεία).

`pnpm typecheck` πρέπει να μείνει 0 errors.

**Report:** components.json content, νέα αρχεία στο src/components/ui/

═════════════════════════════════════════════════════════
CHECKPOINT 2: Update listTransactions με filter params
═════════════════════════════════════════════════════════

Στο `src/lib/transactions.ts`, επέκτεινε το opts του listTransactions:

```ts
export async function listTransactions(opts: {
  bookId?: string;
  limit?: number;
  offset?: number;
  fromDate?: string;
  toDate?: string;
  // === ΝΕΑ ===
  search?: string;          // matches description, category_name, tag_name
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
} = {}): Promise<TransactionWithRelations[]> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts.bookId) { conditions.push("t.book_id = ?"); params.push(opts.bookId); }
  if (opts.fromDate) { conditions.push("t.date >= ?"); params.push(opts.fromDate); }
  if (opts.toDate) { conditions.push("t.date <= ?"); params.push(opts.toDate); }
  if (opts.categoryId) { conditions.push("t.category_id = ?"); params.push(opts.categoryId); }
  if (opts.minAmount !== undefined) { conditions.push("t.amount_gross >= ?"); params.push(opts.minAmount); }
  if (opts.maxAmount !== undefined) { conditions.push("t.amount_gross <= ?"); params.push(opts.maxAmount); }
  if (opts.search?.trim()) {
    const q = `%${opts.search.trim().toLowerCase()}%`;
    conditions.push(
      "(LOWER(t.description) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(tg.name) LIKE ?)"
    );
    params.push(q, q, q);
  }

  // [υπόλοιπο SQL ίδιο με πριν]
}
```

`pnpm typecheck` clean.

**Report:** confirmed signature update + SQL clauses.

═════════════════════════════════════════════════════════
CHECKPOINT 3: Search bar + debounce hook
═════════════════════════════════════════════════════════

A) Δημιούργησε `src/hooks/useDebounce.ts`:

```ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

B) Στο `src/pages/TransactionsList.tsx`:

- Import `Input` από `@/components/ui/input` και `Search` icon από lucide-react
- Πρόσθεσε state: `const [search, setSearch] = useState("")`
- Debounced: `const debouncedSearch = useDebounce(search, 250)`
- Πέρασε στο listTransactions: `{ bookId: currentBookId, limit: 200, search: debouncedSearch }`
- Πρόσθεσε useEffect dependency `debouncedSearch`
- Search bar στο top της σελίδας:

```tsx
<div className="mb-4 relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
  <Input
    type="text"
    placeholder="Αναζήτηση συναλλαγών…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="pl-9"
  />
</div>
```

- Αν `debouncedSearch && txs.length === 0 && !loading`, εμφάνισε no-results state αντί empty state.

**Report:** search functionality test (πληκτρολόγησε "test", ψάχνει σωστά).

═════════════════════════════════════════════════════════
CHECKPOINT 4: Filter sheet (slide-up panel)
═════════════════════════════════════════════════════════

Filter sheet περιέχει: Date range (from/to), Category, Amount range.

A) Στο `src/pages/TransactionsList.tsx`:

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";

// Filter state
const [filters, setFilters] = useState<{
  fromDate?: string;
  toDate?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
}>({});

// Active filter count
const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== "").length;
```

B) Κουμπί filter δίπλα στο search:

```tsx
<Sheet>
  <SheetTrigger asChild>
    <button className="relative p-2 rounded-md border border-border-light hover:bg-sand">
      <Filter className="w-4 h-4" />
      {activeFilterCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-charcoal text-cream text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </button>
  </SheetTrigger>
  <SheetContent side="bottom" className="bg-cream max-h-[80vh] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Φίλτρα</SheetTitle>
    </SheetHeader>
    <div className="space-y-5 mt-4">
      {/* Date range */}
      <div>
        <label className="form-label">Από ημερομηνία</label>
        <Input type="date" value={filters.fromDate ?? ""}
          onChange={(e) => setFilters({...filters, fromDate: e.target.value || undefined})} />
      </div>
      <div>
        <label className="form-label">Έως ημερομηνία</label>
        <Input type="date" value={filters.toDate ?? ""}
          onChange={(e) => setFilters({...filters, toDate: e.target.value || undefined})} />
      </div>

      {/* Category */}
      <div>
        <label className="form-label">Κατηγορία</label>
        <Select value={filters.categoryId ?? ""}
          onValueChange={(v) => setFilters({...filters, categoryId: v || undefined})}>
          <SelectTrigger><SelectValue placeholder="— Όλες —" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Όλες —</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Ελάχιστο €</label>
          <Input type="number" step="0.01" value={filters.minAmount ?? ""}
            onChange={(e) => setFilters({...filters, minAmount: e.target.value ? parseFloat(e.target.value) : undefined})} />
        </div>
        <div>
          <label className="form-label">Μέγιστο €</label>
          <Input type="number" step="0.01" value={filters.maxAmount ?? ""}
            onChange={(e) => setFilters({...filters, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined})} />
        </div>
      </div>

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <button onClick={() => setFilters({})}
          className="w-full text-expense text-sm py-2 border border-expense rounded-md hover:bg-expense-light/30">
          Καθαρισμός φίλτρων
        </button>
      )}
    </div>
  </SheetContent>
</Sheet>
```

C) Επέκτεινε useEffect dependency: `[currentBookId, debouncedSearch, filters]`. Στο listTransactions call: spread `...filters`.

D) Φόρτωσε categories για το filter dropdown (νέο useEffect):
```tsx
const [categories, setCategories] = useState<Category[]>([]);
useEffect(() => {
  void listCategories({ bookId: currentBookId }).then(setCategories);
}, [currentBookId]);
```

**Report:** filter sheet ανοίγει, badge δείχνει count, results φιλτράρονται.

═════════════════════════════════════════════════════════
CHECKPOINT 5: Replace native selects σε TransactionForm
═════════════════════════════════════════════════════════

Στο `src/components/forms/TransactionForm.tsx`, αντικατάστησε τα 3 native `<select>`
με shadcn Select:
- Κατηγορία
- Λογαριασμός
- Τρόπος Πληρωμής

Pattern:
```tsx
<Select value={categoryId} onValueChange={setCategoryId}>
  <SelectTrigger><SelectValue placeholder="— Επίλεξε —" /></SelectTrigger>
  <SelectContent>
    {categories.map(c => (
      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Test που πρέπει να δουλεύουν:
- Add transaction → επέλεξε category από dropdown → save (λύνει cascading dropdown UX)
- Edit transaction → preset value εμφανίζεται σωστά
- Cancel/Save κουμπιά παραμένουν

═════════════════════════════════════════════════════════
FINAL: Manual test + commit + push
═════════════════════════════════════════════════════════

Manual checks:
1. Καταχώρησε 5 test transactions με διαφορετικές categories/amounts
2. Search "test" → φιλτράρει
3. Filter by date range → working
4. Filter by category → working
5. Filter by amount range → working
6. Clear filters → επιστρέφει σε full list
7. Edit transaction με shadcn selects → values pre-fill σωστά

```bash
git add -A
git commit -m "feat(transactions): search + filters + shadcn UI primitives

- Setup shadcn/ui (Input, Select, Sheet, Popover, Calendar)
- Add useDebounce hook
- Add search bar in transactions list (250ms debounce)
- Add filter sheet (date range, category, amount range)
- Extend listTransactions with search/categoryId/min/maxAmount params
- Replace native selects in TransactionForm with shadcn Select for better UX

Phase 1 P0 complete — transactions list now usable at scale."
git push
```

**Report final:** test results + commit hash.
````
