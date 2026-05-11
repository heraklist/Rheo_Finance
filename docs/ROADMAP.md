# Roadmap — Evochia Finance

> Master index για την υπόλοιπη πορεία του project. Ενημερώνεται μετά από κάθε session.

---

## Status snapshot

| Session | Σκοπός | Status |
|---|---|---|
| Day 1 | Initial scaffolding | ✅ Done |
| 001 (Audit) | Έλεγχος Day 1 baseline | ✅ Done — `docs/AUDIT-2026-05-08.md` |
| 002 | Git init + bug fixes + biome + verify run | ⏳ Pending |
| 003 | Transactions CRUD completion | ✅ Done — `817b028` |
| 004 | Search + filters + shadcn polish | ✅ Done — `6c91886` |
| 005 | Supabase setup + auth | ✅ Done — `3bd500e` |
| 006 | Sync engine | ✅ Done — password + TOTP, outbox sync |
| 007 | Receipt photos | ✅ Done — local picker + storage sync |
| 008 | Recurring templates | ✅ Done — CRUD + auto-generation |
| 009 | VAT summary + Forecast | ✅ Done — VAT drill-down + 12-month cashflow |
| 010 | Settings + Excel export + production polish | ✅ Done — settings, export, backup, CSP |
| 011 | Android port + sideload | 📋 Skeleton |

**Legend:** ✅ Complete · ⏳ Pending detailed prompt · 📋 Skeleton (full prompt γράφεται when we get there)

---

## Sequence με prerequisites

```
SESSION_002 (init + fixes)
    ↓ requires: clean tauri:dev run
SESSION_003 (CRUD completion)
    ↓ requires: working transactions UI
SESSION_004 (search + filters + shadcn)
    ↓ requires: usable transactions list
SESSION_005 (Supabase auth)
    ↓ requires: Heraklis provides Supabase URL + anon key
SESSION_006 (sync engine)
    ↓ requires: working auth + first cloud sync
SESSION_007 (receipt photos)
    ↓ requires: sync working
SESSION_008 (recurring templates)
    ↓ independent of 007 — can swap
SESSION_009 (VAT + Forecast)
    ↓ requires: enough data to compute
SESSION_010 (Settings + Excel export + polish)
    ↓ requires: most features working
SESSION_011 (Android port)
    ↓ requires: stable desktop app
```

---

## Decision points

Σημεία όπου χρειάζεται input από Heraklis πριν προχωρήσει το επόμενο session:

| Μετά από | Decision | Default αν δεν αποφασιστεί |
|---|---|---|
| 002 | App boots cleanly; | Διορθωτικό session αν όχι |
| 003 | CRUD loop solid; | Επιστροφή σε refactor αν έχει bugs |
| 004 | Πάμε direct σε Supabase ή restart με review; | Direct σε 005 |
| 005 | Supabase project έτοιμο; | Αναβολή 005 μέχρι credentials |
| 006 | Cross-device test working; | Διόρθωση σε χωριστό session |
| 007 | Photo storage working με sync; | Skip σε 008 αν θέλει quick win |
| 008-009 | Σειρά εκτέλεσης (μπορούν swap) | 008 → 009 default |
| 010 | Production build για Windows έτοιμο; | Continue σε 011 αν όχι blocker |
| 011 | First Android sideload επιτυχής; | Εφαρμογή ζωντανή για double-device use |

---

## Estimated effort

| Session | Hours | Cumulative |
|---|---|---|
| 002 | 2-3 | 2-3 |
| 003 | 4-6 | 6-9 |
| 004 | 4-5 | 10-14 |
| 005 | 6-8 | 16-22 |
| 006 | 8-10 | 24-32 |
| 007 | 4-6 | 28-38 |
| 008 | 6-8 | 34-46 |
| 009 | 4-6 | 38-52 |
| 010 | 6-8 | 44-60 |
| 011 | 4-8 | 48-68 |

**Total: ~50-70 ώρες** για πλήρες feature set + Android. Match-άρει το original estimate (100-150h ένδοσης που είχαμε στο plan v1.1 είχε buffer για debug/iteration).

---

## Πώς να χρησιμοποιήσεις το roadmap

### Στην αρχή κάθε session
1. Άνοιξε το `SESSION_NNN_*.md` για το session που τρέχεις
2. Επιβεβαίωσε ότι τα prerequisites έχουν ικανοποιηθεί (πάνω σε κάθε prompt)
3. Δώσε το copy-paste block στο Claude Code
4. Περίμενε checkpoints, διάβασε τη σύνοψη

### Στο τέλος κάθε session
1. Στείλε μου εδώ στο chat το final report
2. Ενημερώνω αυτό το ROADMAP.md (status table)
3. Εάν χρειάζεται διορθωτικό session, γράφεται before επόμενο
4. Εάν επόμενο είναι skeleton (007+), γράφω full prompt με βάση actual state

### Όταν άλλαξε state
- Νέα audit μετά από κάθε 2-3 sessions για να ελέγξουμε ότι δεν έχουμε drift
- Audit prompt είναι reusable: `docs/AUDIT_PROMPT.md`

---

## Σημαντικές παρατηρήσεις

**Skeletons (007-011) είναι σκόπιμα όχι λεπτομερή.** Αυτό είναι καλύτερο γιατί:
1. Real implementation εξαρτάται από state όταν τα φτάσουμε
2. Λεπτομερείς prompts γραμμένοι σήμερα θα είναι stale σε 4-6 sessions
3. Καθένα έχει goal + scope + key decisions, αρκετά για roadmap visibility
4. Ο agent γράφει calling code με βάση patterns από προηγούμενα sessions

**Δεν είναι waterfall.** Η σειρά είναι suggested, όχι rigid. Αν Heraklis χρειαστεί π.χ. recurring templates earlier για business reasons, μπορούμε swap. Decision points παραπάνω επισημαίνουν κρίσιμα joints.

**Continuous deployment παραμένει.** Μετά από κάθε session που δουλεύει στο desktop, ο Heraklis χρησιμοποιεί πραγματικά την εφαρμογή. Δεν περιμένουμε "to ship at the end".

---

## Επόμενο action για τον Heraklis

1. **Τώρα:** Δίνεις `SESSION_002_init_and_fixes.md` στο Claude Code
2. **Όταν τελειώσει:** Στείλεις final report εδώ
3. **Από εκεί:** Ή προχωράμε σε 003, ή κάνουμε διορθωτικό αν 002 έσπασε

Όλα τα session prompts (002, 003, και τα skeletons 004+) είναι έτοιμα στο `/docs/` του project (ή στο /mnt/user-data/outputs αν δεν τα έχεις ακόμα μεταφέρει).
