import { getDb } from '@/lib/db';

// ============================================================
// Agent Schedule Configuration & DB Persistence
// Controls which agents run on cron and their schedule metadata.
// ============================================================

let _tableMigrated = false;

async function ensureScheduleTable() {
    if (_tableMigrated) return;
    const db = getDb();
    await db.execute({
        sql: `CREATE TABLE IF NOT EXISTS agent_schedule (
            agent_id TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 1,
            last_toggled_at TEXT,
            toggled_by TEXT
        )`,
        args: [],
    });
    _tableMigrated = true;
}

// ── Agent Schedule Config ──
// Static config for all 10 agents — their cron expression, description, etc.
export interface AgentScheduleConfig {
    id: string;
    name: string;
    emoji: string;
    cron: string;
    cronHuman: string;
    description: string;
    category: 'operations' | 'growth' | 'content' | 'finance';
}

export const AGENT_SCHEDULES: AgentScheduleConfig[] = [
    {
        id: 'qa',
        name: 'QA Agent',
        emoji: '🔍',
        cron: 'deploy',
        cronHuman: 'On Deploy',
        description: 'Audits routes, env vars, and build health',
        category: 'operations',
    },
    {
        id: 'cost-guardian',
        name: 'Cost Guardian',
        emoji: '💸',
        cron: '0 5 * * *',
        cronHuman: 'Daily at 5:00 AM UTC',
        description: 'Monitors API costs and usage alerts',
        category: 'finance',
    },
    {
        id: 'analytics',
        name: 'Analytics',
        emoji: '📊',
        cron: '0 6 * * *',
        cronHuman: 'Daily at 6:00 AM UTC',
        description: 'Snapshots MRR, users, and funnel metrics',
        category: 'finance',
    },
    {
        id: 'growth-ops',
        name: 'Growth Ops',
        emoji: '🚀',
        cron: '0 7 * * *',
        cronHuman: 'Daily at 7:00 AM UTC',
        description: 'Onboarding, activation, and growth tasks',
        category: 'growth',
    },
    {
        id: 'customer-success',
        name: 'Customer Success',
        emoji: '🤝',
        cron: '0 8 * * *',
        cronHuman: 'Daily at 8:00 AM UTC',
        description: 'Monitors user health and churn risk',
        category: 'growth',
    },
    {
        id: 'investor-pipeline',
        name: 'Investor Outreach',
        emoji: '💼',
        cron: '0 9 * * 1-5',
        cronHuman: 'Weekdays at 9:00 AM UTC',
        description: 'Drafts investor outreach and tracks pipeline',
        category: 'growth',
    },
    {
        id: 'content-marketing',
        name: 'Content Marketing',
        emoji: '📝',
        cron: '0 10 * * 1,3,5',
        cronHuman: 'Mon/Wed/Fri at 10:00 AM UTC',
        description: 'Generates social content and blog posts',
        category: 'content',
    },
    {
        id: 'community',
        name: 'Community',
        emoji: '🏘️',
        cron: '0 11 * * *',
        cronHuman: 'Daily at 11:00 AM UTC',
        description: 'Tracks community engagement and forums',
        category: 'content',
    },
    {
        id: 'instagram',
        name: 'Instagram',
        emoji: '📸',
        cron: '0 12 * * *',
        cronHuman: 'Daily at 12:00 PM UTC',
        description: 'Plans and queues Instagram content',
        category: 'content',
    },
    {
        id: 'education-outreach',
        name: 'Education Outreach',
        emoji: '🎓',
        cron: '0 13 * * 1-5',
        cronHuman: 'Weekdays at 1:00 PM UTC',
        description: 'Discovers music schools and drafts outreach',
        category: 'growth',
    },
];

// ── DB Operations ──

export async function getAgentEnabled(agentId: string): Promise<boolean> {
    await ensureScheduleTable();
    const db = getDb();
    const result = await db.execute({
        sql: 'SELECT enabled FROM agent_schedule WHERE agent_id = ?',
        args: [agentId],
    });
    // Default to enabled if no row exists
    if (result.rows.length === 0) return true;
    return Number(result.rows[0].enabled) === 1;
}

export async function toggleAgent(agentId: string, enabled: boolean): Promise<void> {
    await ensureScheduleTable();
    const db = getDb();
    await db.execute({
        sql: `INSERT INTO agent_schedule (agent_id, enabled, last_toggled_at)
              VALUES (?, ?, datetime('now'))
              ON CONFLICT(agent_id)
              DO UPDATE SET enabled = excluded.enabled, last_toggled_at = excluded.last_toggled_at`,
        args: [agentId, enabled ? 1 : 0],
    });
}

export async function getScheduleStatus(): Promise<Array<AgentScheduleConfig & { enabled: boolean; lastRun?: string; lastStatus?: string }>> {
    await ensureScheduleTable();
    const db = getDb();

    // Get enabled/disabled states
    const toggles = await db.execute({ sql: 'SELECT agent_id, enabled FROM agent_schedule', args: [] });
    const toggleMap = new Map<string, boolean>();
    for (const row of toggles.rows) {
        toggleMap.set(String(row.agent_id), Number(row.enabled) === 1);
    }

    // Get last run times from agent_runs table
    let lastRuns = new Map<string, { time: string; status: string }>();
    try {
        const runs = await db.execute({
            sql: `SELECT agent_id, MAX(started_at) as last_run, status
                  FROM agent_runs
                  GROUP BY agent_id`,
            args: [],
        });
        for (const row of runs.rows) {
            lastRuns.set(String(row.agent_id), {
                time: String(row.last_run),
                status: String(row.status),
            });
        }
    } catch { /* agent_runs may not exist yet */ }

    return AGENT_SCHEDULES.map(agent => ({
        ...agent,
        enabled: toggleMap.has(agent.id) ? toggleMap.get(agent.id)! : true,
        lastRun: lastRuns.get(agent.id)?.time,
        lastStatus: lastRuns.get(agent.id)?.status,
    }));
}
