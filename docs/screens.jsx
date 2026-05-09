// Evochia Finance — screen mockups
// All mobile screens are designed for a 375x780 frame; desktop uses 1024-wide artboards.

const SAMPLE_TX = [
  { desc: 'Catering γάμος Σύρος', amount: '2.500,00 €', type: 'income', cat: 'Catering', account: 'Τράπεζα Evochia', date: '04 Μαΐ', photo: false },
  { desc: 'Ψώνια λαχαναγορά', amount: '145,20 €', type: 'expense', cat: 'Πρώτες ύλες', account: 'Ταμείο', date: '03 Μαΐ', photo: true },
  { desc: 'ΔΕΗ ρεύμα Απρίλιος', amount: '168,40 €', type: 'expense', cat: 'ΔΕΗ', account: 'Τράπεζα Evochia', date: '02 Μαΐ', photo: false },
  { desc: 'Private chef Κολωνάκι', amount: '800,00 €', type: 'income', cat: 'Private chef', account: 'IRIS', date: '01 Μαΐ', photo: false },
  { desc: 'Καύσιμα van', amount: '68,00 €', type: 'expense', cat: 'Καύσιμα', account: 'Κάρτα Evochia', date: '30 Απρ', photo: true },
  { desc: 'Cold Kitchen pop-up', amount: '1.200,00 €', type: 'income', cat: 'Pop-up', account: 'Τράπεζα Evochia', date: '28 Απρ', photo: false },
  { desc: 'Επαγγ. ασφάλιστρα ΕΦΚΑ', amount: '185,00 €', type: 'expense', cat: 'Ασφάλιστρα', account: 'Τράπεζα Evochia', date: '25 Απρ', photo: false },
];

const CHART_DATA = [
  { m: 'Ιούν', inc: 3200, exp: 2100 },
  { m: 'Ιούλ', inc: 4800, exp: 2400 },
  { m: 'Αύγ', inc: 5200, exp: 2800 },
  { m: 'Σεπ', inc: 3800, exp: 2200 },
  { m: 'Οκτ', inc: 3100, exp: 1900 },
  { m: 'Νοέ', inc: 4400, exp: 2300 },
  { m: 'Δεκ', inc: 6200, exp: 3100 },
  { m: 'Ιαν', inc: 2800, exp: 2100 },
  { m: 'Φεβ', inc: 3600, exp: 2050 },
  { m: 'Μαρ', inc: 4100, exp: 2200 },
  { m: 'Απρ', inc: 5400, exp: 2400 },
  { m: 'Μαΐ', inc: 4500, exp: 1180 },
];

