import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-6">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-expense/20 text-expense inline-flex items-center justify-center mb-2">
              <span className="text-xl">!</span>
            </div>
            <h1 className="text-h2">Κάτι πήγε στραβά</h1>
            <p className="text-body text-text-secondary">
              Παρουσιάστηκε σφάλμα. Δοκίμασε να επανεκκινήσεις την εφαρμογή.
            </p>
            {this.state.error ? (
              <p className="text-caption text-text-muted break-all">{this.state.error.message}</p>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 bg-charcoal text-text-on-dark rounded-md py-3 px-6 text-sm font-medium hover:bg-charcoal-soft transition-colors"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Επανεκκίνηση
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
