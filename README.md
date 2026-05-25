# Rheo Finance

> Financial flow under control.
> Local-first finance management for independent professionals.

A desktop and Android app for freelancers, small businesses, creators, and
self-employed professionals to track income, expenses, receipts, VAT, and
cashflow — without heavy accounting software.

Tauri 2 + React + TypeScript + Tailwind + SQLite + Supabase.

---

## Quick start

### Prerequisites

- **Node.js 20+** και **pnpm** (`npm install -g pnpm`)
- **Rust toolchain** ([rustup.rs](https://rustup.rs))
- Για Android builds: **Android Studio** + Android SDK + NDK

### Setup

```bash
# 1. Install JS dependencies
pnpm install

# 2. Πρώτη φορά: setup shadcn/ui με τα δικά μας tokens
#    (Phase 2 — όταν χρειαστούμε form primitives)
# pnpm dlx shadcn-ui@latest init

# 3. Run desktop dev mode
pnpm tauri:dev
```

Το app θα ανοίξει σε ξεχωριστό native παράθυρο. Hot-reload δουλεύει για το frontend.

### Android dev (optional, αργότερα)

```bash
# Πρώτη φορά
pnpm tauri android init

# Connect Android device με USB debugging ON
pnpm tauri:android
```

### Build production

```bash
# Desktop installer (.msi/.dmg/.AppImage ανάλογα το OS)
pnpm tauri:build

# Android APK
pnpm tauri:android:build
```

Output σε `src-tauri/target/release/bundle/`.

---

## Architecture overview

```
┌──────────────────────────────────────────┐
│   React UI (src/)                        │
│   - Pages: Dashboard, Transactions CRUD  │
│   - Components: KPITile, TxRow, etc.     │
│   - Routing: react-router-dom            │
└────────────┬─────────────────────────────┘
             │ TypeScript queries
             ▼
┌──────────────────────────────────────────┐
│   src/lib/                               │
│   - db.ts: SQLite client                 │
│   - transactions.ts: CRUD                │
│   - reference.ts: books/accs/cats        │
│   - utils.ts: formatting, VAT compute    │
└────────────┬─────────────────────────────┘
             │ tauri-plugin-sql
             ▼
┌──────────────────────────────────────────┐
│   Local SQLite (managed by Tauri)        │
│   - schema in src-tauri/migrations/      │
│   - DB file in OS app data dir           │
└──────────────────────────────────────────┘

# Phase 2 (done):
- Supabase EU sync (outbox + LWW)
- Auth (email/password + TOTP MFA)
- Receipt photo upload + Supabase Storage
```

---

## Project structure

```
rheo-finance/
├── package.json                    # JS deps + scripts
├── tsconfig.json                   # TypeScript strict config
├── tailwind.config.ts              # Tokens mapped to Tailwind theme
├── vite.config.ts                  # Vite + Tauri integration
├── postcss.config.js
├── index.html                      # Entry HTML
│
├── src/                            # Frontend (React)
│   ├── main.tsx                    # React entry
│   ├── App.tsx                     # Router setup
│   ├── index.css                   # Design tokens + Tailwind
│   ├── components/
│   │   ├── ui/                     # Custom components (KPI, TxRow, SyncPill...)
│   │   ├── charts/                 # SVG chart components
│   │   └── layout/                 # AppLayout (header + FAB)
│   ├── pages/                      # Routed pages
│   │   ├── Dashboard.tsx           # Main KPIs + recent
│   │   ├── AddTransaction.tsx      # Form για νέες εγγραφές
│   │   ├── TransactionsList.tsx    # Full list grouped by date
│   │   ├── TransactionDetail.tsx   # Detail, edit, delete
│   │   └── Signup.tsx              # Account registration
│   ├── lib/                        # Business logic
│   │   ├── db.ts                   # SQLite client
│   │   ├── types.ts                # Entity types
│   │   ├── transactions.ts         # Transactions CRUD
│   │   ├── reference.ts            # Books/Accounts/Categories
│   │   └── utils.ts                # cn(), formatEuro(), VAT compute
│   └── hooks/                      # Custom React hooks (TBD)
│
└── src-tauri/                      # Rust backend (Tauri shell)
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── src/
    │   ├── main.rs                 # Bin entry
    │   └── lib.rs                  # Plugin setup + migrations
    └── migrations/
        ├── 0001_initial.sql        # Schema
        └── 0002_seed.sql           # Default books/accs/categories
```

---

## What's working in this starter

- ✅ Native Tauri desktop app launches
- ✅ SQLite database created on first run, migrations applied
- ✅ Default data seeded (books, accounts, all Greek categories)
- ✅ Dashboard renders KPI tiles + chart + recent transactions
- ✅ Add Transaction form με smart defaults, computes VAT auto
- ✅ Transactions list grouped by date
- ✅ Transactions search + filters (date range, category, amount range)
- ✅ Transaction detail με edit/delete
- ✅ shadcn/ui primitives installed for forms/sheets/popovers/calendar
- ✅ Supabase schema + RLS migration files
- ✅ Supabase email/password auth + TOTP MFA
- ✅ User registration (signup page)
- ✅ Protected app routes + Settings sign out
- ✅ Saves to local SQLite
- ✅ Greek copy throughout
- ✅ Brand identity applied (charcoal + gold + cream palette)
- ✅ Mobile-responsive layout (works on 375px+)
- ✅ Sync status pill in header (statically "synced" until Phase 2)

## Additional working features

- ✅ Supabase sync engine (outbox + LWW)
- ✅ Receipt photo upload + Supabase Storage
- ✅ Recurring templates management
- ✅ VAT quarterly summary
- ✅ 12-month forecast
- ✅ Settings (company, preferences, MFA, sync, backup, export, updater)
- ✅ Category CRUD with archive/restore
- ✅ Excel export (XLSX)
- ✅ Manual + auto-backup (JSON)
- ✅ Stronghold secure auth storage (desktop)
- ✅ GitHub private updater integration
- ✅ Plans & monthly coverage

---

## Development notes

### Adding a new screen

1. Create a new component in `src/pages/MyScreen.tsx`
2. Register the route in `src/App.tsx`
3. Update the brief description in this README's "What's working / stubbed" sections

### Adding a database query

1. Add function in `src/lib/transactions.ts` ή νέο `src/lib/<entity>.ts`
2. Use `getDb()` from `@/lib/db` to access SQLite
3. Define return types in `src/lib/types.ts`

### Modifying schema

1. Add new migration file in `src-tauri/migrations/0003_<description>.sql`
2. Register it in `src-tauri/src/lib.rs` `migrations` vec
3. App will auto-apply on next launch

### Brand assets

Design tokens live in two places (kept in sync):
- `tailwind.config.ts` — for utility classes
- `src/index.css` — as CSS variables (`var(--cream)` etc.)

To change a color: update both. Or remove duplication later by importing tokens from CSS into Tailwind via `var(...)`.

---

## Reference docs

- [Project Plan v1.1](./docs/Evochia_Finance_Project_Plan_v1.1.md) — full architecture (legacy filename, content valid)
- [Claude Design Brief](./docs/Claude_Design_Brief.md) — visual direction

---

## About

Rheo Finance is an independent local-first finance app for freelancers, small
businesses, and independent professionals. Built by Heraklis.

---

*Owner: Heraklis · Repository: heraklist/Rheo_Finance*
