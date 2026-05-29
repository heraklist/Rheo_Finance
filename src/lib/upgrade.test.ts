import { beforeEach, describe, expect, it, vi } from "vitest";

const shellOpen = vi.fn();

vi.mock("@/lib/store", () => ({
  useAppStore: {
    getState: () => ({
      user: {
        id: "user-123",
        email: "user@example.com",
      },
    }),
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            access_token: "access-token-123",
          },
        },
      })),
    },
  },
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: shellOpen,
}));

describe("openUpgradeUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_LANDING_URL", "http://localhost:4173");
    shellOpen.mockReset();
  });

  it("sends the selected checkout tier and interval", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ url: "https://checkout.example/session" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const { openUpgradeUrl } = await import("@/lib/upgrade");
    await openUpgradeUrl("pro", "monthly");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:4173/api/checkout",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer access-token-123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier: "pro", interval: "monthly" }),
      }),
    );
    expect(shellOpen).toHaveBeenCalledWith("https://checkout.example/session");
  });

  it("does not open a browser window when checkout fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "tier must be valid" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const { openUpgradeUrl } = await import("@/lib/upgrade");
    await openUpgradeUrl("solo", "annual");

    expect(shellOpen).not.toHaveBeenCalled();
  });
});
