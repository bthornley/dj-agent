import { createClient, Client } from '@libsql/client';
import { Event, Lead, QuerySeed, BrandProfile, SocialPost, ContentPlan, EngagementTask, MediaAsset, EPKConfig, SentEmail } from './types';
import { escapeLikeQuery } from './security';

// ============================================================
// Turso (LibSQL) Database — Multi-tenant persistent storage
// All tables have user_id for data isolation between users.
// ============================================================

// ---- Pagination ----

export const DEFAULT_PAGE_SIZE = 200;
export const MAX_PAGE_SIZE = 1000;

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

function clampPageSize(limit?: number): number {
  if (!limit || limit <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}

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


// ---- Search Quota (user-scoped) ----

const DEFAULT_SEARCH_LIMIT = 10; // Free plan default

function quotaKey(userId: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${userId}:${month}`;
}

export async function dbGetSearchQuota(userId: string, planLimit?: number, customKey?: string): Promise<{ month: string; used: number; remaining: number; limit: number }> {
  const db = getDb();
  const key = customKey || quotaKey(userId);
  const month = customKey ? 'lifetime' : key.split(':')[1];
  const limit = planLimit ?? DEFAULT_SEARCH_LIMIT;
  const row = await db.execute({ sql: 'SELECT count FROM search_quota WHERE quota_key = ?', args: [key] });
  const used = row.rows.length > 0 ? Number(row.rows[0].count) : 0;
  // -1 means unlimited
  const remaining = limit < 0 ? 999999 : Math.max(0, limit - used);
  return { month, used, remaining, limit };
}

export async function dbIncrementSearchQuota(userId: string, amount: number = 1, customKeyOrLimit?: string | number): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const db = getDb();
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

export async function dbGetAllEvents(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Event>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  const [countResult, result] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM events WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT data FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', args: [userId, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map((row) => JSON.parse(row.data as string));
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetEvent(id: string, userId: string): Promise<Event | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM events WHERE id = ? AND user_id = ?', args: [id, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveEvent(event: Event, userId: string): Promise<void> {
  const db = getDb();
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
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM events WHERE id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbSearchEvents(query: string, userId: string): Promise<Event[]> {
  const db = getDb();
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

export async function dbGetAllLeads(userId: string, filters?: LeadFilters, pagination?: PaginationOptions): Promise<PaginatedResult<Lead>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  let whereClause = 'WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (filters?.mode) {
    whereClause += ' AND mode = ?';
    params.push(filters.mode);
  }
  if (filters?.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.priority) {
    whereClause += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters?.minScore !== undefined) {
    whereClause += ' AND lead_score >= ?';
    params.push(filters.minScore);
  }
  if (filters?.search) {
    whereClause += " AND data LIKE ? ESCAPE '\\'";
    params.push(`%${escapeLikeQuery(filters.search)}%`);
  }

  const countParams = [...params];
  const [countResult, result] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as cnt FROM leads ${whereClause}`, args: countParams }),
    db.execute({ sql: `SELECT data FROM leads ${whereClause} ORDER BY lead_score DESC, created_at DESC LIMIT ? OFFSET ?`, args: [...params, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map((row) => JSON.parse(row.data as string));
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetLead(id: string, userId: string): Promise<Lead | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM leads WHERE lead_id = ? AND user_id = ?', args: [id, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveLead(lead: Lead, userId: string, mode?: string): Promise<void> {
  const db = getDb();
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
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM leads WHERE lead_id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbDeleteAllLeads(userId: string, mode?: string): Promise<number> {
  const db = getDb();
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
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM leads WHERE dedupe_key = ? AND user_id = ?', args: [key, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbGetLeadStats(userId: string, mode?: string): Promise<{ total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; avgScore: number }> {
  const db = getDb();
  const modeFilter = mode ? ' AND mode = ?' : '';
  const modeArgs = mode ? [mode] : [];

  // Single combined query instead of 4 sequential queries
  const [groupRows, avgRow] = await Promise.all([
    db.execute({
      sql: `SELECT status, priority, COUNT(*) as c FROM leads WHERE user_id = ?${modeFilter} GROUP BY status, priority`,
      args: [userId, ...modeArgs],
    }),
    db.execute({
      sql: `SELECT AVG(lead_score) as avg FROM leads WHERE user_id = ?${modeFilter}`,
      args: [userId, ...modeArgs],
    }),
  ]);

  let total = 0;
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const r of groupRows.rows) {
    const count = Number(r.c);
    total += count;
    const status = r.status as string;
    const priority = r.priority as string;
    byStatus[status] = (byStatus[status] || 0) + count;
    byPriority[priority] = (byPriority[priority] || 0) + count;
  }

  const avgScore = Math.round(Number(avgRow.rows[0].avg) || 0);

  return { total, byStatus, byPriority, avgScore };
}

export async function dbGetHandoffQueue(userId: string): Promise<Lead[]> {
  const db = getDb();
  const result = await db.execute({ sql: "SELECT data FROM leads WHERE user_id = ? AND status = 'queued_for_dj_agent' ORDER BY lead_score DESC", args: [userId] });
  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function dbGetFollowUpCandidates(daysAgo: number = 3): Promise<{ userId: string; lead: Lead }[]> {
  const db = getDb();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysAgo);
  const thresholdIso = thresholdDate.toISOString();

  const result = await db.execute({
    sql: `SELECT user_id, data FROM leads 
          WHERE status IN ('contacted', 'outreach_sent') 
          AND updated_at < ?`,
    args: [thresholdIso]
  });

  return result.rows.map(row => ({
    userId: row.user_id as string,
    lead: JSON.parse(row.data as string) as Lead
  }));
}

// ---- Query Seed CRUD (user-scoped) ----

export async function dbGetAllSeeds(userId: string, mode?: string, pagination?: PaginationOptions): Promise<PaginatedResult<QuerySeed>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  let whereClause = 'WHERE user_id = ?';
  const args: (string | number)[] = [userId];
  if (mode) {
    whereClause += ' AND mode = ?';
    args.push(mode);
  }

  const countArgs = [...args];
  const [countResult, result] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as cnt FROM query_seeds ${whereClause}`, args: countArgs }),
    db.execute({ sql: `SELECT data FROM query_seeds ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map((row) => JSON.parse(row.data as string));
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetAllActiveUserSeeds(): Promise<{ userId: string; seeds: QuerySeed[] }[]> {
  const db = getDb();
  const result = await db.execute({ sql: `SELECT user_id, data FROM query_seeds WHERE active = 1` });

  const userMap: Record<string, QuerySeed[]> = {};
  for (const row of result.rows) {
    const userId = row.user_id as string;
    if (!userMap[userId]) userMap[userId] = [];
    userMap[userId].push(JSON.parse(row.data as string));
  }

  return Object.entries(userMap).map(([userId, seeds]) => ({ userId, seeds }));
}

export async function dbSaveSeed(seed: QuerySeed, userId: string, mode: string = 'performer'): Promise<void> {
  const db = getDb();
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
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM query_seeds WHERE id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbDeleteAllSeeds(userId: string, mode?: string): Promise<number> {
  const db = getDb();
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
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM brand_profiles WHERE user_id = ? LIMIT 1', args: [userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveBrandProfile(profile: BrandProfile, userId: string): Promise<void> {
  const db = getDb();
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

export async function dbGetAllSocialPosts(userId: string, filters?: SocialPostFilters, pagination?: PaginationOptions): Promise<PaginatedResult<SocialPost>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  let whereClause = 'WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (filters?.status) { whereClause += ' AND status = ?'; params.push(filters.status); }
  if (filters?.pillar) { whereClause += ' AND pillar = ?'; params.push(filters.pillar); }
  if (filters?.postType) { whereClause += ' AND post_type = ?'; params.push(filters.postType); }
  if (filters?.planId) { whereClause += ' AND plan_id = ?'; params.push(filters.planId); }

  const countParams = [...params];
  const [countResult, result] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as cnt FROM social_posts ${whereClause}`, args: countParams }),
    db.execute({ sql: `SELECT data FROM social_posts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, args: [...params, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map((row) => JSON.parse(row.data as string));
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetSocialPost(id: string, userId: string): Promise<SocialPost | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM social_posts WHERE id = ? AND user_id = ?', args: [id, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveSocialPost(post: SocialPost, userId: string): Promise<void> {
  const db = getDb();
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
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM social_posts WHERE id = ? AND user_id = ?', args: [id, userId] });
}

export async function dbGetPostStats(userId: string): Promise<{ total: number; byStatus: Record<string, number>; byPillar: Record<string, number> }> {
  const db = getDb();
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
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM content_plans WHERE week_of = ? AND user_id = ?', args: [weekOf, userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbGetLatestContentPlan(userId: string): Promise<ContentPlan | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM content_plans WHERE user_id = ? ORDER BY week_of DESC LIMIT 1', args: [userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveContentPlan(plan: ContentPlan, userId: string): Promise<void> {
  const db = getDb();
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

export async function dbGetEngagementTasks(userId: string, status?: string, pagination?: PaginationOptions): Promise<PaginatedResult<EngagementTask>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  let whereClause = 'WHERE user_id = ?';
  const params: (string | number)[] = [userId];
  if (status) { whereClause += ' AND status = ?'; params.push(status); }

  const countParams = [...params];
  const [countResult, result] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as cnt FROM engagement_tasks ${whereClause}`, args: countParams }),
    db.execute({ sql: `SELECT data FROM engagement_tasks ${whereClause} ORDER BY requires_approval DESC, created_at DESC LIMIT ? OFFSET ?`, args: [...params, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map((row) => JSON.parse(row.data as string));
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbSaveEngagementTask(task: EngagementTask, userId: string): Promise<void> {
  const db = getDb();
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

export async function dbGetAllMediaAssets(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<MediaAsset>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  const [countResult, result] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM media_assets WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT data FROM media_assets WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', args: [userId, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map(r => JSON.parse(r.data as string));
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetMediaAsset(id: string, userId: string): Promise<MediaAsset | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM media_assets WHERE id = ? AND user_id = ?', args: [id, userId] });
  if (result.rows.length === 0) return null;
  return JSON.parse(result.rows[0].data as string);
}

export async function dbSaveMediaAsset(asset: MediaAsset, userId: string): Promise<void> {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  const [events, leads, posts, plans, media, users] = await Promise.all([
    db.execute('SELECT COUNT(*) as cnt FROM events'),
    db.execute('SELECT COUNT(*) as cnt FROM leads'),
    db.execute('SELECT COUNT(*) as cnt FROM social_posts'),
    db.execute('SELECT COUNT(*) as cnt FROM content_plans'),
    db.execute('SELECT COUNT(*) as cnt FROM media_assets'),
    db.execute('SELECT DISTINCT user_id FROM leads WHERE user_id IS NOT NULL AND user_id != \'\''),
  ]);

  const uniqueUserIds = users.rows.map(r => r.user_id as string).filter(Boolean);

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
  const db = getDb();
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
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT data FROM epk_configs WHERE user_id = ?', args: [userId] });
  return result.rows.length > 0 ? JSON.parse(result.rows[0].data as string) : null;
}

export async function dbSaveEPKConfig(config: EPKConfig, userId: string): Promise<void> {
  const db = getDb();
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
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO sent_emails (id, user_id, event_id, to_email, subject, body, status, resend_id, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [email.id, userId, email.eventId || '', email.toEmail, email.subject, email.body, email.status, email.resendId || '', email.sentAt],
  });
}

export async function dbGetSentEmails(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<SentEmail>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  const [countResult, result] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sent_emails WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: `SELECT * FROM sent_emails WHERE user_id = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?`, args: [userId, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map(r => ({
    id: r.id as string,
    eventId: r.event_id as string,
    toEmail: r.to_email as string,
    subject: r.subject as string,
    body: r.body as string,
    status: r.status as 'sent' | 'failed',
    resendId: r.resend_id as string,
    sentAt: r.sent_at as string,
  }));
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetSentEmail(id: string, userId: string): Promise<SentEmail | null> {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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

export async function dbGetFlyers(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<FlyerConfig>> {
  const db = getDb();
  const limit = clampPageSize(pagination?.limit);
  const offset = pagination?.offset ?? 0;

  const [countResult, result] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM flyer_configs WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: `SELECT * FROM flyer_configs WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`, args: [userId, limit, offset] }),
  ]);
  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const data = result.rows.map(r => {
    const d = JSON.parse(r.data as string);
    return { ...d, id: r.id as string, userId: r.user_id as string, eventId: r.event_id as string || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string };
  });
  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetFlyer(id: string, userId: string): Promise<FlyerConfig | null> {
  const db = getDb();
  const result = await db.execute({ sql: `SELECT * FROM flyer_configs WHERE id = ? AND user_id = ?`, args: [id, userId] });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  const data = JSON.parse(r.data as string);
  return { ...data, id: r.id as string, userId: r.user_id as string, eventId: r.event_id as string || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string };
}

export async function dbSaveFlyer(userId: string, flyer: Partial<FlyerConfig> & { id?: string }): Promise<FlyerConfig> {
  const db = getDb();
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
  const db = getDb();
  await db.execute({ sql: `DELETE FROM flyer_configs WHERE id = ? AND user_id = ?`, args: [id, userId] });
}
