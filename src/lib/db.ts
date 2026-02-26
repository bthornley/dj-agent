import Database from 'better-sqlite3';
import path from 'path';
import { Event, Lead, QuerySeed } from './types';
import { escapeLikeQuery } from './security';

// ============================================================
// SQLite Database — Multi-tenant persistent storage
// All tables have user_id for data isolation between users.
// ============================================================

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dj-agent.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');

    _db.exec(`
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

    // Migrate: add user_id columns if they don't exist (for existing DBs)
    try { _db.exec('ALTER TABLE events ADD COLUMN user_id TEXT NOT NULL DEFAULT ""'); } catch { /* already exists */ }
    try { _db.exec('ALTER TABLE leads ADD COLUMN user_id TEXT NOT NULL DEFAULT ""'); } catch { /* already exists */ }
    try { _db.exec('ALTER TABLE query_seeds ADD COLUMN user_id TEXT NOT NULL DEFAULT ""'); } catch { /* already exists */ }

    // Migrate: dedupe_key from UNIQUE to non-unique (scoped by user now)
    // Drop old unique index if it exists, create a composite one
    try { _db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_dedupe ON leads(user_id, dedupe_key)'); } catch { /* */ }

    // Migrate search_quota from month PK to quota_key PK
    try { _db.exec('ALTER TABLE search_quota RENAME COLUMN month TO quota_key'); } catch { /* already renamed or doesn't exist */ }
  }
  return _db;
}

// ---- Search Quota (user-scoped) ----

const MONTHLY_SEARCH_LIMIT = 250;

function quotaKey(userId: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${userId}:${month}`;
}

export function dbGetSearchQuota(userId: string): { month: string; used: number; remaining: number; limit: number } {
  const db = getDb();
  const key = quotaKey(userId);
  const month = key.split(':')[1];
  const row = db.prepare('SELECT count FROM search_quota WHERE quota_key = ?').get(key) as { count: number } | undefined;
  const used = row?.count || 0;
  return { month, used, remaining: Math.max(0, MONTHLY_SEARCH_LIMIT - used), limit: MONTHLY_SEARCH_LIMIT };
}

export function dbIncrementSearchQuota(userId: string, amount: number = 1): { allowed: boolean; used: number; remaining: number } {
  const db = getDb();
  const key = quotaKey(userId);
  const quota = dbGetSearchQuota(userId);

  if (quota.remaining < amount) {
    return { allowed: false, used: quota.used, remaining: quota.remaining };
  }

  db.prepare(`
    INSERT INTO search_quota (quota_key, count) VALUES (?, ?)
    ON CONFLICT(quota_key) DO UPDATE SET count = count + ?
  `).run(key, amount, amount);

  return { allowed: true, used: quota.used + amount, remaining: quota.remaining - amount };
}

// ---- Event CRUD (user-scoped) ----

export function dbGetAllEvents(userId: string): Event[] {
  const db = getDb();
  const rows = db.prepare('SELECT data FROM events WHERE user_id = ? ORDER BY created_at DESC').all(userId) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function dbGetEvent(id: string, userId: string): Event | null {
  const db = getDb();
  const row = db.prepare('SELECT data FROM events WHERE id = ? AND user_id = ?').get(id, userId) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function dbSaveEvent(event: Event, userId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  const data = JSON.stringify(event);

  db.prepare(`
    INSERT INTO events (id, user_id, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(event.id, userId, data, event.createdAt || now, now);
}

export function dbDeleteEvent(id: string, userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM events WHERE id = ? AND user_id = ?').run(id, userId);
}

export function dbSearchEvents(query: string, userId: string): Event[] {
  const db = getDb();
  const safeQuery = escapeLikeQuery(query);
  const rows = db.prepare(`
    SELECT data FROM events
    WHERE user_id = ? AND data LIKE ? ESCAPE '\\'
    ORDER BY created_at DESC
  `).all(userId, `%${safeQuery}%`) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

// ---- Lead CRUD (user-scoped) ----

export interface LeadFilters {
  status?: string;
  priority?: string;
  minScore?: number;
  search?: string;
}

export function dbGetAllLeads(userId: string, filters?: LeadFilters): Lead[] {
  const db = getDb();
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
    sql += " AND data LIKE ? ESCAPE '\\\\'";
    params.push(`%${escapeLikeQuery(filters.search)}%`);
  }

  sql += ' ORDER BY lead_score DESC, created_at DESC';

  const rows = db.prepare(sql).all(...params) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function dbGetLead(id: string, userId: string): Lead | null {
  const db = getDb();
  const row = db.prepare('SELECT data FROM leads WHERE lead_id = ? AND user_id = ?').get(id, userId) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function dbSaveLead(lead: Lead, userId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  const data = JSON.stringify(lead);

  db.prepare(`
    INSERT INTO leads (lead_id, user_id, data, dedupe_key, lead_score, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lead_id) DO UPDATE SET
      data = excluded.data,
      dedupe_key = excluded.dedupe_key,
      lead_score = excluded.lead_score,
      status = excluded.status,
      priority = excluded.priority,
      updated_at = excluded.updated_at
  `).run(lead.lead_id, userId, data, lead.dedupe_key, lead.lead_score, lead.status, lead.priority, lead.found_at || now, now);
}

export function dbDeleteLead(id: string, userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM leads WHERE lead_id = ? AND user_id = ?').run(id, userId);
}

export function dbFindLeadByDedupeKey(key: string, userId: string): Lead | null {
  const db = getDb();
  const row = db.prepare('SELECT data FROM leads WHERE dedupe_key = ? AND user_id = ?').get(key, userId) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function dbGetLeadStats(userId: string): { total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; avgScore: number } {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as c FROM leads WHERE user_id = ?').get(userId) as { c: number }).c;

  const statusRows = db.prepare('SELECT status, COUNT(*) as c FROM leads WHERE user_id = ? GROUP BY status').all(userId) as { status: string; c: number }[];
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.c;

  const priorityRows = db.prepare('SELECT priority, COUNT(*) as c FROM leads WHERE user_id = ? GROUP BY priority').all(userId) as { priority: string; c: number }[];
  const byPriority: Record<string, number> = {};
  for (const r of priorityRows) byPriority[r.priority] = r.c;

  const avgRow = db.prepare('SELECT AVG(lead_score) as avg FROM leads WHERE user_id = ?').get(userId) as { avg: number | null };
  const avgScore = Math.round(avgRow.avg || 0);

  return { total, byStatus, byPriority, avgScore };
}

export function dbGetHandoffQueue(userId: string): Lead[] {
  const db = getDb();
  const rows = db.prepare("SELECT data FROM leads WHERE user_id = ? AND status = 'queued_for_dj_agent' ORDER BY lead_score DESC").all(userId) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

// ---- Query Seed CRUD (user-scoped) ----

export function dbGetAllSeeds(userId: string): QuerySeed[] {
  const db = getDb();
  const rows = db.prepare('SELECT data FROM query_seeds WHERE user_id = ? ORDER BY created_at DESC').all(userId) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function dbSaveSeed(seed: QuerySeed, userId: string): void {
  const db = getDb();
  const data = JSON.stringify(seed);
  db.prepare(`
    INSERT INTO query_seeds (id, user_id, data, active, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      active = excluded.active
  `).run(seed.id, userId, data, seed.active ? 1 : 0, seed.created_at || new Date().toISOString());
}

export function dbDeleteSeed(id: string, userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM query_seeds WHERE id = ? AND user_id = ?').run(id, userId);
}
