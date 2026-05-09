# Session 008 — Recurring templates (skeleton)

> Prerequisite: Session 007 OR direct after 006 (receipt photos independent).

> ⚠️ **Skeleton only.** Full prompt at runtime.

---

## Σκοπός

UI για δημιουργία/διαχείριση επαναλαμβανόμενων εγγραφών (πάγια έσοδα/έξοδα) + αυτόματη γέννησή τους όταν φτάνει το next_due. Λύνει το core pain point: ο Heraklis δεν χρειάζεται να καταχωρεί manually κάθε μήνα ΔΕΗ/ΕΥΔΑΠ/ενοίκιο/ΕΦΚΑ.

---

## Scope

1. **`/recurring` page** — list των active templates
   - Toggle switch (active/inactive)
   - Display: description, frequency, next_due, amount
   - Tap → edit form

2. **Recurring form** (create + edit)
   - Reuse `TransactionForm` components όπου possible
   - Επιπλέον fields: frequency (segmented monthly/weekly/quarterly/yearly), day_of_period, start_date, end_date (optional)
   - Νέο `src/lib/recurring.ts` με CRUD helpers (mirror του transactions.ts)

3. **Auto-generation logic**
   - Στο app startup: query `recurring_templates WHERE active=true AND next_due <= today`
   - Για κάθε due template: `INSERT into transactions` με ίδια values + `recurring_template_id`
   - Update `last_generated`, recompute `next_due` (generated column ίδια με project plan)
   - Hook: `useRecurringWorker` σε App.tsx, runs once per day max (track με sync_metadata)

4. **TransactionsList enhancement**
   - Show small icon σε rows που είναι από recurring template
   - Filter: "Show generated only" toggle (optional)

5. **Edge Function backup** (Phase 2.5 — optional)
   - Daily cron σε Supabase Edge Function για users που δεν άνοιξαν app για >24h
   - Generates missing recurring entries server-side
   - **Skip σε αυτό το session — Phase 4 polish**

---

## Key decisions στο runtime

- **Generation timing**: μόνο on app launch ή κάθε X ώρες με setInterval;
- **Duplicate prevention**: αν ο user γεννήσει manually τη μέρα που γεννάται auto → conflict
- **Editing**: αν αλλάξει amount template μετά από generations, επηρεάζει past entries; **ΟΧΙ — only future**
- **Pause vs delete**: active=false vs DELETE — προτείνεται toggle για ευκολη επανενεργοποίηση

---

## Sample recurring templates (που θα φτιάξει ο Heraklis)

- ΔΕΗ μηνιαία
- ΕΥΔΑΠ μηνιαία
- Internet/Τηλεφωνία μηνιαία
- Ενοίκια μηνιαία
- ΕΦΚΑ διμηνιαία (custom frequency: every 2 months — handled με day_of_period + bi-monthly logic)
- Λογιστής τριμηνιαία
- Συνδρομές διάφορες (Microsoft 365, εργαλεία)

---

## Expected effort: ~6-8 ώρες

---

## Manual test checklist

- [ ] Δημιουργία template "ΔΕΗ μηνιαία 168€"
- [ ] Set start_date σε εβδομάδα πριν → επανεκκίνηση app → εμφανίζεται 1 generated
- [ ] Επιβεβαίωση σε Dashboard recent + Transactions list
- [ ] Toggle off → επόμενη μέρα δεν generate-άρει νέα
- [ ] Edit amount → νέο template, παλιά transactions αμετάβλητα
- [ ] Delete template → transactions remain, foreign key → SET NULL

---

*Full prompt at runtime. Refer to project plan v1.1 Section 5 (recurring_templates schema) + Section 6 (sync για new entity type).*
