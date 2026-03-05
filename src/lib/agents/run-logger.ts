import { getDb } from '@/lib/db';

// ============================================================
// Agent Run Logger — Shared logging for all agent runs
// Creates the agent_runs table and provides functions to
// log runs, query history, and aggregate stats.
// ============================================================

let _migrated = false;

export async function ensureAgentRunsSchema() {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS agent_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'running',
                started_at TEXT NOT NULL DEFAULT (datetime('now')),
                finished_at TEXT,
                duration_ms INTEGER,
                summary TEXT,
                alerts_count INTEGER DEFAULT 0,
                actions_count INTEGER DEFAULT 0,
                error TEXT,
                result_json TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id, started_at);
            CREATE INDEX IF NOT EXISTS idx_agent_runs_date ON agent_runs(started_at);
        `);
        _migrated = true;
    }
    return db;
}

export interface AgentRunLog {
    id: number;
    agent_id: string;
    agent_name: string;
    status: 'running' | 'success' | 'failed' | 'warning';
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    summary: string | null;
    alerts_count: number;
    actions_count: number;
    error: string | null;
}

/**
 * Start logging an agent run. Returns the run ID to update later.
 */
export async function logAgentStart(agentId: string, agentName: string): Promise<number> {
    const db = await ensureAgentRunsSchema();
    const result = await db.execute({
        sql: `INSERT INTO agent_runs (agent_id, agent_name, status) VALUES (?, ?, 'running')`,
        args: [agentId, agentName],
    });
    return Number(result.lastInsertRowid);
}

/**
 * Complete an agent run with status and summary.
 */
export async function logAgentComplete(
    runId: number,
    opts: {
        status: 'success' | 'failed' | 'warning';
        summary: string;
        alertsCount?: number;
        actionsCount?: number;
        error?: string;
        resultJson?: string;
    }
): Promise<void> {
    const db = await ensureAgentRunsSchema();
    await db.execute({
        sql: `UPDATE agent_runs SET
                status = ?,
                finished_at = datetime('now'),
                duration_ms = CAST((julianday('now') - julianday(started_at)) * 86400000 AS INTEGER),
                summary = ?,
                alerts_count = ?,
                actions_count = ?,
                error = ?,
                result_json = ?
              WHERE id = ?`,
        args: [
            opts.status,
            opts.summary,
            opts.alertsCount ?? 0,
            opts.actionsCount ?? 0,
            opts.error ?? null,
            opts.resultJson ?? null,
            runId,
        ],
    });
}

/**
 * Get recent agent runs across all agents.
 */
export async function getRecentAgentRuns(limit: number = 50): Promise<AgentRunLog[]> {
    const db = await ensureAgentRunsSchema();
    const result = await db.execute({
        sql: `SELECT id, agent_id, agent_name, status, started_at, finished_at,
                     duration_ms, summary, alerts_count, actions_count, error
              FROM agent_runs
              ORDER BY started_at DESC
              LIMIT ?`,
        args: [limit],
    });
    return result.rows.map(row => ({
        id: Number(row.id),
        agent_id: String(row.agent_id),
        agent_name: String(row.agent_name),
        status: String(row.status) as AgentRunLog['status'],
        started_at: String(row.started_at),
        finished_at: row.finished_at ? String(row.finished_at) : null,
        duration_ms: row.duration_ms ? Number(row.duration_ms) : null,
        summary: row.summary ? String(row.summary) : null,
        alerts_count: Number(row.alerts_count ?? 0),
        actions_count: Number(row.actions_count ?? 0),
        error: row.error ? String(row.error) : null,
    }));
}

/**
 * Get agent run stats (last 7 days).
 */
export async function getAgentRunStats(): Promise<Record<string, { runs: number; lastRun: string | null; lastStatus: string }>> {
    const db = await ensureAgentRunsSchema();
    const result = await db.execute({
        sql: `SELECT agent_id,
                     COUNT(*) as runs,
                     MAX(started_at) as last_run,
                     (SELECT status FROM agent_runs ar2 WHERE ar2.agent_id = agent_runs.agent_id ORDER BY started_at DESC LIMIT 1) as last_status
              FROM agent_runs
              WHERE started_at >= datetime('now', '-7 days')
              GROUP BY agent_id`,
        args: [],
    });

    const stats: Record<string, { runs: number; lastRun: string | null; lastStatus: string }> = {};
    for (const row of result.rows) {
        stats[String(row.agent_id)] = {
            runs: Number(row.runs),
            lastRun: row.last_run ? String(row.last_run) : null,
            lastStatus: String(row.last_status ?? 'unknown'),
        };
    }
    return stats;
}

/**
 * Wrap an agent function with automatic run logging.
 */
export function withRunLogging<T>(
    agentId: string,
    agentName: string,
    fn: () => Promise<T>,
    extractSummary: (result: T) => { summary: string; alertsCount?: number; actionsCount?: number },
): () => Promise<T> {
    return async () => {
        const runId = await logAgentStart(agentId, agentName);
        try {
            const result = await fn();
            const { summary, alertsCount, actionsCount } = extractSummary(result);
            const hasAlerts = (alertsCount ?? 0) > 0;
            await logAgentComplete(runId, {
                status: hasAlerts ? 'warning' : 'success',
                summary,
                alertsCount,
                actionsCount,
            });
            return result;
        } catch (err) {
            await logAgentComplete(runId, {
                status: 'failed',
                summary: 'Agent run failed',
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    };
}
