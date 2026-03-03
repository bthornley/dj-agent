import { createClient, Client } from '@libsql/client';
import { Event, Lead, QuerySeed, BrandProfile, SocialPost, ContentPlan, EngagementTask, MediaAsset, EPKConfig, SentEmail } from './types';
import { escapeLikeQuery } from './security';

// ============================================================
// Turso (LibSQL) Database — Multi-tenant persistent storage
// All tables have user_id for data isolation between users.
// ============================================================

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:data/giglift.db',
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
        mode TEXT DEFAULT 'performer',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS query_seeds (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        mode TEXT DEFAULT 'performer',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS search_quota (
        quota_key TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS brand_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS social_posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        status TEXT DEFAULT 'idea',
        pillar TEXT DEFAULT '',
        post_type TEXT DEFAULT '',
        plan_id TEXT DEFAULT '',
        scheduled_for TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS content_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        week_of TEXT DEFAULT '',
        status TEXT DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS engagement_tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        type TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        requires_approval INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        file_name TEXT DEFAULT '',
        media_type TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS epk_configs (
        user_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sent_emails (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_id TEXT DEFAULT '',
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT DEFAULT 'sent',
        resend_id TEXT DEFAULT '',
        sent_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_template TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS flyer_configs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_id TEXT DEFAULT '',
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migration: add mode column if it doesn't exist
    try {
      await db.execute({ sql: `ALTER TABLE leads ADD COLUMN mode TEXT DEFAULT 'performer'`, args: [] });
    } catch { /* column already exists */ }

    // Migration: add mode column to query_seeds if it doesn't exist
    try {
      await db.execute({ sql: `ALTER TABLE query_seeds ADD COLUMN mode TEXT DEFAULT 'performer'`, args: [] });
    } catch { /* column already exists */ }

    _migrated = true;
  }
  return db;
}

// ---- Search Quota (user-scoped) ----

const DEFAULT_SEARCH_LIMIT = 10; // Free plan default

function quotaKey(userId: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${userId}:${month}`;
}

export async function dbGetSearchQuota(userId: string, planLimit?: number, customKey?: string): Promise<{ month: string; used: number; remaining: number; limit: number }> {
  const db = await ensureSchema();
  const key = customKey || quotaKey(userId);
  const month = customKey ? 'lifetime' : key.split(':')[1];
  const limit = planLimit ?? DEFAULT_SEARCH_LIMIT;
  const row = await db.execute({ sql: 'SELECT count FROM search_quota WHERE quota_key = ?', args: [key] });
  const used = row.rows.length > 0 ? Number(row.rows[0].count) : 0;
  return { month, used, remaining: Math.max(0, limit - used), limit };
}

export async function dbIncrementSearchQuota(userId: string, amount: number = 1, customKeyOrLimit?: string | number): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const db = await ensureSchema();
  const isCustomKey = typeof customKeyOrLimit === 'string';
  const key = isCustomKey ? customKeyOrLimit : quotaKey(userId);
  const limit = isCustomKey ? 9999 : (customKeyOrLimit as number ?? DEFAULT_SEARCH_LIMIT);
  const quota = await dbGetSearchQuota(userId, limit, isCustomKey ? customKeyOrLimit as string : undefined);

  if (!isCustomKey && quota.remaining < amount) {
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
  mode?: string;
}

export async function dbGetAllLeads(userId: string, filters?: LeadFilters): Promise<Lead[]> {
  const db = await ensureSchema();
  let sql = 'SELECT data FROM leads WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (filters?.mode) {
    sql += ' AND mode = ?';
    params.push(filters.mode);
  }
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

export async function dbSaveLead(lead: Lead, userId: string, mode?: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(lead);

  // When mode is not provided (update case), pass NULL so the COALESCE preserves the existing value
  const modeValue = mode ?? null;

  await db.execute({
    sql: `INSERT INTO leads (lead_id, user_id, data, dedupe_key, lead_score, status, priority, mode, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'performer'), ?, ?)
          ON CONFLICT(lead_id) DO UPDATE SET
            data = excluded.data,
            dedupe_key = excluded.dedupe_key,
            lead_score = excluded.lead_score,
            status = excluded.status,
            priority = excluded.priority,
            mode = COALESCE(?, mode),
            updated_at = excluded.updated_at`,
    args: [lead.lead_id, userId, data, lead.dedupe_key, lead.lead_score, lead.status, lead.priority, modeValue, lead.found_at || now, now, modeValue],
  });
}

export async function dbDeleteLead(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: 'DELETE FROM leads WHERE lead_id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbDeleteAllLeads(userId: string, mode?: string): Promise<number> {
  const db = await ensureSchema();
  let sql = 'DELETE FROM leads WHERE user_id = ?';
  const args: string[] = [userId];
  if (mode) {
    sql += ' AND mode = ?';
    args.push(mode);
  }
  const result = await db.execute({ sql, args });
  return result.rowsAffected;
}

export async function dbFindLeadByDedupeKey(key: string, userId: string): Promise<Lead | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM leads WHERE dedupe_key = ? AND user_id = ?', args: [key, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbGetLeadStats(userId: string, mode?: string): Promise<{ total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; avgScore: number }> {
  const db = await ensureSchema();
  const modeFilter = mode ? ' AND mode = ?' : '';
  const modeArgs = mode ? [mode] : [];

  const totalRow = await db.execute({ sql: `SELECT COUNT(*) as c FROM leads WHERE user_id = ?${modeFilter}`, args: [userId, ...modeArgs] });
  const total = Number(totalRow.rows[0].c);

  const statusRows = await db.execute({ sql: `SELECT status, COUNT(*) as c FROM leads WHERE user_id = ?${modeFilter} GROUP BY status`, args: [userId, ...modeArgs] });
  const byStatus: Record<string, number> = {};
  for (const r of statusRows.rows) byStatus[r.status as string] = Number(r.c);

  const priorityRows = await db.execute({ sql: `SELECT priority, COUNT(*) as c FROM leads WHERE user_id = ?${modeFilter} GROUP BY priority`, args: [userId, ...modeArgs] });
  const byPriority: Record<string, number> = {};
  for (const r of priorityRows.rows) byPriority[r.priority as string] = Number(r.c);

  const avgRow = await db.execute({ sql: `SELECT AVG(lead_score) as avg FROM leads WHERE user_id = ?${modeFilter}`, args: [userId, ...modeArgs] });
  const avgScore = Math.round(Number(avgRow.rows[0].avg) || 0);

  return { total, byStatus, byPriority, avgScore };
}

export async function dbGetHandoffQueue(userId: string): Promise<Lead[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: "SELECT data FROM leads WHERE user_id = ? AND status = 'queued_for_dj_agent' ORDER BY lead_score DESC", args: [userId] });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

// ---- Query Seed CRUD (user-scoped) ----

export async function dbGetAllSeeds(userId: string, mode?: string): Promise<QuerySeed[]> {
  const db = await ensureSchema();
  let sql = 'SELECT data FROM query_seeds WHERE user_id = ?';
  const args: (string | number)[] = [userId];
  if (mode) {
    sql += ' AND mode = ?';
    args.push(mode);
  }
  sql += ' ORDER BY created_at DESC';
  const result = await db.execute({ sql, args });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function dbSaveSeed(seed: QuerySeed, userId: string, mode: string = 'performer'): Promise<void> {
  const db = await ensureSchema();
  const data = JSON.stringify({ ...seed, mode });
  await db.execute({
    sql: `INSERT INTO query_seeds (id, user_id, data, active, mode, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            active = excluded.active,
            mode = excluded.mode`,
    args: [seed.id, userId, data, seed.active ? 1 : 0, mode, seed.created_at || new Date().toISOString()],
  });
}

export async function dbDeleteSeed(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: 'DELETE FROM query_seeds WHERE id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbDeleteAllSeeds(userId: string, mode?: string): Promise<number> {
  const db = await ensureSchema();
  let sql = 'DELETE FROM query_seeds WHERE user_id = ?';
  const args: string[] = [userId];
  if (mode) {
    sql += ' AND mode = ?';
    args.push(mode);
  }
  const result = await db.execute({ sql, args });
  return result.rowsAffected;
}

// ============================================================
// Social Hype Agent — CRUD
// ============================================================

// ---- Brand Profile ----

export async function dbGetBrandProfile(userId: string): Promise<BrandProfile | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM brand_profiles WHERE user_id = ? LIMIT 1', args: [userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveBrandProfile(profile: BrandProfile, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(profile);
  await db.execute({
    sql: `INSERT INTO brand_profiles (id, user_id, data, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            updated_at = excluded.updated_at`,
    args: [profile.id, userId, data, now],
  });
}

// ---- Social Posts ----

export interface SocialPostFilters {
  status?: string;
  pillar?: string;
  postType?: string;
  planId?: string;
}

export async function dbGetAllSocialPosts(userId: string, filters?: SocialPostFilters): Promise<SocialPost[]> {
  const db = await ensureSchema();
  let sql = 'SELECT data FROM social_posts WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters?.pillar) { sql += ' AND pillar = ?'; params.push(filters.pillar); }
  if (filters?.postType) { sql += ' AND post_type = ?'; params.push(filters.postType); }
  if (filters?.planId) { sql += ' AND plan_id = ?'; params.push(filters.planId); }

  sql += ' ORDER BY created_at DESC';
  const result = await db.execute({ sql, args: params });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function dbGetSocialPost(id: string, userId: string): Promise<SocialPost | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM social_posts WHERE id = ? AND user_id = ?', args: [id, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveSocialPost(post: SocialPost, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(post);
  await db.execute({
    sql: `INSERT INTO social_posts (id, user_id, data, status, pillar, post_type, plan_id, scheduled_for, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            status = excluded.status,
            pillar = excluded.pillar,
            post_type = excluded.post_type,
            plan_id = excluded.plan_id,
            scheduled_for = excluded.scheduled_for,
            updated_at = excluded.updated_at`,
    args: [post.id, userId, data, post.status, post.pillar, post.postType, post.planId, post.scheduledFor || '', post.createdAt || now, now],
  });
}

export async function dbDeleteSocialPost(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: 'DELETE FROM social_posts WHERE id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbGetPostStats(userId: string): Promise<{ total: number; byStatus: Record<string, number>; byPillar: Record<string, number> }> {
  const db = await ensureSchema();
  const totalRow = await db.execute({ sql: 'SELECT COUNT(*) as c FROM social_posts WHERE user_id = ?', args: [userId] });
  const total = Number(totalRow.rows[0].c);

  const statusRows = await db.execute({ sql: 'SELECT status, COUNT(*) as c FROM social_posts WHERE user_id = ? GROUP BY status', args: [userId] });
  const byStatus: Record<string, number> = {};
  for (const r of statusRows.rows) byStatus[r.status as string] = Number(r.c);

  const pillarRows = await db.execute({ sql: 'SELECT pillar, COUNT(*) as c FROM social_posts WHERE user_id = ? GROUP BY pillar', args: [userId] });
  const byPillar: Record<string, number> = {};
  for (const r of pillarRows.rows) byPillar[r.pillar as string] = Number(r.c);

  return { total, byStatus, byPillar };
}

// ---- Content Plans ----

export async function dbGetContentPlan(weekOf: string, userId: string): Promise<ContentPlan | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM content_plans WHERE week_of = ? AND user_id = ?', args: [weekOf, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbGetLatestContentPlan(userId: string): Promise<ContentPlan | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM content_plans WHERE user_id = ? ORDER BY week_of DESC LIMIT 1', args: [userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveContentPlan(plan: ContentPlan, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(plan);
  await db.execute({
    sql: `INSERT INTO content_plans (id, user_id, data, week_of, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            week_of = excluded.week_of,
            status = excluded.status,
            updated_at = excluded.updated_at`,
    args: [plan.id, userId, data, plan.weekOf, plan.status, plan.createdAt || now, now],
  });
}

// ---- Engagement Tasks ----

export async function dbGetEngagementTasks(userId: string, status?: string): Promise<EngagementTask[]> {
  const db = await ensureSchema();
  let sql = 'SELECT data FROM engagement_tasks WHERE user_id = ?';
  const params: (string | number)[] = [userId];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY requires_approval DESC, created_at DESC';
  const result = await db.execute({ sql, args: params });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function dbSaveEngagementTask(task: EngagementTask, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(task);
  await db.execute({
    sql: `INSERT INTO engagement_tasks (id, user_id, data, type, status, requires_approval, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            type = excluded.type,
            status = excluded.status,
            requires_approval = excluded.requires_approval,
            updated_at = excluded.updated_at`,
    args: [task.id, userId, data, task.type, task.status, task.requiresApproval ? 1 : 0, task.createdAt || now, now],
  });
}

// ---- Media Assets ----

export async function dbGetAllMediaAssets(userId: string): Promise<MediaAsset[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM media_assets WHERE user_id = ? ORDER BY created_at DESC', args: [userId] });
  return result.rows.map(r => JSON.parse(r.data as string));
}

export async function dbGetMediaAsset(id: string, userId: string): Promise<MediaAsset | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM media_assets WHERE id = ? AND user_id = ?', args: [id, userId] });
  if (result.rows.length === 0) return null;
  return JSON.parse(result.rows[0].data as string);
}

export async function dbSaveMediaAsset(asset: MediaAsset, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify(asset);
  await db.execute({
    sql: `INSERT INTO media_assets (id, user_id, data, file_name, media_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            file_name = excluded.file_name,
            media_type = excluded.media_type,
            updated_at = excluded.updated_at`,
    args: [asset.id, userId, data, asset.fileName, asset.mediaType, asset.createdAt || now, now],
  });
}

export async function dbDeleteMediaAsset(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: 'DELETE FROM media_assets WHERE id = ? AND user_id = ?', args: [id, userId] });
}

// ---- Admin Functions ----

export async function dbGetPlatformStats(): Promise<{
  totalEvents: number;
  totalLeads: number;
  totalPosts: number;
  totalPlans: number;
  totalMediaAssets: number;
  uniqueUserIds: string[];
}> {
  const db = await ensureSchema();
  const [events, leads, posts, plans, media] = await Promise.all([
    db.execute('SELECT COUNT(*) as cnt, COUNT(DISTINCT user_id) as users FROM events'),
    db.execute('SELECT COUNT(*) as cnt FROM leads'),
    db.execute('SELECT COUNT(*) as cnt FROM social_posts'),
    db.execute('SELECT COUNT(*) as cnt FROM content_plans'),
    db.execute('SELECT COUNT(*) as cnt FROM media_assets'),
  ]);

  // Gather unique user IDs
  const userRows = await db.execute('SELECT DISTINCT user_id FROM events UNION SELECT DISTINCT user_id FROM leads UNION SELECT DISTINCT user_id FROM social_posts UNION SELECT DISTINCT user_id FROM brand_profiles');
  const uniqueUserIds = userRows.rows.map(r => r.user_id as string).filter(Boolean);

  return {
    totalEvents: Number(events.rows[0]?.cnt || 0),
    totalLeads: Number(leads.rows[0]?.cnt || 0),
    totalPosts: Number(posts.rows[0]?.cnt || 0),
    totalPlans: Number(plans.rows[0]?.cnt || 0),
    totalMediaAssets: Number(media.rows[0]?.cnt || 0),
    uniqueUserIds,
  };
}

export async function dbGetUserStats(userId: string): Promise<{
  events: number;
  leads: number;
  posts: number;
  plans: number;
  mediaAssets: number;
  hasBrand: boolean;
}> {
  const db = await ensureSchema();
  const [events, leads, posts, plans, media, brand] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM events WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM leads WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM social_posts WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM content_plans WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM media_assets WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM brand_profiles WHERE user_id = ?', args: [userId] }),
  ]);
  return {
    events: Number(events.rows[0]?.cnt || 0),
    leads: Number(leads.rows[0]?.cnt || 0),
    posts: Number(posts.rows[0]?.cnt || 0),
    plans: Number(plans.rows[0]?.cnt || 0),
    mediaAssets: Number(media.rows[0]?.cnt || 0),
    hasBrand: Number(brand.rows[0]?.cnt || 0) > 0,
  };
}

// ── EPK Configs ──────────────────────────────────────────

export async function dbGetEPKConfig(userId: string): Promise<EPKConfig | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: 'SELECT data FROM epk_configs WHERE user_id = ?', args: [userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveEPKConfig(config: EPKConfig, userId: string): Promise<void> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  const data = JSON.stringify({ ...config, updatedAt: now });
  await db.execute({
    sql: `INSERT INTO epk_configs (user_id, data, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    args: [userId, data, now],
  });
}

// ---- Sent Emails ----

export async function dbSaveSentEmail(email: SentEmail, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({
    sql: `INSERT INTO sent_emails (id, user_id, event_id, to_email, subject, body, status, resend_id, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [email.id, userId, email.eventId || '', email.toEmail, email.subject, email.body, email.status, email.resendId || '', email.sentAt],
  });
}

export async function dbGetSentEmails(userId: string): Promise<SentEmail[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: `SELECT * FROM sent_emails WHERE user_id = ? ORDER BY sent_at DESC`, args: [userId] });
  return result.rows.map(r => ({
    id: r.id as string,
    eventId: r.event_id as string,
    toEmail: r.to_email as string,
    subject: r.subject as string,
    body: r.body as string,
    status: r.status as 'sent' | 'failed',
    resendId: r.resend_id as string,
    sentAt: r.sent_at as string,
  }));
}

export async function dbGetSentEmail(id: string, userId: string): Promise<SentEmail | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: `SELECT * FROM sent_emails WHERE id = ? AND user_id = ?`, args: [id, userId] });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    toEmail: r.to_email as string,
    subject: r.subject as string,
    body: r.body as string,
    status: r.status as 'sent' | 'failed',
    resendId: r.resend_id as string,
    sentAt: r.sent_at as string,
  };
}

// ============================================================
// Email Templates
// ============================================================

export interface EmailTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  bodyTemplate: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Cold Intro',
    subject: 'DJ Services Inquiry — {{venue}}',
    bodyTemplate: `Hi {{contact}},

I came across {{venue}}{{city}} and love what you're doing. I'm a professional DJ specializing in open-format sets and I'd love to chat about bringing live DJ entertainment to your events.

I can bring my own sound and lighting, and I'm flexible on formats — from background vibes to high-energy sets.

Would you be open to a quick call or meeting? I'd be happy to send over my EPK and some sample mixes.

Looking forward to connecting!

Best,
[Your Name]`,
  },
  {
    name: 'Follow-Up',
    subject: 'Following up — DJ for {{venue}}',
    bodyTemplate: `Hi {{contact}},

I wanted to circle back on my earlier message about DJing at {{venue}}. I know things get busy, so no worries if it slipped through!

I'm still very interested in bringing some great energy to your upcoming events. Happy to work around your schedule for a quick chat.

Let me know if there's a better time or person to connect with!

Best,
[Your Name]`,
  },
  {
    name: 'Thank You',
    subject: 'Thanks for the opportunity — {{venue}}',
    bodyTemplate: `Hi {{contact}},

Just wanted to say thanks for the opportunity to play at {{venue}}! I had a great time and the crowd was amazing.

I'd love to make this a regular thing if you're open to it. Let me know if you have any upcoming dates that need a DJ.

Thanks again!

Best,
[Your Name]`,
  },
];

export async function dbGetEmailTemplates(userId: string): Promise<EmailTemplate[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: `SELECT * FROM email_templates WHERE user_id = ? ORDER BY created_at ASC`, args: [userId] });

  // Seed defaults on first access
  if (result.rows.length === 0) {
    for (const tpl of DEFAULT_TEMPLATES) {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({
        sql: `INSERT INTO email_templates (id, user_id, name, subject, body_template) VALUES (?, ?, ?, ?, ?)`,
        args: [id, userId, tpl.name, tpl.subject, tpl.bodyTemplate],
      });
    }
    const seeded = await db.execute({ sql: `SELECT * FROM email_templates WHERE user_id = ? ORDER BY created_at ASC`, args: [userId] });
    return seeded.rows.map(mapTemplateRow);
  }

  return result.rows.map(mapTemplateRow);
}

export async function dbSaveEmailTemplate(userId: string, template: { id?: string; name: string; subject: string; bodyTemplate: string }): Promise<EmailTemplate> {
  const db = await ensureSchema();
  const id = template.id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (template.id) {
    await db.execute({
      sql: `UPDATE email_templates SET name = ?, subject = ?, body_template = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      args: [template.name, template.subject, template.bodyTemplate, id, userId],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO email_templates (id, user_id, name, subject, body_template) VALUES (?, ?, ?, ?, ?)`,
      args: [id, userId, template.name, template.subject, template.bodyTemplate],
    });
  }

  const result = await db.execute({ sql: `SELECT * FROM email_templates WHERE id = ?`, args: [id] });
  return mapTemplateRow(result.rows[0]);
}

export async function dbDeleteEmailTemplate(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: `DELETE FROM email_templates WHERE id = ? AND user_id = ?`, args: [id, userId] });
}

function mapTemplateRow(r: Record<string, unknown>): EmailTemplate {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    subject: r.subject as string,
    bodyTemplate: r.body_template as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// ============================================================
// Flyer Configs
// ============================================================

export interface FlyerConfig {
  id: string;
  userId: string;
  eventId?: string;
  style: string;
  aspectRatio: '9:16' | '1:1' | '16:9';
  backgroundUrl: string;
  backgroundPrompt?: string;
  overlayOpacity: number;
  headline: string;
  subheadline: string;
  dateText: string;
  venueText: string;
  extraText: string;
  djName: string;
  headlineFont: string;
  bodyFont: string;
  headlineColor: string;
  bodyColor: string;
  textPosition: 'top' | 'center' | 'bottom';
  textAlign: 'left' | 'center' | 'right';
  createdAt: string;
  updatedAt: string;
}

export async function dbGetFlyers(userId: string): Promise<FlyerConfig[]> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: `SELECT * FROM flyer_configs WHERE user_id = ? ORDER BY updated_at DESC`, args: [userId] });
  return result.rows.map(r => {
    const data = JSON.parse(r.data as string);
    return { ...data, id: r.id as string, userId: r.user_id as string, eventId: r.event_id as string || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string };
  });
}

export async function dbGetFlyer(id: string, userId: string): Promise<FlyerConfig | null> {
  const db = await ensureSchema();
  const result = await db.execute({ sql: `SELECT * FROM flyer_configs WHERE id = ? AND user_id = ?`, args: [id, userId] });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  const data = JSON.parse(r.data as string);
  return { ...data, id: r.id as string, userId: r.user_id as string, eventId: r.event_id as string || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string };
}

export async function dbSaveFlyer(userId: string, flyer: Partial<FlyerConfig> & { id?: string }): Promise<FlyerConfig> {
  const db = await ensureSchema();
  const id = flyer.id || `flyer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const data = JSON.stringify(flyer);

  if (flyer.id) {
    await db.execute({
      sql: `UPDATE flyer_configs SET data = ?, event_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      args: [data, flyer.eventId || '', id, userId],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO flyer_configs (id, user_id, event_id, data) VALUES (?, ?, ?, ?)`,
      args: [id, userId, flyer.eventId || '', data],
    });
  }

  return (await dbGetFlyer(id, userId))!;
}

export async function dbDeleteFlyer(id: string, userId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({ sql: `DELETE FROM flyer_configs WHERE id = ? AND user_id = ?`, args: [id, userId] });
}
