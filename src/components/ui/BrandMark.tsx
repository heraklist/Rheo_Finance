// Brand mark used in app header.
// Per user feedback (chat 2026-05-06): removed "Evochia" prefix —
// the app *is* the Evochia tool, redundant to repeat.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-mark flex items-baseline ${className}`}>
      <span className="diamond text-gold">◆</span>
      <span>Finance</span>
    </div>
  );
}
