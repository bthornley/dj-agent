import { getDb } from '@/lib/db';

// ---- Scan Job Tracking ----

export interface ScanJob {
    id: string;
    userId: string;
    status: 'running' | 'done' | 'error';
    seedsTotal: number;
    seedsCompleted: number;
    leadsFound: number;
    leadsFiltered: number;
    errors: string[];
    results: ScanJobSeedResult[];
    startedAt: string;
    completedAt: string | null;
}

export interface ScanJobSeedResult {
    region: string;
    keywords: string[];
    urlsFound: number;
    leadsCreated: number;
    leadsFiltered: number;
    leads: { lead_id: string; entity_name: string; lead_score: number; priority: string }[];
    errors: string[];
}

async function ensureTable() {
    const db = getDb();
    await db.execute({
        sql: `CREATE TABLE IF NOT EXISTS scan_jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'running',
            data TEXT NOT NULL DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
    });
}

export async function createScanJob(id: string, userId: string, seedsTotal: number): Promise<ScanJob> {
    await ensureTable();
    const job: ScanJob = {
        id, userId, status: 'running',
        seedsTotal, seedsCompleted: 0,
        leadsFound: 0, leadsFiltered: 0,
        errors: [], results: [],
        startedAt: new Date().toISOString(),
        completedAt: null,
    };
    const db = getDb();
    await db.execute({
        sql: `INSERT INTO scan_jobs (id, user_id, status, data) VALUES (?, ?, ?, ?)`,
        args: [id, userId, 'running', JSON.stringify(job)],
    });
    return job;
}

export async function updateScanJob(id: string, updates: Partial<ScanJob>): Promise<void> {
    await ensureTable();
    const db = getDb();
    const existing = await db.execute({ sql: `SELECT data FROM scan_jobs WHERE id = ?`, args: [id] });
    if (existing.rows.length === 0) return;
    const job = JSON.parse(existing.rows[0].data as string) as ScanJob;
    const merged = { ...job, ...updates };
    await db.execute({
        sql: `UPDATE scan_jobs SET status = ?, data = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [merged.status, JSON.stringify(merged), id],
    });
}

export async function getScanJob(id: string, userId: string): Promise<ScanJob | null> {
    await ensureTable();
    const db = getDb();
    const result = await db.execute({
        sql: `SELECT data FROM scan_jobs WHERE id = ? AND user_id = ?`,
        args: [id, userId],
    });
    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].data as string);
}

export async function getLatestScanJob(userId: string): Promise<ScanJob | null> {
    await ensureTable();
    const db = getDb();
    const result = await db.execute({
        sql: `SELECT data FROM scan_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        args: [userId],
    });
    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].data as string);
}
