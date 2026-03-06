import { getDb } from '@/lib/db';

// ============================================================
// Agent Error Logging — Persist agent errors to DB for admin visibility
// ============================================================

let _tableMigrated = false;

async function ensureAgentLogTable() {
    if (_tableMigrated) return;
    const db = getDb();
    await db.execute({
        sql: `CREATE TABLE IF NOT EXISTS agent_error_log (
            id TEXT PRIMARY KEY,
            agent_name TEXT NOT NULL,
            error_message TEXT NOT NULL,
            error_stack TEXT,
            context TEXT,
            severity TEXT DEFAULT 'error',
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
    });
    _tableMigrated = true;
}

export async function logAgentError(params: {
    agentName: string;
    error: Error | string;
    context?: string;
    severity?: 'warning' | 'error' | 'critical';
}): Promise<void> {
    try {
        await ensureAgentLogTable();
        const db = getDb();
        const err = params.error instanceof Error ? params.error : new Error(String(params.error));
        const id = `ae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await db.execute({
            sql: `INSERT INTO agent_error_log (id, agent_name, error_message, error_stack, context, severity)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                params.agentName,
                err.message,
                err.stack || '',
                params.context || '',
                params.severity || 'error',
            ],
        });
    } catch (logErr) {
        // Don't let logging errors crash the agent
        console.error('[agent-error-log] Failed to persist error:', logErr);
    }
}

export async function getRecentAgentErrors(limit: number = 20): Promise<Array<{
    id: string;
    agent_name: string;
    error_message: string;
    context: string;
    severity: string;
    created_at: string;
}>> {
    try {
        await ensureAgentLogTable();
        const db = getDb();
        const result = await db.execute({
            sql: `SELECT id, agent_name, error_message, context, severity, created_at
                  FROM agent_error_log
                  ORDER BY created_at DESC
                  LIMIT ?`,
            args: [limit],
        });
        return result.rows.map(r => ({
            id: String(r.id),
            agent_name: String(r.agent_name),
            error_message: String(r.error_message),
            context: String(r.context || ''),
            severity: String(r.severity || 'error'),
            created_at: String(r.created_at),
        }));
    } catch {
        return [];
    }
}