// Phone frame with status bar
function PhoneFrame({ children, w = 375, h = 780 }) {
  return (
    <div className="evo-frame" style={{ width: w, height: h }}>
      <div className="evo" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Plain screen (no phone frame; for desktop or tablet)
function PlainScreen({ children, w, h, bg = 'var(--cream)' }) {
  return (
    <div className="evo" style={{ width: w, height: h, background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

// ─── 1. Login ───────────────────────────────────────────────
function LoginScreen({ sent, w = 375, h = 780, plain }) {
  const Wrap = plain ? PlainScreen : PhoneFrame;
  return (
    <Wrap w={w} h={h}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', position: 'relative' }}>
        {/* watermark */}
        <div style={{ position: 'absolute', bottom: 32, right: 32, fontSize: 60, color: 'var(--gold)', opacity: 0.08, fontWeight: 700, letterSpacing: '-0.04em', userSelect: 'none' }}>◆</div>

        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>◆ Evochia</div>
          <div className="t-display" style={{ marginBottom: 8 }}>Finance</div>
          <div className="t-body-lg secondary">Διαχείριση οικονομικών</div>
        </div>

        {sent ? (
          <div className="card" style={{ padding: 20 }}>
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--income-light)', color: 'var(--income)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={14} />
              </div>
              <div className="t-h3">Ελέγξτε το email σας</div>
            </div>
            <div className="t-body secondary" style={{ paddingLeft: 34 }}>
              Στείλαμε σύνδεσμο στο <strong style={{ color: 'var(--charcoal)' }}>heraklis@evochia.gr</strong>. Ο σύνδεσμος ισχύει για 15 λεπτά.
            </div>
          </div>
        ) : (
          <div className="stack-16">
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" defaultValue="heraklis@evochia.gr" />
            </div>
            <button className="btn btn-primary btn-block btn-lg">Αποστολή magic link</button>
            <div className="t-caption" style={{ textAlign: 'center', paddingTop: 4 }}>
              Θα λάβεις email με σύνδεσμο για είσοδο.
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="t-caption">v1.0 · Tauri</div>
          <div className="t-caption" style={{ color: 'var(--gold)' }}>◆ Evochia</div>
        </div>
      </div>
    </Wrap>
  );
}

// ─── 2. Dashboard (mobile) ──────────────────────────────────
function DashboardMobile({ state = 'populated', w = 375, h = 780, plain, syncStatus = 'synced' }) {
  const Wrap = plain ? PlainScreen : PhoneFrame;
  const isEmpty = state === 'empty';
  const isLoading = state === 'loading';

  return (
    <Wrap w={w} h={h}>
      <div className="topbar">
        <BrandMark />
        <div className="row" style={{ gap: 8 }}>
          <SyncPill status={syncStatus} />
          <button className="btn-ghost" style={{ padding: 4, color: 'var(--text-secondary)' }}><Icon name="settings" size={18} /></button>
        </div>
      </div>

      {/* filter row */}
      <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border-light)' }}>
        <button className="chip active" style={{ padding: '7px 12px' }}>
          <Icon name="calendar" size={12} /> Μάιος 2026 <Icon name="chevronDown" size={12} />
        </button>
        <button className="chip" style={{ padding: '7px 12px' }}>
          Επαγγελματικά <Icon name="chevronDown" size={12} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 80px' }}>
        {/* KPI grid 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <KPI label="Έσοδα" value={isEmpty ? '—' : '4.500 €'} accent="income" loading={isLoading} empty={isEmpty} />
          <KPI label="Έξοδα" value={isEmpty ? '—' : '1.180 €'} accent="expense" loading={isLoading} empty={isEmpty} />
          <KPI label="Καθαρό" value={isEmpty ? '—' : '3.320 €'} sand loading={isLoading} empty={isEmpty} />
          <KPI label="ΦΠΑ Πληρωτέο" value={isEmpty ? '—' : '412 €'} sand loading={isLoading} empty={isEmpty} />
        </div>

        {/* Chart */}
        <div style={{ marginBottom: 28 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <div className="t-h3">Έσοδα / Έξοδα</div>
            <div className="row" style={{ gap: 12, fontSize: 11 }}>
              <span className="row" style={{ gap: 4, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, background: 'var(--income)', borderRadius: 1 }} /> έσοδα
              </span>
              <span className="row" style={{ gap: 4, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, background: 'var(--expense)', borderRadius: 1 }} /> έξοδα
              </span>
            </div>
          </div>
          {isLoading ? (
            <div className="skel" style={{ height: 120 }} />
          ) : isEmpty ? (
            <div className="card" style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="t-caption">Καμία δραστηριότητα για αυτή την περίοδο</div>
            </div>
          ) : (
            <BarChart data={CHART_DATA} height={120} />
          )}
        </div>

        {/* Recent */}
        <div className="between" style={{ marginBottom: 10 }}>
          <div className="t-h3">Πρόσφατες συναλλαγές</div>
          <button className="btn-ghost">Δες όλες →</button>
        </div>
        {isEmpty ? (
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <Icon name="receipt" size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <div className="t-body" style={{ marginBottom: 4 }}>Καμία συναλλαγή ακόμα</div>
            <div className="t-caption">Πρόσθεσε την πρώτη σου ↓</div>
          </div>
        ) : isLoading ? (
          <div className="list">
            {[0,1,2,3].map(i => (
              <div key={i} className="tx" style={{ borderBottom: i === 3 ? 'none' : '1px solid var(--border-light)' }}>
                <div className="skel" style={{ width: 32, height: 32, borderRadius: 16 }} />
                <div className="grow stack-4">
                  <div className="skel" style={{ height: 12, width: '60%' }} />
                  <div className="skel" style={{ height: 10, width: '40%' }} />
                </div>
                <div className="skel" style={{ height: 14, width: 60 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="list">
            {SAMPLE_TX.slice(0, 5).map((t, i) => <TxRow key={i} {...t} />)}
          </div>
        )}
      </div>

      <button className="fab" aria-label="Νέα συναλλαγή"><Icon name="plus" size={22} style={{ stroke: 'currentColor' }} /></button>
    </Wrap>
  );
}

// ─── 2b. Dashboard (desktop) ────────────────────────────────
function DashboardDesktop({ w = 1024, h = 720 }) {
  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <div className="row" style={{ gap: 32 }}>
          <BrandMark />
          <div className="row" style={{ gap: 4 }}>
            <button className="chip active" style={{ padding: '7px 12px' }}>
              <Icon name="calendar" size={12} /> Μάιος 2026 <Icon name="chevronDown" size={12} />
            </button>
            <button className="chip" style={{ padding: '7px 12px' }}>Επαγγελματικά <Icon name="chevronDown" size={12} /></button>
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <SyncPill status="synced" />
          <button className="btn btn-secondary" style={{ minHeight: 32, padding: '6px 12px', fontSize: 13 }}>
            <Icon name="plus" size={14} /> Νέα συναλλαγή
          </button>
          <button className="btn-ghost" style={{ padding: 4, color: 'var(--text-secondary)' }}><Icon name="settings" size={18} /></button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gridTemplateRows: 'auto auto 1fr', gap: 24, alignContent: 'start' }}>
        {/* KPIs full width */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <KPI label="Έσοδα Μαΐου" value="4.500 €" accent="income" trend={<span><Icon name="trending" size={11} /> +18% vs Απρίλιος</span>} />
          <KPI label="Έξοδα Μαΐου" value="1.180 €" accent="expense" trend={<span>−51% vs Απρίλιος</span>} />
          <KPI label="Καθαρό" value="3.320 €" sand trend={<span>Περιθώριο 73,8%</span>} />
          <KPI label="ΦΠΑ Πληρωτέο" value="412 €" sand trend={<span>Λήξη 25 Ιουλ</span>} />
        </div>

        {/* Chart */}
        <div style={{ gridColumn: '1', gridRow: '2 / span 2' }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="between" style={{ marginBottom: 16 }}>
              <div>
                <div className="t-h2">Έσοδα vs Έξοδα</div>
                <div className="t-caption">Τελευταίοι 12 μήνες</div>
              </div>
              <div className="row" style={{ gap: 16, fontSize: 12 }}>
                <span className="row" style={{ gap: 6, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 10, height: 10, background: 'var(--income)' }} /> Έσοδα
                </span>
                <span className="row" style={{ gap: 6, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 10, height: 10, background: 'var(--expense)' }} /> Έξοδα
                </span>
              </div>
            </div>
            <BarChart data={CHART_DATA} height={220} />
          </div>
        </div>

        {/* Recent */}
        <div style={{ gridColumn: '2', gridRow: '2 / span 2' }}>
          <div className="card" style={{ padding: 0 }}>
            <div className="between" style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="t-h2">Πρόσφατες</div>
              <button className="btn-ghost">Δες όλες →</button>
            </div>
            <div>
              {SAMPLE_TX.slice(0, 6).map((t, i) => <TxRow key={i} {...t} />)}
            </div>
          </div>
        </div>
      </div>
    </PlainScreen>
  );
}

// ─── 3. Add Transaction ─────────────────────────────────────
function AddTransactionScreen({ w = 375, h = 780, plain }) {
  const Wrap = plain ? PlainScreen : PhoneFrame;
  return (
    <Wrap w={w} h={h}>
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">Νέα συναλλαγή</div>
        </div>
        <button className="btn-ghost" style={{ color: 'var(--text-muted)' }}>Ακύρωση</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px 96px' }}>
        <div className="stack-16">
          <div className="field">
            <label>Ποσό</label>
            <input className="input input-amount" inputMode="decimal" defaultValue="145,20 €" />
          </div>

          <div className="field">
            <label>Είδος</label>
            <div className="segmented" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button>Έσοδο</button>
              <button className="active">Έξοδο</button>
              <button>Άλλο</button>
            </div>
          </div>

          <div className="field">
            <label>Περιγραφή</label>
            <input className="input" defaultValue="Ψώνια λαχαναγορά" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Κατηγορία</label>
              <div className="input row between" style={{ cursor: 'pointer' }}>
                <span>Πρώτες ύλες</span>
                <Icon name="chevronDown" size={14} className="icon-sm" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="field">
              <label>Λογαριασμός</label>
              <div className="input row between" style={{ cursor: 'pointer' }}>
                <span>Ταμείο</span>
                <Icon name="chevronDown" size={14} className="icon-sm" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          <div className="field">
            <label>Ημερομηνία</label>
            <div className="row" style={{ gap: 8 }}>
              <button className="chip active">Σήμερα · 06 Μαΐ</button>
              <button className="chip">Χθες</button>
              <button className="chip"><Icon name="calendar" size={12} /></button>
            </div>
          </div>

          <div className="field">
            <label>ΦΠΑ</label>
            <div className="row" style={{ gap: 6 }}>
              {['24%', '13%', '6%', '0%'].map((v, i) => (
                <button key={v} className={`chip ${i === 0 ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', padding: '8px 0' }}>{v}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Tag (προαιρετικό)</label>
            <input className="input" placeholder="π.χ. Cold Kitchen Project" />
          </div>

          <button className="btn btn-secondary btn-block" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <Icon name="camera" size={18} /> Φωτογραφία απόδειξης
          </button>

          <div className="field">
            <label>Σημειώσεις (προαιρετικό)</label>
            <textarea className="textarea" rows="2" placeholder="..." />
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, background: 'linear-gradient(to top, var(--cream) 75%, transparent)', borderTop: '1px solid var(--border-light)' }}>
        <button className="btn btn-primary btn-block btn-lg">Καταχώρηση</button>
      </div>
    </Wrap>
  );
}

// ─── 4. Transactions List ───────────────────────────────────
function TransactionsListScreen({ w = 375, h = 780, plain, state = 'populated' }) {
  const Wrap = plain ? PlainScreen : PhoneFrame;
  const isEmpty = state === 'empty';
  const isSearch = state === 'no-results';

  return (
    <Wrap w={w} h={h}>
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">Συναλλαγές</div>
        </div>
        <SyncPill status="synced" />
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border-light)' }}>
        <div className="row" style={{ flex: 1, padding: '8px 12px', background: 'var(--sand)', borderRadius: 8, gap: 8 }}>
          <Icon name="search" size={16} className="icon-sm" style={{ color: 'var(--text-muted)' }} />
          <input style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', fontFamily: 'inherit', fontSize: 14 }} placeholder="Αναζήτηση…" defaultValue={isSearch ? 'pizzeria' : ''} />
        </div>
        <button className="btn-ghost" style={{ padding: 8, background: 'var(--sand)', borderRadius: 8 }}>
          <Icon name="filter" size={18} />
        </button>
      </div>

      {/* active filter chips */}
      {!isEmpty && !isSearch && (
        <div style={{ padding: '10px 16px 6px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--border-light)' }}>
          <span className="chip active">Μάιος 2026 <Icon name="close" size={11} /></span>
          <span className="chip">Έξοδα <Icon name="close" size={11} /></span>
          <span className="chip">Επαγγελματικά</span>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isEmpty ? (
          <div style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 60 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Icon name="receipt" size={26} />
            </div>
            <div className="t-h2">Καμία συναλλαγή ακόμα</div>
            <div className="t-body secondary" style={{ maxWidth: 240, lineHeight: 1.5 }}>
              Πρόσθεσε την πρώτη σου συναλλαγή για να ξεκινήσεις.
            </div>
            <button className="btn btn-primary"><Icon name="plus" size={16} /> Πρόσθεσε την πρώτη</button>
          </div>
        ) : isSearch ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="t-body secondary">Δεν βρέθηκαν συναλλαγές με «pizzeria»</div>
          </div>
        ) : (
          <>
            <div className="date-header"><span>4 Μαΐου, Σάββατο</span><span className="num">+2.500 €</span></div>
            <div className="list" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-light)' }}>
              <TxRow {...SAMPLE_TX[0]} />
            </div>

            <div className="date-header"><span>3 Μαΐου, Παρασκευή</span><span className="num neg">−145 €</span></div>
            <div className="list" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-light)' }}>
              <TxRow {...SAMPLE_TX[1]} />
            </div>

            <div className="date-header"><span>2 Μαΐου, Πέμπτη</span><span className="num neg">−168 €</span></div>
            <div className="list" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-light)' }}>
              <TxRow {...SAMPLE_TX[2]} />
            </div>

            <div className="date-header"><span>1 Μαΐου, Τετάρτη</span><span className="num pos">+800 €</span></div>
            <div className="list" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-light)' }}>
              <TxRow {...SAMPLE_TX[3]} />
            </div>

            <div className="date-header"><span>30 Απριλίου</span><span className="num neg">−68 €</span></div>
            <div className="list" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-light)' }}>
              <TxRow {...SAMPLE_TX[4]} />
            </div>
          </>
        )}
      </div>

      {!isEmpty && <button className="fab"><Icon name="plus" size={22} /></button>}
    </Wrap>
  );
}

// ─── 5. Transaction Detail ──────────────────────────────────
function TransactionDetailScreen({ w = 375, h = 780, plain }) {
  const Wrap = plain ? PlainScreen : PhoneFrame;
  return (
    <Wrap w={w} h={h}>
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">Συναλλαγή</div>
        </div>
        <button className="btn-ghost" style={{ color: 'var(--expense)', padding: 4 }}><Icon name="trash" size={18} /></button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 96px' }}>
        {/* photo */}
        <div className="img-ph" style={{ height: 180, margin: '16px 16px 24px', borderRadius: 8 }}>
          φωτογραφία απόδειξης
        </div>

        <div style={{ padding: '0 20px' }}>
          <div className="t-label" style={{ marginBottom: 4 }}>Ποσό</div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--expense)', fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>
            −145,20 €
          </div>
          <div className="t-body secondary" style={{ marginBottom: 24 }}>Ψώνια λαχαναγορά · Πρώτες ύλες</div>

          <div className="card" style={{ padding: 0 }}>
            <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="t-label" style={{ color: 'var(--text-muted)' }}>Είδος</div>
              <div className="t-body">Έξοδο</div>
            </div>
            <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="t-label" style={{ color: 'var(--text-muted)' }}>Κατηγορία</div>
              <div className="t-body">Πρώτες ύλες</div>
            </div>
            <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="t-label" style={{ color: 'var(--text-muted)' }}>Λογαριασμός</div>
              <div className="t-body">Ταμείο Evochia</div>
            </div>
            <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="t-label" style={{ color: 'var(--text-muted)' }}>Ημερομηνία</div>
              <div className="t-body">3 Μαΐου 2026</div>
            </div>
            <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="t-label" style={{ color: 'var(--text-muted)' }}>ΦΠΑ</div>
              <div className="t-body">13% · 16,70 €</div>
            </div>
            <div className="row between" style={{ padding: '14px 16px' }}>
              <div className="t-label" style={{ color: 'var(--text-muted)' }}>Tag</div>
              <div className="t-body">Cold Kitchen Project</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="t-label" style={{ marginBottom: 6 }}>Σημειώσεις</div>
            <div className="t-body secondary" style={{ lineHeight: 1.5 }}>
              Λαχανικά εποχής για το Σαββατιάτικο pop-up στο Cold Kitchen.
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <div className="t-caption">Καταχωρήθηκε 3 Μαΐ 14:32 · Manual</div>
            <div className="t-caption">Τελευταία ενημέρωση: 3 Μαΐ 14:32</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid var(--border-light)', background: 'var(--cream)' }}>
        <button className="btn btn-secondary"><Icon name="edit" size={16} /> Επεξεργασία</button>
        <button className="btn btn-primary">Αποθήκευση</button>
      </div>
    </Wrap>
  );
}

// ─── 6. Recurring Templates ─────────────────────────────────
function RecurringScreen({ w = 375, h = 780, plain }) {
  const Wrap = plain ? PlainScreen : PhoneFrame;
  const items = [
    { desc: 'Ενοίκιο εργαστηρίου', freq: 'Μηνιαία · 1ή του μήνα', next: '1 Ιουν', amount: '−650,00 €', type: 'expense', active: true },
    { desc: 'ΔΕΗ ρεύμα', freq: 'Διμηνιαία · ~5η', next: '5 Ιουν', amount: '−180,00 €', type: 'expense', active: true },
    { desc: 'Internet / Τηλεφωνία', freq: 'Μηνιαία · 12η', next: '12 Μαΐ', amount: '−45,00 €', type: 'expense', active: true },
    { desc: 'Ασφάλιστρα ΕΦΚΑ', freq: 'Μηνιαία · 25η', next: '25 Μαΐ', amount: '−185,00 €', type: 'expense', active: true },
    { desc: 'Λογιστής', freq: 'Μηνιαία · τέλος', next: '31 Μαΐ', amount: '−120,00 €', type: 'expense', active: false },
    { desc: 'Συνδρομή Notion', freq: 'Ετήσια · Σεπτ', next: '14 Σεπ', amount: '−96,00 €', type: 'expense', active: true },
  ];

  return (
    <Wrap w={w} h={h}>
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">Πάγια</div>
        </div>
        <button className="btn btn-secondary" style={{ minHeight: 32, padding: '6px 12px', fontSize: 13 }}><Icon name="plus" size={14} /> Νέο</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 80px' }}>
        <div className="t-caption" style={{ marginBottom: 12 }}>
          Αυτόματες εγγραφές για επαναλαμβανόμενα έσοδα/έξοδα. Δημιουργούνται αυτόματα την ημέρα λήξης.
        </div>

        <div className="list">
          {items.map((it, i) => (
            <div key={i} className="row" style={{ padding: 14, borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--border-light)', gap: 12, alignItems: 'flex-start', opacity: it.active ? 1 : 0.55 }}>
              <div className="grow">
                <div className="t-body" style={{ fontWeight: 500, marginBottom: 2 }}>{it.desc}</div>
                <div className="t-caption">{it.freq}</div>
                <div className="t-caption" style={{ marginTop: 2, color: 'var(--text-secondary)' }}>Επόμενη: {it.next}</div>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 8 }}>
                <div className="num-md neg">{it.amount}</div>
                <div className={`toggle ${it.active ? 'on' : ''}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="card card-sand" style={{ marginTop: 20, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="warn" size={16} style={{ color: 'var(--warning)', marginTop: 1 }} />
          <div className="t-caption" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Επόμενες αυτόματες χρεώσεις: <strong>3 πάγια έξοδα · 350,00 €</strong> τις επόμενες 7 ημέρες.
          </div>
        </div>
      </div>
    </Wrap>
  );
}

// ─── 7. VAT Summary ─────────────────────────────────────────
function VATScreen({ w = 768, h = 780 }) {
  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 24px' }}>
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">ΦΠΑ</div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <button className="chip"><Icon name="calendar" size={12} /> 2026 <Icon name="chevronDown" size={12} /></button>
          <button className="btn btn-secondary" style={{ minHeight: 32, padding: '6px 12px', fontSize: 13 }}><Icon name="download" size={14} /> Excel</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div className="stack-16" style={{ marginBottom: 24 }}>
          <div>
            <div className="t-label" style={{ marginBottom: 4 }}>Ετήσιο σύνολο</div>
            <div className="t-h1">Έτος 2026 · Δηλώσεις ΦΠΑ ανά τρίμηνο</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { q: 'Q1', period: 'Ιαν–Μαρ', out: '1.044 €', inp: '512 €', net: '532 €', status: 'Υποβλήθηκε', filed: true },
            { q: 'Q2', period: 'Απρ–Ιουν', out: '720 €', inp: '308 €', net: '412 €', status: 'Σε εξέλιξη · 25 Ιουλ', filed: false },
            { q: 'Q3', period: 'Ιουλ–Σεπ', out: '—', inp: '—', net: '—', status: 'Μελλοντικό', filed: false, future: true },
            { q: 'Q4', period: 'Οκτ–Δεκ', out: '—', inp: '—', net: '—', status: 'Μελλοντικό', filed: false, future: true },
          ].map((q, i) => (
            <div key={i} className="quarter">
              <div className="between">
                <div>
                  <div className="t-label">{q.q} · {q.period}</div>
                  <div className="t-caption" style={{ marginTop: 4, color: q.filed ? 'var(--income)' : q.future ? 'var(--text-muted)' : 'var(--warning)' }}>
                    {q.filed ? '✓ ' : q.future ? '○ ' : '◐ '}{q.status}
                  </div>
                </div>
                <Icon name="chevronRight" size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="row-line">
                <span className="t-caption">ΦΠΑ Εκροών</span>
                <span className="num-md">{q.out}</span>
              </div>
              <div className="row-line">
                <span className="t-caption">ΦΠΑ Εισροών</span>
                <span className="num-md">{q.inp}</span>
              </div>
              <div className="row-line">
                <span className="t-h3">Καθαρό ΦΠΑ</span>
                <span className="num-lg">{q.net}</span>
              </div>
            </div>
          ))}
        </div>

        {/* annual total card */}
        <div className="quarter is-total">
          <div className="between">
            <div>
              <div className="t-label" style={{ color: 'var(--gold-soft)' }}>Σύνολο 2026 (μέχρι σήμερα)</div>
              <div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)', marginTop: 4 }}>Q1 υποβλήθηκε · Q2 σε εξέλιξη</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 4 }}>
            <div>
              <div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)' }}>Εκροών</div>
              <div className="num-lg" style={{ color: 'var(--text-on-dark)', marginTop: 4 }}>1.764 €</div>
            </div>
            <div>
              <div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)' }}>Εισροών</div>
              <div className="num-lg" style={{ color: 'var(--text-on-dark)', marginTop: 4 }}>820 €</div>
            </div>
            <div>
              <div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)' }}>Καθαρό</div>
              <div className="num-xl" style={{ color: 'var(--gold-soft)', marginTop: 4 }}>944 €</div>
            </div>
          </div>
        </div>
      </div>
    </PlainScreen>
  );
}

// ─── 8. Forecast ────────────────────────────────────────────
function ForecastScreen({ w = 1024, h = 720 }) {
  const months = [
    { label: 'Μάι', y: 3320 },
    { label: 'Ιουν', y: 6420 },
    { label: 'Ιουλ', y: 9180 },
    { label: 'Αύγ', y: 12340 },
    { label: 'Σεπ', y: 14820 },
    { label: 'Οκτ', y: 16920 },
    { label: 'Νοέ', y: 19200 },
    { label: 'Δεκ', y: 23120 },
    { label: 'Ιαν', y: 24400 },
    { label: 'Φεβ', y: 26100 },
    { label: 'Μαρ', y: 28350 },
    { label: 'Απρ', y: 31200 },
  ];
  const rows = [
    { m: 'Μάιος 2026', inc: '4.500', exp: '1.180', net: '+3.320', cum: '3.320', actual: true },
    { m: 'Ιούνιος', inc: '4.200', exp: '1.100', net: '+3.100', cum: '6.420', actual: false },
    { m: 'Ιούλιος', inc: '3.860', exp: '1.100', net: '+2.760', cum: '9.180', actual: false },
    { m: 'Αύγουστος', inc: '4.260', exp: '1.100', net: '+3.160', cum: '12.340', actual: false },
    { m: 'Σεπτέμβριος', inc: '3.580', exp: '1.100', net: '+2.480', cum: '14.820', actual: false },
    { m: 'Οκτώβριος', inc: '3.200', exp: '1.100', net: '+2.100', cum: '16.920', actual: false },
  ];

  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">Πρόβλεψη</div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <button className="chip"><Icon name="calendar" size={12} /> 12 μήνες <Icon name="chevronDown" size={12} /></button>
          <SyncPill status="synced" />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div className="row" style={{ marginBottom: 20, gap: 24, alignItems: 'flex-end' }}>
          <div>
            <div className="t-label" style={{ marginBottom: 4 }}>Σωρευτικό καθαρό · 12μηνη πρόβλεψη</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>+31.200 €</div>
            <div className="t-caption" style={{ marginTop: 4 }}>Βάσει πάγιων εξόδων + προγραμματισμένων εκδηλώσεων</div>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <LineChart points={months} height={220} />
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
            <div className="t-h3">Ανάλυση ανά μήνα</div>
            <div className="t-caption">● Πραγματικό · ○ Πρόβλεψη</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sand)' }}>
                {['Μήνας','Έσοδα','Έξοδα','Καθαρό','Σωρευτικό'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 18px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 18px', fontSize: 14 }}>
                    <span style={{ color: r.actual ? 'var(--income)' : 'var(--text-muted)', marginRight: 8 }}>{r.actual ? '●' : '○'}</span>
                    {r.m}
                  </td>
                  <td className="num" style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--income)' }}>{r.inc}</td>
                  <td className="num" style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--expense)' }}>{r.exp}</td>
                  <td className="num" style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 600 }}>{r.net}</td>
                  <td className="num" style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.cum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlainScreen>
  );
}

// ─── 9. Settings ────────────────────────────────────────────
function SettingsScreen({ w = 375, h = 780, plain }) {
  const Wrap = plain ? PlainScreen : PhoneFrame;
  return (
    <Wrap w={w} h={h}>
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">Ρυθμίσεις</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 80px' }}>
        <Section title="Λογαριασμός">
          <Row label="Email" value="heraklis@evochia.gr" />
          <Row label="Όνομα" value="Heraklis · Evochia" />
          <Row label="Αποσύνδεση" danger trailing={<Icon name="signOut" size={16} />} />
        </Section>

        <Section title="Συγχρονισμός">
          <Row label="Κατάσταση" value={<SyncPill status="synced" />} />
          <Row label="Τελευταίος συγχρονισμός" value="πριν από 2 λεπτά" />
          <Row label="Συγχρονισμός τώρα" trailing={<Icon name="refresh" size={16} />} />
        </Section>

        <Section title="Δεδομένα">
          <Row label="Backup SQLite" trailing={<Icon name="download" size={16} />} />
          <Row label="Επαναφορά από αρχείο" trailing={<Icon name="upload" size={16} />} />
          <Row label="Εξαγωγή Excel" trailing={<Icon name="download" size={16} />} />
        </Section>

        <Section title="Προτιμήσεις">
          <Row label="Προεπιλεγμένος ΦΠΑ" value="24%" trailing={<Icon name="chevronRight" size={14} />} />
          <Row label="Νόμισμα" value="EUR (€)" trailing={<Icon name="chevronRight" size={14} />} />
          <Row label="Έναρξη ημέρας" value="06:00" trailing={<Icon name="chevronRight" size={14} />} />
        </Section>

        <Section title="Σχετικά">
          <Row label="Έκδοση" value="1.0.3" />
          <Row label="Έλεγχος για ενημερώσεις" trailing={<Icon name="chevronRight" size={14} />} />
          <Row label="Άδεια χρήσης" trailing={<Icon name="chevronRight" size={14} />} />
        </Section>

        <div className="t-caption" style={{ textAlign: 'center', padding: '24px 0 12px', color: 'var(--gold)' }}>◆ Evochia Finance</div>
      </div>
    </Wrap>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="t-label" style={{ padding: '0 4px 8px' }}>{title}</div>
      <div className="card" style={{ padding: 0 }}>
        {children}
      </div>
    </div>
  );
}
function Row({ label, value, trailing, danger }) {
  return (
    <div className="row between" style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
      <div className="t-body" style={{ color: danger ? 'var(--expense)' : 'var(--text-primary)' }}>{label}</div>
      <div className="row" style={{ gap: 10, color: 'var(--text-secondary)' }}>
        {value && <div className="t-body" style={{ color: danger ? 'var(--expense)' : 'var(--text-secondary)' }}>{value}</div>}
        {trailing}
      </div>
    </div>
  );
}

// ─── Desktop versions of remaining screens ───────────────────

function AddTransactionDesktop({ w = 1024, h = 720 }) {
  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}><Icon name="back" size={20} /></button>
          <div className="t-h2">Νέα συναλλαγή</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" style={{ minHeight: 36 }}>Ακύρωση</button>
          <button className="btn btn-primary" style={{ minHeight: 36 }}>Καταχώρηση</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
        <div className="stack-24">
          <div>
            <div className="t-label">Ποσό</div>
            <input className="input input-amount" defaultValue="145,20 €" style={{ marginTop: 6, fontSize: 40 }} />
          </div>
          <div>
            <div className="t-label" style={{ marginBottom: 6 }}>Είδος</div>
            <div className="segmented" style={{ display: 'inline-flex' }}>
              <button>Έσοδο</button><button className="active">Έξοδο</button><button>Άλλο</button>
            </div>
          </div>
          <div className="field">
            <label>Περιγραφή</label>
            <input className="input" defaultValue="Ψώνια λαχαναγορά" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Κατηγορία</label>
              <div className="input row between" style={{ cursor: 'pointer' }}><span>Πρώτες ύλες</span><Icon name="chevronDown" size={14} /></div></div>
            <div className="field"><label>Λογαριασμός</label>
              <div className="input row between" style={{ cursor: 'pointer' }}><span>Ταμείο Evochia</span><Icon name="chevronDown" size={14} /></div></div>
            <div className="field"><label>Ημερομηνία</label>
              <div className="input row between" style={{ cursor: 'pointer' }}><span>3 Μαΐου 2026</span><Icon name="calendar" size={14} /></div></div>
            <div className="field"><label>ΦΠΑ</label>
              <div className="row" style={{ gap: 6 }}>
                {['24%','13%','6%','0%'].map((v,i) => <button key={v} className={`chip ${i===1?'active':''}`} style={{ flex: 1, justifyContent: 'center', padding: '9px 0' }}>{v}</button>)}
              </div></div>
          </div>
          <div className="field"><label>Tag</label>
            <input className="input" defaultValue="Cold Kitchen Project" /></div>
          <div className="field"><label>Σημειώσεις</label>
            <textarea className="textarea" rows="3" defaultValue="Λαχανικά εποχής για το Σαββατιάτικο pop-up στο Cold Kitchen." /></div>
        </div>
        <div className="stack-16">
          <div className="t-label">Φωτογραφία απόδειξης</div>
          <div className="img-ph" style={{ height: 280 }}>drag & drop · ή Σάρωση</div>
          <button className="btn btn-secondary btn-block"><Icon name="camera" size={16} /> Άνοιγμα κάμερας</button>
          <div className="card card-sand" style={{ padding: 14, marginTop: 8 }}>
            <div className="t-label" style={{ marginBottom: 8 }}>Σύνοψη</div>
            <div className="row between"><span className="t-caption">Καθαρό</span><span className="num-md">128,50 €</span></div>
            <div className="row between" style={{ marginTop: 6 }}><span className="t-caption">ΦΠΑ 13%</span><span className="num-md">16,70 €</span></div>
            <div className="row between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-light)' }}><span className="t-h3">Σύνολο</span><span className="num-lg neg">−145,20 €</span></div>
          </div>
        </div>
      </div>
    </PlainScreen>
  );
}

function TransactionsListDesktop({ w = 1024, h = 720, state = 'populated' }) {
  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <BrandMark />
        <div className="row" style={{ gap: 12 }}>
          <SyncPill status="synced" />
          <button className="btn btn-primary" style={{ minHeight: 32, padding: '6px 12px', fontSize: 13 }}><Icon name="plus" size={14} /> Νέα συναλλαγή</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <div>
            <div className="t-label">Ιστορικό</div>
            <div className="t-h1" style={{ marginTop: 4 }}>Συναλλαγές</div>
          </div>
          <div className="row" style={{ gap: 10, padding: '8px 12px', background: 'var(--sand)', borderRadius: 8, width: 320 }}>
            <Icon name="search" size={16} style={{ color: 'var(--text-muted)' }} />
            <input style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', fontFamily: 'inherit', fontSize: 14 }} placeholder="Αναζήτηση…" />
          </div>
        </div>
        <div className="row" style={{ gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className="chip active">Μάιος 2026 <Icon name="close" size={11} /></span>
          <span className="chip">Όλες οι κατηγορίες <Icon name="chevronDown" size={11} /></span>
          <span className="chip">Όλοι οι λογαριασμοί <Icon name="chevronDown" size={11} /></span>
          <span className="chip">Επαγγελματικά <Icon name="chevronDown" size={11} /></span>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sand)' }}>
                {['Ημερομηνία','Περιγραφή','Κατηγορία','Λογαριασμός','ΦΠΑ','Ποσό'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 18px', textAlign: i === 5 ? 'right' : 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_TX.map((tx, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td className="num" style={{ padding: '13px 18px', color: 'var(--text-secondary)' }}>{tx.date}</td>
                  <td style={{ padding: '13px 18px' }}>{tx.desc}</td>
                  <td style={{ padding: '13px 18px', color: 'var(--text-secondary)' }}>{tx.cat}</td>
                  <td style={{ padding: '13px 18px', color: 'var(--text-secondary)' }}>{tx.account}</td>
                  <td className="num" style={{ padding: '13px 18px', color: 'var(--text-muted)', fontSize: 12 }}>{tx.type === 'expense' ? '13%' : '24%'}</td>
                  <td className={`num ${tx.type === 'income' ? 'pos' : 'neg'}`} style={{ padding: '13px 18px', textAlign: 'right', fontWeight: 600 }}>
                    {tx.type === 'income' ? '+' : '−'}{tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlainScreen>
  );
}

function RecurringDesktop({ w = 1024, h = 720 }) {
  const items = [
    { desc: 'Ενοίκιο εργαστηρίου', freq: 'Μηνιαία · 1ή του μήνα', next: '1 Ιουν 2026', amount: '−650,00 €', cat: 'Ενοίκια', active: true },
    { desc: 'ΔΕΗ ρεύμα', freq: 'Διμηνιαία · ~5η', next: '5 Ιουν 2026', amount: '−180,00 €', cat: 'ΔΕΗ', active: true },
    { desc: 'Internet / Τηλεφωνία', freq: 'Μηνιαία · 12η', next: '12 Μαΐ 2026', amount: '−45,00 €', cat: 'Επικοινωνίες', active: true },
    { desc: 'Ασφάλιστρα ΕΦΚΑ', freq: 'Μηνιαία · 25η', next: '25 Μαΐ 2026', amount: '−185,00 €', cat: 'Ασφάλιστρα', active: true },
    { desc: 'Λογιστής', freq: 'Μηνιαία · τέλος', next: '31 Μαΐ 2026', amount: '−120,00 €', cat: 'Λογιστής', active: false },
    { desc: 'Συνδρομή Notion', freq: 'Ετήσια · Σεπτ', next: '14 Σεπ 2026', amount: '−96,00 €', cat: 'Συνδρομές', active: true },
    { desc: 'TheButly · μηνιαία προμήθεια', freq: 'Μηνιαία · 1ή', next: '1 Ιουν 2026', amount: '+420,00 €', cat: 'Συμβουλευτικές', active: true, income: true },
  ];
  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <BrandMark />
        <div className="row" style={{ gap: 8 }}>
          <SyncPill status="synced" />
          <button className="btn btn-primary" style={{ minHeight: 32, padding: '6px 12px', fontSize: 13 }}><Icon name="plus" size={14} /> Νέο πάγιο</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div className="row between" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
          <div>
            <div className="t-label">Αυτόματες εγγραφές</div>
            <div className="t-h1" style={{ marginTop: 4 }}>Πάγια έσοδα & έξοδα</div>
            <div className="t-caption" style={{ marginTop: 4 }}>Δημιουργούνται αυτόματα την ημέρα λήξης τους.</div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div className="card" style={{ padding: '10px 16px' }}><div className="t-label">Ενεργά</div><div className="num-lg" style={{ marginTop: 2 }}>6</div></div>
            <div className="card" style={{ padding: '10px 16px' }}><div className="t-label">Επόμενες 7 μέρες</div><div className="num-lg neg" style={{ marginTop: 2 }}>−350 €</div></div>
          </div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sand)' }}>
                {['','Περιγραφή','Συχνότητα','Επόμενη','Ποσό',''].map((h,i) => (
                  <th key={i} style={{ padding: '10px 18px', textAlign: i===4?'right':'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-light)', opacity: it.active ? 1 : 0.55 }}>
                  <td style={{ padding: '14px 18px', width: 60 }}><div className={`toggle ${it.active ? 'on' : ''}`} /></td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 500 }}>{it.desc}</div>
                    <div className="t-caption">{it.cat}</div>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{it.freq}</td>
                  <td className="num" style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{it.next}</td>
                  <td className={`num ${it.income ? 'pos' : 'neg'}`} style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 600 }}>{it.amount}</td>
                  <td style={{ padding: '14px 18px', width: 50, textAlign: 'right' }}>
                    <button className="btn-ghost" style={{ padding: 4, color: 'var(--text-muted)' }}><Icon name="more" size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlainScreen>
  );
}

function VATDesktop({ w = 1024, h = 720 }) {
  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <BrandMark />
        <div className="row" style={{ gap: 12 }}>
          <button className="chip"><Icon name="calendar" size={12} /> 2026 <Icon name="chevronDown" size={12} /></button>
          <button className="btn btn-secondary" style={{ minHeight: 32, padding: '6px 12px', fontSize: 13 }}><Icon name="download" size={14} /> Εξαγωγή Excel</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div style={{ marginBottom: 20 }}>
          <div className="t-label">ΦΠΑ</div>
          <div className="t-h1" style={{ marginTop: 4 }}>Έτος 2026 · Δηλώσεις ανά τρίμηνο</div>
          <div className="t-caption" style={{ marginTop: 4 }}>Q1 υποβλήθηκε · Q2 σε εξέλιξη · 25 Ιουλίου λήξη</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
          {[
            { q: 'Q1', period: 'Ιαν–Μαρ', out: '1.044 €', inp: '512 €', net: '532 €', status: 'Υποβλήθηκε', filed: true },
            { q: 'Q2', period: 'Απρ–Ιουν', out: '720 €', inp: '308 €', net: '412 €', status: 'Σε εξέλιξη · 25 Ιουλ', filed: false },
            { q: 'Q3', period: 'Ιουλ–Σεπ', out: '—', inp: '—', net: '—', status: 'Μελλοντικό', future: true },
            { q: 'Q4', period: 'Οκτ–Δεκ', out: '—', inp: '—', net: '—', status: 'Μελλοντικό', future: true },
          ].map((q, i) => (
            <div key={i} className="quarter">
              <div>
                <div className="t-label">{q.q} · {q.period}</div>
                <div className="t-caption" style={{ marginTop: 4, color: q.filed ? 'var(--income)' : q.future ? 'var(--text-muted)' : 'var(--warning)' }}>
                  {q.filed ? '✓ ' : q.future ? '○ ' : '◐ '}{q.status}
                </div>
              </div>
              <div className="row-line"><span className="t-caption">Εκροών</span><span className="num-md">{q.out}</span></div>
              <div className="row-line"><span className="t-caption">Εισροών</span><span className="num-md">{q.inp}</span></div>
              <div className="row-line"><span className="t-h3">Καθαρό</span><span className="num-lg">{q.net}</span></div>
            </div>
          ))}
        </div>
        <div className="quarter is-total" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 36 }}>
          <div>
            <div className="t-label" style={{ color: 'var(--gold-soft)' }}>Σύνολο 2026 (μέχρι σήμερα)</div>
            <div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)', marginTop: 4 }}>Q1 ✓ · Q2 σε εξέλιξη</div>
          </div>
          <div><div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)' }}>Εκροών</div><div className="num-lg" style={{ color: 'var(--text-on-dark)', marginTop: 4 }}>1.764 €</div></div>
          <div><div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)' }}>Εισροών</div><div className="num-lg" style={{ color: 'var(--text-on-dark)', marginTop: 4 }}>820 €</div></div>
          <div><div className="t-caption" style={{ color: 'rgba(250,248,242,0.6)' }}>Καθαρό</div><div className="num-xl" style={{ color: 'var(--gold-soft)', marginTop: 4 }}>944 €</div></div>
        </div>
      </div>
    </PlainScreen>
  );
}

