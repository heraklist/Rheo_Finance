// Evochia Finance — shared UI primitives

// Lucide-ish icons (1.5px stroke, currentColor)
const Ico = {
  arrow: <path d="M15 6l-6 6 6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  filter: <path d="M3 4h18l-7 9v6l-4 2v-8z"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  check: <path d="M20 6 9 17l-5-5"/>,
  refresh: <><path d="M3 12a9 9 0 0 1 15-6.7l3-2.3"/><path d="M21 3v6h-6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 21"/><path d="M3 21v-6h6"/></>,
  warn: <><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.7 3h16.96a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="4"/></>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  chevronRight: <path d="m9 6 6 6-6 6"/>,
  calendar: <><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  trash: <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></>,
  receipt: <><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></>,
  bag: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
  car: <><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></>,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
  close: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  trending: <><path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></>,
  signOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
};

function Icon({ name, size = 18, className = "icon", style }) {
  const sz = typeof size === 'number' ? size : 18;
  return (
    <svg className={className} viewBox="0 0 24 24" width={sz} height={sz} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {Ico[name] || null}
    </svg>
  );
}

// Brand mark
function BrandMark({ small }) {
  return (
    <div className="brand">
      <span className="brand-mark" style={{ fontSize: small ? 14 : 16 }}>
        Evochia<span className="diamond">◆</span>Finance
      </span>
    </div>
  );
}

// Sync status pill
function SyncPill({ status = 'synced' }) {
  const map = {
    synced: { label: 'Ενημερωμένο', cls: 'synced', icon: 'check' },
    syncing: { label: 'Συγχρονισμός…', cls: 'syncing', icon: 'refresh' },
    offline: { label: 'Offline · 3 αλλαγές', cls: 'offline', icon: 'warn' },
    error: { label: 'Σφάλμα · Επανάληψη', cls: 'error', icon: 'warn' },
  };
  const s = map[status];
  return (
    <span className={`sync ${s.cls}`}>
      <span className="dot" />
      {s.label}
    </span>
  );
}

// KPI Tile — signature component
function KPI({ label, value, accent = 'default', trend, sand, loading, empty }) {
  return (
    <div className={`kpi ${sand ? 'kpi-sand' : ''} ${accent === 'income' ? 'is-income' : ''} ${accent === 'expense' ? 'is-expense' : ''}`}>
      <div className="t-label">{label}</div>
      {loading ? (
        <div className="skel" style={{ height: 28, width: '70%' }} />
      ) : (
        <div className="kpi-value">{empty ? '—' : value}</div>
      )}
      {trend && !loading && !empty && <div className="kpi-trend">{trend}</div>}
    </div>
  );
}

// Transaction row
function TxRow({ desc, amount, type = 'expense', cat, account, date, thumb, photo }) {
  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : '';
  const cls = type === 'income' ? 'pos' : type === 'expense' ? 'neg' : '';
  return (
    <div className="tx">
      <div className="tx-thumb">
        {photo ? (
          <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--sand)', backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.04) 4px 5px)' }} />
        ) : (
          thumb || <Icon name="receipt" size={14} />
        )}
      </div>
      <div className="tx-body">
        <div className="tx-desc">{desc}</div>
        <div className="tx-meta">{cat} · {account} · {date}</div>
      </div>
      <div className={`tx-amount ${cls}`}>{sign}{amount}</div>
    </div>
  );
}

// Bar chart for income vs expense (12 months)
function BarChart({ data, height = 140 }) {
  // data: [{ m: 'Ιούν', inc: number, exp: number }]
  const max = Math.max(...data.flatMap(d => [d.inc, d.exp]));
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%', width: '100%', justifyContent: 'center' }}>
            <div style={{ width: 9, height: `${(d.inc / max) * 100}%`, background: 'var(--income)', minHeight: 2 }} />
            <div style={{ width: 9, height: `${(d.exp / max) * 100}%`, background: 'var(--expense)', minHeight: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.m}</div>
        </div>
      ))}
    </div>
  );
}

// Line chart (forecast cumulative)
function LineChart({ points, width = 600, height = 180 }) {
  // points: [{x: month, y: value}], x assumed ordinal index
  const max = Math.max(...points.map(p => p.y));
  const min = Math.min(0, ...points.map(p => p.y));
  const range = max - min || 1;
  const pad = 24;
  const W = width, H = height;
  const xs = (i) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const ys = (v) => H - pad - ((v - min) / range) * (H - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p.y)}`).join(' ');
  const fill = `${d} L ${xs(points.length - 1)} ${H - pad} L ${xs(0)} ${H - pad} Z`;
  const zeroY = ys(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      {/* zero line */}
      <line x1={pad} x2={W - pad} y1={zeroY} y2={zeroY} stroke="var(--border-light)" strokeWidth="1" strokeDasharray="2 3" />
      <path d={fill} fill="var(--gold)" opacity="0.08" />
      <path d={d} stroke="var(--gold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xs(i)} cy={ys(p.y)} r="2.5" fill="var(--cream)" stroke="var(--gold)" strokeWidth="1.5" />
      ))}
      {points.map((p, i) => (
        <text key={`l${i}`} x={xs(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// Status bar (mobile) — Greek
function StatusBar({ time = '14:32' }) {
  return (
    <div className="status-bar">
      <span>{time}</span>
      <div className="icons">
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="6" width="2" height="4" rx="0.5"/><rect x="3" y="4" width="2" height="6" rx="0.5"/><rect x="6" y="2" width="2" height="8" rx="0.5"/><rect x="9" y="0" width="2" height="10" rx="0.5"/></svg>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1"><path d="M1 4 C 4 1, 10 1, 13 4" /><path d="M3 6 C 5 4, 9 4, 11 6" /><circle cx="7" cy="8" r="1" fill="currentColor"/></svg>
        <svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="currentColor"/><rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor"/><rect x="19" y="3.5" width="2" height="3" rx="0.5" fill="currentColor"/></svg>
      </div>
    </div>
  );
}

// Mobile header
function MobileHeader({ title, back, right, syncStatus = 'synced' }) {
  return (
    <div className="topbar">
      <div className="row" style={{ gap: 10 }}>
        {back ? (
          <button className="btn-ghost" style={{ padding: 0, color: 'var(--charcoal)' }}>
            <Icon name="back" size={20} />
          </button>
        ) : null}
        {title ? <div className="t-h2">{title}</div> : <BrandMark />}
      </div>
      <div className="row" style={{ gap: 10 }}>
        {syncStatus && <SyncPill status={syncStatus} />}
        {right}
      </div>
    </div>
  );
}

Object.assign(window, { Icon, BrandMark, SyncPill, KPI, TxRow, BarChart, LineChart, StatusBar, MobileHeader });
