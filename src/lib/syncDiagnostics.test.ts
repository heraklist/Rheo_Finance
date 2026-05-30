import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSyncDiagnostics, MAX_RETRYABLE_SYNC_ATTEMPTS } from "./syncDiagnostics";

const selectMock = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(async () => ({
    select: selectMock,
  })),
}));

describe("getSyncDiagnostics", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("returns empty diagnostics when the outbox is empty", async () => {
    selectMock.mockResolvedValueOnce([]);

    await expect(getSyncDiagnostics()).resolves.toEqual({
      pendingCount: 0,
      retryableCount: 0,
      stuckCount: 0,
      issues: [],
    });

    expect(selectMock).toHaveBeenCalledWith(expect.stringContaining("FROM sync_outbox"));
  });

  it("classifies retryable and stuck outbox rows", async () => {
    selectMock.mockResolvedValueOnce([
      {
        id: 1,
        entity_type: "transaction",
        entity_id: "tx-local-receipt",
        operation: "create",
        attempts: 1,
        last_error: "Receipt upload failed: network offline",
        created_at: "2026-05-30T08:00:00.000Z",
      },
      {
        id: 2,
        entity_type: "transaction",
        entity_id: "tx-stuck",
        operation: "update",
        attempts: MAX_RETRYABLE_SYNC_ATTEMPTS,
        last_error: "Remote row rejected",
        created_at: "2026-05-30T08:05:00.000Z",
      },
    ]);

    await expect(getSyncDiagnostics()).resolves.toEqual({
      pendingCount: 2,
      retryableCount: 1,
      stuckCount: 1,
      issues: [
        {
          id: 1,
          entityType: "transaction",
          entityId: "tx-local-receipt",
          operation: "create",
          attempts: 1,
          lastError: "Receipt upload failed: network offline",
          createdAt: "2026-05-30T08:00:00.000Z",
        },
        {
          id: 2,
          entityType: "transaction",
          entityId: "tx-stuck",
          operation: "update",
          attempts: MAX_RETRYABLE_SYNC_ATTEMPTS,
          lastError: "Remote row rejected",
          createdAt: "2026-05-30T08:05:00.000Z",
        },
      ],
    });
  });

  it("treats attempts above the retry threshold as stuck", async () => {
    selectMock.mockResolvedValueOnce([
      {
        id: 3,
        entity_type: "transaction",
        entity_id: "tx-above-threshold",
        operation: "delete",
        attempts: MAX_RETRYABLE_SYNC_ATTEMPTS + 2,
        last_error: null,
        created_at: "2026-05-30T08:10:00.000Z",
      },
    ]);

    const diagnostics = await getSyncDiagnostics();

    expect(diagnostics.pendingCount).toBe(1);
    expect(diagnostics.retryableCount).toBe(0);
    expect(diagnostics.stuckCount).toBe(1);
    expect(diagnostics.issues[0]?.attempts).toBe(MAX_RETRYABLE_SYNC_ATTEMPTS + 2);
  });
});
