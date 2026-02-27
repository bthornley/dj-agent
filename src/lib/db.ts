import { createClient, Client } from '@libsql/client';
import { Event, Lead, QuerySeed } from './types';
import { escapeLikeQuery } from './security';

// ============================================================
// Turso (LibSQL) Database — Multi-tenant persistent storage
// All tables have user_id for data isolation between users.
// ============================================================

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:data/dj-agent.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

// Run schema migration on first call
let _migrated = false;
async function ensureSchema(): Promise<Client> {
  const db = getDb();
  if (!_migrated) {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS leads (
        lead_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        dedupe_key TEXT,
        lead_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'new',
        priority TEXT DEFAULT 'P3',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS query_seeds (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS search_quota (
        quota_key TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      );
    `);
    _migrated = true;
  }
  return db;
}

// ---- Search Quota (user-scoped) ----

const MONTHLY_SEARCH_LIMIT = 250;

function quotaKey(userId: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${userId}:${month}`;
}

export async function dbGetSearchQuota(userId: string): Promise<{ month: string; used: number; remaining: number; limit: number }> {
  const db = await ensureSchema();
  const key = quotaKey(userId);
  const month = key.split(':')[1];
  const row = await db.execute({ sql: 'SELECT count FROM search_quota WHERE quota_key = ?', args: [key] });
  const used = row.rows.length > 0 ? Number(row.rows[0].count) : 0;
  return { month, used, remaining: Math.max(0, MONTHLY_SEARCH_LIMIT - used), limit: MONTHLY_SEARCH_LIMIT };
}

export async function dbIncrementSearchQuota(userId: string, amount: number = 1): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const db = await ensureSchema();
  const key = quotaKey(userId);
  const quota = await dbGetSearchQuota(userId);

  if (quota.remaining < amount) {
    return { allowed: false, used: quota.used, remaining: quota.remaining };
  }

  await db.execute({
    sql: `INSERT INTO search_quota (quota_key, count) VALUES (?, ?)
          ON CONFLICT(quota_key) DO UPDATE SET count = count + ?`,
    args: [key, amount, amount],
  });

  return { allowed: true, used: quota.used + amount, remaining: quota.remaining - amount };
}

// ---- Event CRUD (user-scoped) ----

export async function dbGetAllEvents(userId: string): Promise<Event[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM events WHERE user_id = ? ORDER BY created_at DESC', args: [userId] });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function dbGetEvent(id: string, userId: string): Promise<Event | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM events WHERE id = ? AND user_id = ?', args: [id, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveEvent(event: Event, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(event);

  await db.execute({
    sql: `INSERT INTO events (id, user_id, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            updated_at = excluded.updated_at`,
    args: [event.id, userId, data, event.createdAt || now, now],
  });
}

export async function dbDeleteEvent(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: 'DELETE FROM events WHERE id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbSearchEvents(query: string, userId: string): Promise<Event[]> {
  const db = await ensureSchema();
  const safeQuery = escapeLikeQuery(query);
  const result = await db.execute({
    sql: `SELECT data FROM events WHERE user_id = ? AND data LIKE ? ESCAPE '\\' ORDER BY created_at DESC`,
    args: [userId, `%${safeQuery}%`],
  });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

// ---- Lead CRUD (user-scoped) ----

export interface LeadFilters {
  status?: string;
  priority?: string;
  minScore?: number;
  search?: string;
}

export async function dbGetAllLeads(userId: string, filters?: LeadFilters): Promise<Lead[]> {
  const db = await ensureSchema();
  let sql = 'SELECT data FROM leads WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.priority) {
    sql += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters?.minScore !== undefined) {
    sql += ' AND lead_score >= ?';
    params.push(filters.minScore);
  }
  if (filters?.search) {
    sql += " AND data LIKE ? ESCAPE '\\'";
    params.push(`%${escapeLikeQuery(filters.search)}%`);
  }

  sql += ' ORDER BY lead_score DESC, created_at DESC';

  const result = await db.execute({ sql, args: params });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function dbGetLead(id: string, userId: string): Promise<Lead | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM leads WHERE lead_id = ? AND user_id = ?', args: [id, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveLead(lead: Lead, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(lead);

  await db.execute({
    sql: `INSERT INTO leads (lead_id, user_id, data, dedupe_key, lead_score, status, priority, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(lead_id) DO UPDATE SET
            data = excluded.data,
            dedupe_key = excluded.dedupe_key,
            lead_score = excluded.lead_score,
            status = excluded.status,
            priority = excluded.priority,
            updated_at = excluded.updated_at`,
    args: [lead.lead_id, userId, data, lead.dedupe_key, lead.lead_score, lead.status, lead.priority, lead.found_at || now, now],
  });
}

export async function dbDeleteLead(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: 'DELETE FROM leads WHERE lead_id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbFindLeadByDedupeKey(key: string, userId: string): Promise<Lead | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM leads WHERE dedupe_key = ? AND user_id = ?', args: [key, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbGetLeadStats(userId: string): Promise<{ total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; avgScore: number }> {
  const db = await ensureSchema();
  const totalRow = await db.execute({ sql: 'SELECT COUNT(*) as c FROM leads WHERE user_id = ?', args: [userId] });
  const total = Number(totalRow.rows[0].c);

  const statusRows = await db.execute({ sql: 'SELECT status, COUNT(*) as c FROM leads WHERE user_id = ? GROUP BY status', args: [userId] });
  const byStatus: Record<string, number> = {};
  for (const r of statusRows.rows) byStatus[r.status as string] = Number(r.c);

  const priorityRows = await db.execute({ sql: 'SELECT priority, COUNT(*) as c FROM leads WHERE user_id = ? GROUP BY priority', args: [userId] });
  const byPriority: Record<string, number> = {};
  for (const r of priorityRows.rows) byPriority[r.priority as string] = Number(r.c);

  const avgRow = await db.execute({ sql: 'SELECT AVG(lead_score) as avg FROM leads WHERE user_id = ?', args: [userId] });
  const avgScore = Math.round(Number(avgRow.rows[0].avg) || 0);

  return { total, byStatus, byPriority, avgScore };
}

export async function dbGetHandoffQueue(userId: string): Promise<Lead[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: "SELECT data FROM leads WHERE user_id = ? AND status = 'queued_for_dj_agent' ORDER BY lead_score DESC", args: [userId] });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

// ---- Query Seed CRUD (user-scoped) ----

export async function dbGetAllSeeds(userId: string): Promise<QuerySeed[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM query_seeds WHERE user_id = ? ORDER BY created_at DESC', args: [userId] });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function dbSaveSeed(seed: QuerySeed, userId: string): Promise<void> {
  const db = await ensureSchema();
  const data = JSON.stringify(seed);
  await db.execute({
    sql: `INSERT INTO query_seeds (id, user_id, data, active, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            active = excluded.active`,
    args: [seed.id, userId, data, seed.active ? 1 : 0, seed.created_at || new Date().toISOString()],
  });
}

export async function dbDeleteSeed(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: 'DELETE FROM query_seeds WHERE id = ? AND user_id = ?', args: [id, userId] });
}