function SettingsDesktop({ w = 1024, h = 720 }) {
  const sections = [
    { title: 'Λογαριασμός', items: [
      { label: 'Email', value: 'heraklis@evochia.gr' },
      { label: 'Όνομα', value: 'Heraklis · Evochia' },
      { label: 'Αποσύνδεση', danger: true, trailing: <Icon name="signOut" size={16} /> },
    ]},
    { title: 'Συγχρονισμός', items: [
      { label: 'Κατάσταση', value: <SyncPill status="synced" /> },
      { label: 'Τελευταίος συγχρονισμός', value: 'πριν από 2 λεπτά' },
      { label: 'Συγχρονισμός τώρα', trailing: <Icon name="refresh" size={16} /> },
    ]},
    { title: 'Δεδομένα', items: [
      { label: 'Backup SQLite', trailing: <Icon name="download" size={16} /> },
      { label: 'Επαναφορά από αρχείο', trailing: <Icon name="upload" size={16} /> },
      { label: 'Εξαγωγή Excel (περίοδος)', trailing: <Icon name="download" size={16} /> },
    ]},
    { title: 'Προτιμήσεις', items: [
      { label: 'Προεπιλεγμένος ΦΠΑ', value: '24%', trailing: <Icon name="chevronRight" size={14} /> },
      { label: 'Νόμισμα', value: 'EUR (€)', trailing: <Icon name="chevronRight" size={14} /> },
      { label: 'Έναρξη ημέρας', value: '06:00', trailing: <Icon name="chevronRight" size={14} /> },
    ]},
    { title: 'Σχετικά', items: [
      { label: 'Έκδοση', value: '1.0.3' },
      { label: 'Έλεγχος ενημερώσεων', trailing: <Icon name="chevronRight" size={14} /> },
      { label: 'Άδεια χρήσης', trailing: <Icon name="chevronRight" size={14} /> },
    ]},
  ];
  return (
    <PlainScreen w={w} h={h}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <BrandMark />
        <SyncPill status="synced" />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 32, display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32 }}>
        <div>
          <div className="t-label" style={{ marginBottom: 12 }}>Ρυθμίσεις</div>
          {sections.map((s, i) => (
            <div key={i} className="row" style={{ padding: '10px 12px', borderRadius: 6, background: i === 0 ? 'var(--sand)' : 'transparent', cursor: 'pointer', marginBottom: 2 }}>
              <span className="t-body" style={{ fontWeight: i === 0 ? 600 : 400 }}>{s.title}</span>
            </div>
          ))}
          <div className="t-caption" style={{ marginTop: 32, color: 'var(--gold)' }}>◆ Evochia Finance</div>
          <div className="t-caption">v1.0.3 · Tauri</div>
        </div>
        <div className="stack-32">
          {sections.map((s, i) => (
            <div key={i}>
              <div className="t-h2" style={{ marginBottom: 12 }}>{s.title}</div>
              <div className="card" style={{ padding: 0 }}>
                {s.items.map((it, j) => (
                  <div key={j} className="row between" style={{ padding: '14px 18px', borderBottom: j === s.items.length - 1 ? 'none' : '1px solid var(--border-light)', cursor: 'pointer' }}>
                    <div className="t-body" style={{ color: it.danger ? 'var(--expense)' : 'var(--text-primary)' }}>{it.label}</div>
                    <div className="row" style={{ gap: 10, color: 'var(--text-secondary)' }}>
                      {it.value && <div className="t-body" style={{ color: it.danger ? 'var(--expense)' : 'var(--text-secondary)' }}>{it.value}</div>}
                      {it.trailing}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PlainScreen>
  );
}

// Dashboard desktop with state variants
function DashboardDesktopState({ state = 'populated' }) {
  const isEmpty = state === 'empty';
  const isLoading = state === 'loading';
  return (
    <PlainScreen w={1024} h={720}>
      <div className="topbar" style={{ padding: '14px 32px' }}>
        <div className="row" style={{ gap: 32 }}>
          <BrandMark />
          <div className="row" style={{ gap: 4 }}>
            <button className="chip active"><Icon name="calendar" size={12} /> Μάιος 2026 <Icon name="chevronDown" size={12} /></button>
            <button className="chip">Επαγγελματικά <Icon name="chevronDown" size={12} /></button>
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <SyncPill status={state === 'offline' ? 'offline' : 'synced'} />
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KPI label="Έσοδα Μαΐου" value={isEmpty ? '—' : '4.500 €'} accent="income" loading={isLoading} empty={isEmpty} />
          <KPI label="Έξοδα Μαΐου" value={isEmpty ? '—' : '1.180 €'} accent="expense" loading={isLoading} empty={isEmpty} />
          <KPI label="Καθαρό" value={isEmpty ? '—' : '3.320 €'} sand loading={isLoading} empty={isEmpty} />
          <KPI label="ΦΠΑ" value={isEmpty ? '—' : '412 €'} sand loading={isLoading} empty={isEmpty} />
        </div>
        {isEmpty ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Icon name="receipt" size={26} />
            </div>
            <div className="t-h2">Καμία συναλλαγή ακόμα</div>
            <div className="t-body secondary" style={{ maxWidth: 320 }}>Πρόσθεσε την πρώτη σου συναλλαγή για να δεις τα έσοδα και τα έξοδά σου εδώ.</div>
            <button className="btn btn-primary"><Icon name="plus" size={16} /> Νέα συναλλαγή</button>
          </div>
        ) : isLoading ? (
          <div className="card" style={{ padding: 24 }}>
            <div className="skel" style={{ height: 16, width: 200, marginBottom: 16 }} />
            <div className="skel" style={{ height: 220 }} />
          </div>
        ) : (
          <div className="card" style={{ padding: 20 }}>
            <div className="t-h2" style={{ marginBottom: 16 }}>Έσοδα vs Έξοδα · 12 μήνες</div>
            <BarChart data={[
              { m: 'Ιούν', inc: 3200, exp: 2100 },{ m: 'Ιούλ', inc: 4800, exp: 2400 },
              { m: 'Αύγ', inc: 5200, exp: 2800 },{ m: 'Σεπ', inc: 3800, exp: 2200 },
              { m: 'Οκτ', inc: 3100, exp: 1900 },{ m: 'Νοέ', inc: 4400, exp: 2300 },
              { m: 'Δεκ', inc: 6200, exp: 3100 },{ m: 'Ιαν', inc: 2800, exp: 2100 },
              { m: 'Φεβ', inc: 3600, exp: 2050 },{ m: 'Μαρ', inc: 4100, exp: 2200 },
              { m: 'Απρ', inc: 5400, exp: 2400 },{ m: 'Μαΐ', inc: 4500, exp: 1180 },
            ]} height={220} />
          </div>
        )}
      </div>
    </PlainScreen>
  );
}

function LoginEmailSentDesktop() {
  return (
    <div className="evo" style={{ width: 1024, height: 720, display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--cream)' }}>
      <div style={{ background: 'var(--charcoal)', color: 'var(--text-on-dark)', padding: 56, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold-soft)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>◆ Evochia</div>
        <div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Finance</div>
          <div style={{ fontSize: 18, color: 'rgba(250,248,242,0.65)', marginTop: 12, maxWidth: 360 }}>Διαχείριση οικονομικών για ελεύθερους επαγγελματίες της εστίασης.</div>
        </div>
        <div className="t-caption" style={{ color: 'rgba(250,248,242,0.5)' }}>v1.0 · Tauri</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--income-light)', color: 'var(--income)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Icon name="check" size={22} />
          </div>
          <div className="t-h1" style={{ marginBottom: 8 }}>Έλεγξε το email σου</div>
          <div className="t-body secondary" style={{ marginBottom: 24, lineHeight: 1.55 }}>
            Στείλαμε σύνδεσμο σύνδεσης στο <strong style={{ color: 'var(--charcoal)' }}>heraklis@evochia.gr</strong>. Ο σύνδεσμος ισχύει για 15 λεπτά.
          </div>
          <button className="btn btn-secondary btn-block">Άνοιγμα Mail</button>
          <div className="t-caption" style={{ textAlign: 'center', marginTop: 16 }}>Λάθος email; <a style={{ color: 'var(--gold)', textDecoration: 'none' }}>Επιστροφή</a></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PhoneFrame, PlainScreen,
  LoginScreen, DashboardMobile, DashboardDesktop, DashboardDesktopState,
  AddTransactionScreen, AddTransactionDesktop,
  TransactionsListScreen, TransactionsListDesktop,
  TransactionDetailScreen,
  RecurringScreen, RecurringDesktop,
  VATScreen, VATDesktop,
  ForecastScreen, SettingsScreen, SettingsDesktop,
  LoginEmailSentDesktop,
});
