# Evochia Finance — Design Brief για Claude Design

> **Σκοπός:** Αυτό το brief είναι input για το Claude Design. Στόχος: να παράξει visual prototypes (HTML/CSS/JS) που θα χρησιμεύσουν ως design reference για την Tauri implementation.

> **Audience:** Claude Design (AI design tool)
> **Output expected:** Interactive prototypes των key screens με σωστή brand expression

---

## 1. Project North Star

**Build:** Native desktop + Android app για διαχείριση οικονομικών ενός ελεύθερου επαγγελματία στον χώρο της εστίασης.

**For:** Heraklis, founder και executive chef του **Evochia** — premium private chef + event catering brand στην Αθήνα. Specializes σε Mediterranean + Nikkei/Asian Fusion cuisine. Operates ως ελεύθερος επαγγελματίας με σύμβαση έργου arrangements.

**Core value:** Καταχώρηση μιας οικονομικής συναλλαγής σε <30 δευτερόλεπτα, από κινητό ή υπολογιστή, ακόμα και offline. Μηδενικό friction. Premium feel αντάξιο του brand.

**Tone:** Όπως ένα fine-dining menu — clean, intentional, refined. **Όχι όπως ένα corporate accounting tool.**

---

## 2. The Brand: Evochia

### Brand essence

**Evochia** = Greek word evoking abundance, generosity, hospitality. The brand stands at the intersection of:
- **Mediterranean tradition** (rooted, warm, soulful)
- **Modern Asian fusion / Nikkei** (refined, precise, contemporary)
- **Hospitality industry premium tier** (concierge service, attention to detail)

### Brand personality

- Confident, not loud
- Warm, not casual
- Precise, not clinical
- Earthy, not rustic

### What it is NOT

- ❌ Tech startup vibes (no neon, no gradients, no "AI slop")
- ❌ Corporate finance (no navy blue, no Times New Roman)
- ❌ Mass-market consumer (no playful illustrations, no confetti)
- ❌ Generic SaaS dashboard (no chartjunk, no "Welcome back, [Name]!")

### What it IS

- ✅ Quiet luxury — like a leather-bound notebook, not a chrome gadget
- ✅ Confident negative space — content breathes
- ✅ Considered typography — purposeful hierarchy
- ✅ Mediterranean warmth in the palette (terracotta, olive, gold)
- ✅ Japanese restraint in the layout (clean, gridded, deliberate)

---

## 3. Design Direction

### Visual references / vibe

Imagine the love child of:
- **Notion's clean information density**
- **Apple Notes' restrained warmth**
- **Linear's polish and motion**
- **Hospitality industry collateral** (printed restaurant menus, concierge cards)
- **Editorial design** (magazine layouts, not web layouts)

### Key visual moves

- **Cream backgrounds** instead of stark white — warmer, easier on eyes, brand-coherent
- **Charcoal as primary text** — never pure black
- **Gold as the single accent** — used sparingly for emphasis, never decoratively
- **Generous spacing** — never crowded
- **Single-column-first layouts** on mobile — never compromise readability for density
- **Subtle borders** — fine lines, low contrast, never heavy

### Anti-patterns to avoid

