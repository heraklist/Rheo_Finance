# Session 009 — VAT summary + Forecast (skeleton)

> Prerequisite: Sessions 007-008 done OR enough data σε system (~3 μήνες).

> ⚠️ **Skeleton only.** Full prompt at runtime.

---

## Σκοπός

Δύο analytical pages που δίνουν αξία στα δεδομένα: τι χρωστάμε ΦΠΑ + τι θα έχουμε επόμενο μήνα.

---

## Part A: VAT Summary (`/vat`)

### Σκοπός
Τριμηνιαία ανάλυση ΦΠΑ για τον λογιστή. Εύκολη απάντηση στο "πόσο ΦΠΑ θα πληρώσω;"

### Scope
- Year selector (default: τρέχον)
- 4 quarter cards σε 2x2 grid (mobile) / 4-σε-σειρά (desktop):
  - Q1 (Ιαν–Μαρ)
  - Q2 (Απρ–Ιουν)
  - Q3 (Ιουλ–Σεπ)
  - Q4 (Οκτ–Δεκ)
- Κάθε card:
  - Output VAT (από έσοδα)
  - Input VAT (από έξοδα)
  - Net VAT (πληρωτέο = output − input)
- Year total card με gold accent (highlighted)
- Drill-down: tap quarter → list των transactions της περιόδου (link to filtered TransactionsList)

### Key DB queries
```ts
// src/lib/analytics.ts
export async function getVatByQuarter(year: number, bookId?: string) {
  // Returns { quarter: 1|2|3|4, output: number, input: number, net: number }[]
}
```

### Edge cases
- Reduced VAT rates (13%, 6%, 0%) — separate columns ή combined;
- Refunds (αρνητικά amounts);
- Cross-quarter: αν transaction date είναι 31/3 ανήκει Q1, αν 1/4 ανήκει Q2;

---

## Part B: Forecast (`/forecast`)

### Σκοπός
12-month projection cashflow. "Τι θα έχω σε bank σε 60 μέρες;"

### Scope
- Year selector
- Line chart στο top: cumulative net (gold line σε project palette)
- Table: Month / Income / Expense / Net / Cumulative balance
- Sources of forecast:
  - **Recurring templates** (deterministic — υπολογίζονται exact)
  - **Past 3 months average** (για non-recurring categories — weighted moving average)
  - **Manual events** (Phase 4 — π.χ. "wedding catering July €2500")
- Note: "Βασίζεται σε X recurring + average Y past months. Πραγματικό αποτέλεσμα μπορεί να αποκλίνει."

### Key DB queries
```ts
export async function getForecast(opts: {
  bookId?: string;
  monthsAhead: number;
  basePeriodMonths: number;  // default 3
}) {
  // Returns ForecastMonth[]
}
```

### Edge cases
- Νέο business χωρίς past data → show prompt: "Χρειάζονται 3 μήνες historical data για forecast"
- Seasonal businesses (catering: heavy summer) → average δεν είναι ιδανικό. Future enhancement: median ή seasonal adjustment.
- Recurring με end_date → exclude από forecast μετά

---

## Expected effort: ~4-6 ώρες combined (μπορούν χωριστά sessions αν προτιμάμε)

---

## Manual test checklist

VAT:
- [ ] Insert test transactions με διάφορα VAT rates
- [ ] /vat → quarter cards εμφανίζουν σωστά totals
- [ ] Year total = sum of 4 quarters
- [ ] Drill-down σε Q1 → φιλτραρισμένη list

Forecast:
- [ ] /forecast → chart εμφανίζεται
- [ ] Επιβεβαίωση ότι recurring templates προστίθενται σωστά σε επόμενους μήνες
- [ ] Past month average δείχνει σωστά για non-recurring
- [ ] Cumulative balance: month_n = month_(n-1) + net_n

---

*Full prompt at runtime. Έντονη χρήση Recharts patterns από `IncomeExpenseChart`.*
