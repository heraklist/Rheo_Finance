// Brand mark used in app header and login.
// Rheo — independent product brand.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-mark flex items-baseline ${className}`}>
      <span className="diamond text-gold">◆</span>
      <span>Rheo</span>
    </div>
  );
}
