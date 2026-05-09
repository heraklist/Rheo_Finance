import { Link } from "react-router-dom";

interface PlaceholderProps {
  title: string;
  description?: string;
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="px-4 py-12 text-center">
      <h1 className="text-h1 mb-2">{title}</h1>
      <p className="text-text-muted text-body mb-6">{description ?? "Σύντομα διαθέσιμο."}</p>
      <Link
        to="/"
        className="inline-block text-gold text-sm font-medium hover:text-charcoal transition-colors"
      >
        ← Επιστροφή στην αρχική
      </Link>
    </div>
  );
}
