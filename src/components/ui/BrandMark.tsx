// Brand mark used in app header and login.
// Rheo — independent product brand.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-mark flex items-center gap-1.5 ${className}`}>
      <img src="/app-icon.png" alt="" aria-hidden="true" className="brand-icon h-6 w-6 rounded" />
      <span className="font-semibold">Rheo</span>
    </div>
  );
}
