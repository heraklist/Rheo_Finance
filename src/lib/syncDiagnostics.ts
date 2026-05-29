import { getDb } from "@/lib/db";

export const MAX_RETRYABLE_SYNC_ATTEMPTS = 5;

export interface SyncDiagnosticIssue {
  id: number;
  entityType: string;
  entityId: string;
  operation: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export interface SyncDiagnostics {
  pendingCount: number;
  retryableCount: number;
  stuckCount: number;
  issues: SyncDiagnosticIssue[];
}

interface SyncDiagnosticRow {
  id: number;
  entity_type: string;
  entity_id: string;
  operation: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

export async function getSyncDiagnostics(): Promise<SyncDiagnostics> {
  const db = await getDb();
  const rows = await db.select<SyncDiagnosticRow[]>(
    `SELECT id, entity_type, entity_id, operation, attempts, last_error, created_at
     FROM sync_outbox
     ORDER BY attempts DESC, created_at ASC
     LIMIT 20`,
  );

  let retryableCount = 0;
  let stuckCount = 0;

  const issues = rows.map((row) => {
    if (row.attempts >= MAX_RETRYABLE_SYNC_ATTEMPTS) {
      stuckCount += 1;
    } else {
      retryableCount += 1;
    }

    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      attempts: row.attempts,
      lastError: row.last_error,
      createdAt: row.created_at,
    };
  });

  return {
    pendingCount: rows.length,
    retryableCount,
    stuckCount,
    issues,
  };
}
