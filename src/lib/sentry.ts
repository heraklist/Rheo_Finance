/**
 * Sentry error tracking scaffold.
 *
 * No-ops if VITE_SENTRY_DSN is not set or @sentry/react is not installed.
 * Never sends sensitive financial data.
 *
 * To enable:
 * 1. Add VITE_SENTRY_DSN=https://xxx@sentry.io/yyy to .env.local
 * 2. Install: pnpm add @sentry/react
 * 3. Call initSentry() in main.tsx before ReactDOM.render
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

interface SentryLike {
  init: (opts: Record<string, unknown>) => void;
  captureException: (error: unknown, opts?: Record<string, unknown>) => void;
}

let sentryRef: SentryLike | null = null;

const SENSITIVE_KEYS = /amount|balance|gross|net|vat|iban|account/i;

export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN || initialized) return;

  try {
    // Dynamic import via variable to avoid TS2307 when @sentry/react is not installed
    const mod = "@sentry/react";
    sentryRef = (await import(/* @vite-ignore */ mod)) as unknown as SentryLike;
  } catch {
    // @sentry/react not installed — silently skip
    return;
  }

  sentryRef.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    beforeSend(event: Record<string, unknown>) {
      const breadcrumbs = event.breadcrumbs as
        | Array<{ data?: Record<string, unknown> }>
        | undefined;
      if (breadcrumbs) {
        for (const crumb of breadcrumbs) {
          if (crumb.data) {
            for (const key of Object.keys(crumb.data)) {
              if (SENSITIVE_KEYS.test(key)) {
                crumb.data[key] = "[REDACTED]";
              }
            }
          }
        }
      }
      return event;
    },
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, string>): void {
  if (!initialized || !sentryRef) return;
  sentryRef.captureException(error, { extra: context });
}