- ❌ Purple/blue gradients (the AI default)
- ❌ Drop shadows on cards (use thin borders or light fills instead)
- ❌ Rounded corners more than 6-8px
- ❌ Multiple fonts in heavy usage (one serif optional, one sans primary)
- ❌ Dark mode as primary (we're cream/light first; dark mode is Phase 5)
- ❌ Emoji everywhere (occasional functional ones OK: 📊 📋 — never decorative)
- ❌ Animations that distract (only animate to communicate state changes)

---

## 4. Visual System

### Colors

```css
/* === BRAND === */
--charcoal: #1A1818;        /* primary text, dark surfaces */
--charcoal-soft: #2D2A26;   /* secondary dark */
--gold: #B8860B;            /* primary accent — warm gold */
--gold-soft: #C9A86A;       /* secondary accent */

/* === SURFACES === */
--white: #FFFFFF;           /* rare, only for cards needing pop */
--cream: #FAF8F2;           /* primary background */
--sand: #F0EBDD;            /* section/card background */

/* === BORDERS === */
--border-light: #E5E0D5;    /* default borders */
--border-mid: #C9C2B0;      /* emphasized borders */

/* === FUNCTIONAL === */
--income: #2D6A4F;          /* forest green — positive amounts */
--income-light: #B7E4C7;    /* income backgrounds */
--expense: #9A2A2A;         /* terracotta-red — negative amounts */
--expense-light: #F5C7C7;   /* expense backgrounds */
--neutral: #5C6B47;         /* olive — secondary actions */
--warning: #C68B17;         /* amber — caution, VAT due */

/* === TEXT === */
--text-primary: #1A1818;    /* main text */
--text-secondary: #6B6258;  /* secondary text */
--text-muted: #9C9385;      /* labels, captions */
--text-on-dark: #FAF8F2;    /* text on dark surfaces */
```

### Color usage rules

- **Cream is the default background** — not white
- **Charcoal text** on cream/sand. **Cream text** on charcoal.
- **Gold sparingly**: KPI accent lines, primary CTA hover state, brand mark, key dividers. Never as page background.
- **Income green / Expense red** ONLY in financial values, never in UI chrome (buttons, headers etc.)
- **Olive** for secondary actions and neutral states
- **Sand** for card backgrounds when contrast against cream is needed

### Typography

```css
/* Primary font stack */
font-family: 'Aptos', 'Inter', -apple-system, system-ui, sans-serif;

/* Optional display font for brand moments only (header logo, hero titles) */
font-family: 'Playfair Display', Georgia, serif;
```

**Type scale (mobile-first):**

| Token | Size | Weight | Use |
|---|---|---|---|
| display | 32px | 700 | Hero / login welcome |
| h1 | 24px | 700 | Page titles |
| h2 | 18px | 600 | Section headers |
| h3 | 14px | 600 | Subsection labels |
| body | 14px | 400 | Body text |
| body-lg | 16px | 400 | Important body text |
| label | 11px | 600 | Form labels, KPI captions, uppercase |
| caption | 10px | 400 | Helper text, timestamps |
| numeric-xl | 28px | 700 | KPI primary values |
| numeric-lg | 18px | 600 | Table totals, secondary KPIs |
| numeric | 14px | 500 | Inline amounts |

**Key typography moves:**

- Numeric values use **tabular figures** (`font-variant-numeric: tabular-nums`) — alignment matters in financial tables
- Labels are **uppercase + 0.05em letter-spacing** + muted color — gives them quiet authority
- **Greek text renders correctly** — verify font has full Greek glyph support (Aptos and Inter both do)
- **Never use light weights** below 400 — readability matters

### Spacing scale

8-point grid:
```
4px  · 8px  · 12px  · 16px  · 24px  · 32px  · 48px  · 64px  · 96px
```

**Rules:**
- Card internal padding: 16px on mobile, 24px on desktop
- Between sections: 32px on mobile, 48px on desktop
- Between related items: 12px
- Between unrelated items: 24px

### Border radius

- 4px — small (tags, chips)
- 8px — medium (cards, inputs, buttons) **default**
- 12px — large (modals)
- 0 — never on financial tables (sharp edges = precision)

### Elevation / depth

**No shadows by default.** Use:
- Thin borders (`1px solid var(--border-light)`)
- Subtle background color shifts (cream → sand for cards)
- Where shadow IS needed (modals, FABs): very soft, very subtle:
  ```css
  box-shadow: 0 1px 2px rgba(26,24,24,0.04), 0 4px 12px rgba(26,24,24,0.06);
  ```

### Motion

- **Transitions:** 150ms ease-out as default
- **Spring animations** for interactive elements (toggles, drawers): use `cubic-bezier(0.34, 1.56, 0.64, 1)` for slight bounce
- **No autoplay animations** — motion communicates user-triggered state changes only
- **Reduced motion**: respect `prefers-reduced-motion: reduce`

---

## 5. Component Library

Below: priority components Claude Design should generate samples of.

### KPI Tile

The signature component. 4 of these on Dashboard.

```
┌──────────────────────────┐
│ ΕΣΟΔΑ ΕΤΟΥΣ              │ ← uppercase label, muted color, 11px
│                          │
│ 12.450 €                 │ ← large numeric, charcoal or income green, 28px
│                          │
├──────────────────────────┤ ← gold accent line bottom (2px)
└──────────────────────────┘
   ↑ cream/sand background, subtle border
```

States:
- **Default:** charcoal value
- **Income tile:** income green value
- **Expense tile:** expense red value
- **Loading:** skeleton shimmer
- **Empty data:** em-dash "—" instead of "0 €"

### Transaction List Item

```
┌──────────────────────────────────────────┐
│ [📷] Ψώνια λαχ. Λαχαναγορά      −45,20 €│
│      Πρώτες ύλες · Ταμείο · 06 Μαΐ      │
└──────────────────────────────────────────┘
   ↑ photo thumbnail (if present, else category icon)
   ↑ description (body weight 500)
   ↑ category · account · date (caption muted)
   ↑ amount right-aligned, color-coded by type
```

**Variants:**
- Income (green amount, "+" prefix)
- Expense (red amount, "−" prefix)
- Reserve / Transfer (charcoal, no prefix)

**With photo:** small (32x32) thumbnail in circular crop on left.
**Without photo:** small icon representing category type.

### Add Transaction Form (mobile)

The most-used screen. Must be flawless.

```
┌──────────────────────────┐
│ ←  Νέα συναλλαγή         │ ← header with back, no save (auto on blur or button)
├──────────────────────────┤
│ Ποσό                     │ ← label uppercase muted
│ ┌──────────────────────┐ │
│ │ 0,00 €               │ │ ← large numeric input, native numpad
│ └──────────────────────┘ │
│                          │
│ Είδος                    │
│ [Έσοδο] [Έξοδο] [Άλλο]   │ ← segmented control
│                          │
│ Περιγραφή                │
│ ┌──────────────────────┐ │
│ │ ψώνια λαχ.           │ │
│ └──────────────────────┘ │
│                          │
│ Κατηγορία ▾              │ ← cascading dropdown
│ Λογαριασμός ▾            │
│ Ημερομηνία [Σήμερα]      │
│ ΦΠΑ [24%] [13%] [6%] [0%]│ ← chip selector
│                          │
│ Tag (προαιρ.) ▾          │
│ [📷 Φωτογραφία απόδ.]    │ ← camera CTA
│ Σημειώσεις (προαιρ.)     │
│                          │
│ ┌──────────────────────┐ │
│ │      Καταχώρηση      │ │ ← primary CTA, full-width, sticky bottom
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Critical UX:**
- Amount field auto-focus on screen open
- Native numpad triggered (`inputmode="decimal"`)
- Defaults applied: type=Έξοδο, date=today, VAT=24%, account=last-used
- Submit feels instant (optimistic UI)

### Dashboard

```
┌──────────────────────────┐
│ Evochia ◆ Finance       │ ← brand mark, top-left
│                    ⚙️ 🔄 │ ← settings, sync status (top-right)
├──────────────────────────┤
│ 📅 Μάιος 2026     [▼]   │ ← month/year picker
│ 📚 Επαγγελματικά  [▼]   │ ← book filter
├──────────────────────────┤
│ ┌──────────┬──────────┐ │
│ │  ΕΣΟΔΑ   │  ΕΞΟΔΑ   │ │ ← KPI tiles, 2x2 grid on mobile
│ │  4.250€  │  2.180€  │ │   (4 in a row on desktop)
│ ├──────────┼──────────┤ │
│ │ ΚΑΘΑΡΟ   │   ΦΠΑ    │ │
│ │  2.070€  │   332€   │ │
│ └──────────┴──────────┘ │
├──────────────────────────┤
│ 📈 Έσοδα vs Έξοδα       │
│ ┌────────────────────┐  │
│ │ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓  │  │ ← clean bar chart
│ │ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒  │  │   green = income, red = expense
│ └────────────────────┘  │
├──────────────────────────┤
│ Πρόσφατες συναλλαγές     │
│ ── transaction list ──   │
│ [Δες όλες →]             │ ← link to full list
├──────────────────────────┤
│             [➕]         │ ← FAB for add (bottom-right)
└──────────────────────────┘
```

### Buttons

**Primary** (1 per screen):
- Charcoal background, cream text, 8px radius
- Hover: gold accent on left edge OR slight darken
- Full-width on mobile forms, auto-width inline

**Secondary**:
- Cream background, charcoal text, 1px charcoal border
- For cancel, "Δες όλες", "Πίσω"

**Ghost / Tertiary**:
- No background, gold text, no border
- For inline links, navigation

**Destructive** (delete):
- Cream background, expense-red text, expense-red border
- Confirmation dialog always required

### Form inputs

- Text inputs: cream background, 1px border-light, 8px radius, charcoal text
- Focus: border becomes charcoal, no glow
- Error: border becomes expense-red, helper text in expense-red below
- Disabled: opacity 0.5, no interaction

### Charts (Recharts)

- **Bar charts**: income green + expense red bars, no gridlines, minimal axes
- **Line charts**: gold line for net/cumulative, 2px stroke, smooth curves
- **Pie charts**: avoid for >5 categories (use horizontal bar instead)
- **Color palette for multi-category**: charcoal, gold, olive, terracotta, soft variants
- **No chart titles** if section header above explains
- **No legends** if 1-2 series (color-code in section title instead)

### Icons

- **Lucide icons** primary set
- 16px (inline), 20px (buttons), 24px (large UI)
- 1.5px stroke
- Match text color always

### Sync status indicator (Tauri-specific)

Header pill that shows app's sync state:

```
[ ✓ Ενημερωμένο ]                    ← all synced (icon + olive bg)
[ ⟳ Συγχρονισμός... ]                ← syncing (spinning icon + neutral bg)
[ ⚠ Offline · 3 αλλαγές εκκρεμούν ]  ← offline with pending (warning amber)
[ ✗ Σφάλμα συγχρονισμού · Επανάληψη] ← error (expense-red + retry button)
```

---

## 6. Screen Specifications

Detailed specs για κάθε priority screen που πρέπει να φτιάξει το Claude Design.

### Screen 1: Login

**Purpose:** Magic link auth entry point.

**Layout:**
- Centered, max-width 400px
- Brand mark at top (Evochia + Finance subtitle)
- Subtitle: "Διαχείριση οικονομικών"
- Email input field
- "Αποστολή magic link" button (primary)
- Helper text below: "Θα λάβεις email με σύνδεσμο για είσοδο"
- After submission state: "Στείλαμε email στο {email}. Έλεγξε τα εισερχόμενα."

**Visual:**
- Cream background full screen
- Generous vertical centering
- Optional: subtle brand mark watermark in corner

### Screen 2: Dashboard (Home)

**Purpose:** At-a-glance financial overview + quick access to add transaction.

See ASCII layout above in §5. Components:
- Sticky header with brand + sync status + settings
- Filter row (month, book)
- 4 KPI tiles (Income, Expense, Net, VAT)
- Income vs Expense bar chart (12 months)
- Recent transactions (5-7 items) with link to full list
- Floating Action Button (FAB) bottom-right for "Add"

**Mobile:** Single column. KPI tiles 2x2 grid. Chart full-width.
**Desktop:** Two columns. KPI tiles 4 in a row. Chart on left, recent on right.

### Screen 3: Add Transaction

**Purpose:** Fast entry. <30 seconds total time.

See ASCII layout above in §5. Components:
- Back button + title
- Amount input (large, focused, native numpad)
- Type segmented control (Income / Expense / Other)
- Description text input
- Category dropdown (cascading sub-category)
- Account dropdown (filtered by current book)
- Date picker (defaults to today)
- VAT rate chip selector
- Optional: Tag autocomplete
- Optional: Camera CTA → opens native camera
- Optional: Notes textarea
- Sticky bottom: "Καταχώρηση" primary button

**Critical UX:**
- Auto-focus amount on open
- Smart defaults
- Photo upload shows thumbnail after capture
- Submit shows toast + returns to dashboard with new entry visible

### Screen 4: Transactions List

**Purpose:** Browse/search/edit historical transactions.

**Layout:**
- Header with search bar + filter button
- Filter sheet (slide-up): Date range, Book, Category, Tag, Amount range
- List of transaction items (see §5 component spec)
- Group by date (sticky date headers)
- Infinite scroll
- Empty state: "Δεν υπάρχουν συναλλαγές. [➕ Πρόσθεσε την πρώτη]"

**Interactions:**
- Tap item → detail/edit screen
- Swipe left on item → quick actions (edit, delete)
- Search debounced, instant feedback

### Screen 5: Transaction Detail / Edit

**Purpose:** View full transaction info + edit + delete.

**Layout:**
- Header with back + delete (top-right, hidden until tap)
- Photo at top (if present, large, tappable to view full)
- Form (same as Add but with current values)
- Metadata section: Created, Last updated, Source (manual / recurring)
- "Αποθήκευση" button (primary)
- Cancel returns without saving

### Screen 6: Recurring Templates

**Purpose:** Manage automatic recurring transactions (rent, utilities).

**Layout:**
- Header with "+ Νέο" action
- List of templates with toggle switches (active/inactive)
- Each item shows: Description, Frequency, Next due, Amount
- Tap item → edit form (similar to Add Transaction + frequency settings)

### Screen 7: VAT Summary

**Purpose:** Quarterly VAT breakdown για λογιστή.

**Layout:**
- Year selector at top
- 4 quarter cards in 2x2 grid (or 4 in row on desktop):
  - Quarter label (Q1 · Ιαν–Μαρ)
  - Output VAT (large numeric)
  - Input VAT
  - Net VAT (highlighted)
- Year total card (gold accent, prominent)
- "Εξαγωγή Excel" button at bottom

### Screen 8: Forecast

**Purpose:** 12-month cashflow projection.

**Layout:**
- Header with year selector
- Line chart at top (cumulative net, gold line)
- Table below: Month / Income / Expenses / Net / Cumulative
- Note about what's based on (recurring + scheduled)

### Screen 9: Settings

**Purpose:** App configuration + export.

**Layout:**
- Sections:
  - **Account:** email, sign out
  - **Sync:** last synced, manual sync now, sync stats
  - **Backup:** download SQLite backup, restore from file
  - **Export:** Excel export (period selector + download)
  - **Preferences:** default VAT rate, currency
  - **About:** version, check for updates, license

---

## 7. Greek Copy Reference

### Universal labels

| English | Greek |
|---|---|
| Income | Έσοδα |
| Expense | Έξοδα |
| Net | Καθαρό |
| VAT | ΦΠΑ |
| Date | Ημερομηνία |
| Amount | Ποσό |
| Description | Περιγραφή |
| Category | Κατηγορία |
| Subcategory | Υποκατηγορία |
| Account | Λογαριασμός |
| Tag | Tag |
| Notes | Σημειώσεις |
| Save | Αποθήκευση |
| Cancel | Ακύρωση |
| Delete | Διαγραφή |
| Edit | Επεξεργασία |
| Add | Προσθήκη |
| Search | Αναζήτηση |
| Filter | Φίλτρο |
| Today | Σήμερα |
| Yesterday | Χθες |
| This week | Αυτή την εβδομάδα |
| This month | Αυτόν τον μήνα |
| All | Όλα |

### Books

- Επαγγελματικά (Business)
- Προσωπικά (Personal)

### Categories — Επαγγελματικά

**Έσοδα:** Catering / Εκδηλώσεις · Private chef · Συμβουλευτικές υπηρεσίες · Pop-up / Residency · Meal prep / Συνδρομές · Λοιπά έσοδα

**Έξοδα:** Πρώτες ύλες · Λειτουργικά · Ενοίκια · ΔΕΗ · ΕΥΔΑΠ · Internet / Τηλεφωνία · Προσωπικό / Μισθοδοσία · Μεταφορικά · Καύσιμα · Διόδια · Επαγγ. εξοπλισμός · Ασφάλιστρα / ΕΦΚΑ · Φόροι / ΦΠΑ · Marketing / Διαφήμιση · Λογιστής / Νομικά · Συνδρομές / Εργαλεία · Λοιπά έξοδα

### Categories — Προσωπικά

**Έσοδα:** Μισθός / Αμοιβή · Δώρα · Λοιπά έσοδα

**Έξοδα:** Στεγαστικά · Τρόφιμα / Σούπερ μάρκετ · Μετακίνηση · Συνδρομές · Διασκέδαση · Υγεία · Ένδυση · Παιδιά / Οικογένεια · Λοιπά έξοδα

### Accounts

- Ταμείο Evochia (cash, business)
- Τράπεζα Evochia (bank, business)
- Κάρτα Evochia (card, business)
- Ταμείο Προσωπικό (cash, personal)
- Τράπεζα Προσωπική (bank, personal)
- Κάρτα Προσωπική (card, personal)

### Payment methods

Μετρητά · Κάρτα · Τραπεζική μεταφορά · IRIS · Άλλο

### VAT rates

24% · 13% · 6% · 0%

### Empty states

- **No transactions yet:** "Δεν υπάρχουν ακόμα συναλλαγές. Πρόσθεσε την πρώτη σου ↑"
- **No results from search:** "Δεν βρέθηκαν συναλλαγές με '{query}'"
- **No data for period:** "Καμία δραστηριότητα για αυτή την περίοδο"
- **No recurring templates:** "Δεν υπάρχουν αυτόματες εγγραφές. Πρόσθεσε ένα template για τα πάγια έξοδα."

### Toast messages

- Success: "Η συναλλαγή αποθηκεύτηκε"
- Offline save: "Αποθηκεύτηκε τοπικά. Θα συγχρονιστεί όταν συνδεθείς."
- Synced: "Συγχρονίστηκαν {n} αλλαγές"
- Error: "Κάτι πήγε στραβά. Δοκίμασε ξανά."

### Confirmation dialogs

- Delete transaction: "Διαγραφή της συναλλαγής '{description}'; Δεν μπορεί να αναιρεθεί."
- Sign out: "Αποσύνδεση; Τα τοπικά δεδομένα παραμένουν στη συσκευή."

---

## 8. State Patterns

Each screen needs four states. Make sure the prototype shows all of them:

1. **Empty state** — first-time user, no data yet
2. **Loading state** — skeleton screens (not spinners)
3. **Error state** — sync error, no internet, etc.
4. **Populated state** — realistic data

### Skeleton loading example

```
┌──────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓ │ ← shimmer animation
│                          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────┘
```

---

## 9. Mobile-First Considerations

### Viewports to design for

- **Mobile primary:** 375px wide (iPhone SE, smallest common viewport)
- **Mobile large:** 414px (iPhone Pro Max, modern Android)
- **Tablet:** 768px
- **Desktop:** 1024px+ (max-width content area: 1200px)

### Thumb zones

- Bottom 1/3 of screen = primary action area
- FAB always bottom-right
- Tab bar (if introduced) bottom
- Top of screen = navigation only (back, settings)
- Submit buttons sticky at bottom of forms

### Touch targets

- Minimum 44x44 pt (Apple HIG)
- Spacing between tappable items: minimum 8px

### Gestures

- Swipe left on transaction row → quick actions (edit, delete)
- Pull-to-refresh on lists
- Swipe-down on modal sheets to dismiss

### Native integration cues

- Date picker should LOOK like native (don't fight platform)
- Camera button should clearly indicate "opens camera"
- Save buttons may show platform-appropriate styling (subtle)

---

## 10. Sample Data για Mockups

Όταν φτιάχνεις mockups, χρησιμοποίησε αυτά τα ρεαλιστικά Greek samples (όχι Lorem ipsum).

### Sample transactions

```
Πρόσφατες συναλλαγές (Μάιος 2026):

▪ Catering γάμος Σύρος          +2.500,00 € · Catering · 04 Μαΐ
▪ Ψώνια λαχαναγορά               −145,20 € · Πρώτες ύλες · 03 Μαΐ
▪ ΔΕΗ ρεύμα Απρίλιος             −168,40 € · ΔΕΗ · 02 Μαΐ
▪ Private chef event Κολωνάκι    +800,00 € · Private chef · 01 Μαΐ
▪ Καύσιμα van                    −68,00 €  · Καύσιμα · 30 Απρ
▪ Cold Kitchen Project pop-up    +1.200,00 € · Pop-up · 28 Απρ
▪ Επαγγ. ασφάλιστρα ΕΦΚΑ          −185,00 € · Ασφάλιστρα · 25 Απρ
```

### Sample dashboard numbers (Μάιος 2026)

- Έσοδα: 4.500 €
- Έξοδα: 1.180 €
- Καθαρό: 3.320 €
- Καθαρό ΦΠΑ (πληρωτέο): 412 €

### Sample tags

- Cold Kitchen Project
- TheButly partnership
- Γάμος Σύρος Μάιος
- Pop-up Buñuel

---

## 11. Output Expectations

### What I want from Claude Design

**Tier 1 (must-have):**
1. **Login screen** — fully designed
2. **Dashboard** — fully designed with all 4 KPI tiles + chart + recent list (mobile + desktop)
3. **Add Transaction** — mobile-first, fully designed
4. **Transactions List** — mobile-first, with filter sheet

**Tier 2 (nice-to-have):**
5. Recurring Templates list
6. Settings page
7. VAT Summary
8. Empty states for all of above

**Format preferences:**
- HTML/CSS με embedded sample data
- Use real Greek copy (όχι placeholders)
- Show both mobile (375px) and desktop (1024px) versions of Dashboard at minimum
- Demo dropdowns/interactions where they exist
- Include the sync status indicator state variations

### Iteration approach

- First pass: Login + Dashboard only — verify brand expression, palette, typography
- Adjust if needed
- Second pass: Add Transaction + Transactions List
- Final pass: remaining screens

### Hand-off to dev (Tauri/React)

The output prototype will inform:
- Tailwind config (colors, typography, spacing)
- shadcn/ui component customizations
- Layout patterns to replicate in React
- Greek copy ready to use

It does NOT need to be production code — but if output is clean React + Tailwind, even better.

---

## 12. Closing Notes

- **Restraint over expression** — when in doubt, less
- **Cream + charcoal + gold** — that's it. Resist adding more colors.
- **Greek-first, but no Greek-isms in design** — design language is universal, the language is Greek
- **Single user, premium feel** — this isn't being sold; it's a tool that respects its user
- **The brand is Evochia, not "AI-generated dashboard"** — every choice should reinforce hospitality + restaurant heritage

---

*Brief για Claude Design — submit όπως είναι, ή σπάσε σε iteration steps. Updated με κάθε design review cycle.*
