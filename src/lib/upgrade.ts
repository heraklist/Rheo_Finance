/**
 * Upgrade flow: opens Stripe checkout in external browser.
 *
 * Flow:
 * 1. App calls /api/checkout with a signed-in Supabase access token
 * 2. API returns Stripe Checkout URL
 * 3. App opens URL in external browser via Tauri shell
 * 4. User completes payment on Stripe
 * 5. Webhook updates Supabase
 * 6. App detects new tier on next subscription check
 */

import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_LANDING_URL as string | undefined;

/**
 * Opens the Stripe checkout page in the system browser.
 * Called from UpgradePrompt and Settings subscription section.
 */
export async function openUpgradeUrl(plan: "monthly" | "annual" = "monthly"): Promise<void> {
  const { user } = useAppStore.getState();

  if (!user?.email || !user?.id) {
    console.error("Cannot upgrade: user not authenticated");
    return;
  }

  if (!API_BASE) {
    console.error("Cannot upgrade: VITE_LANDING_URL not configured");
    return;
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const res = await fetch(`${API_BASE}/api/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Checkout error:", data);
      return;
    }

    const { url } = await res.json();
    if (!url) return;

    // Open in external browser via Tauri
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
  } catch (err) {
    console.error("Failed to open upgrade URL:", err);
  }
}

/**
 * Opens the Stripe Customer Portal for managing subscription.
 */
export async function openBillingPortal(): Promise<void> {
  if (!API_BASE) {
    console.error("Cannot open portal: VITE_LANDING_URL not configured");
    return;
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const res = await fetch(`${API_BASE}/api/portal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Portal error:", data);
      return;
    }

    const { url } = await res.json();
    if (!url) return;

    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
  } catch (err) {
    console.error("Failed to open billing portal:", err);
  }
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    console.error("Cannot continue billing flow: user session is missing");
    return null;
  }

  return accessToken;
}
