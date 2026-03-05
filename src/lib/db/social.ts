import { BrandProfile, SocialPost, ContentPlan, EngagementTask, MediaAsset } from '../types';
import { getDb, clampPageSize, PaginationOptions, PaginatedResult } from './connection';

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

// ---- Admin Stats ----

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
        db.execute("SELECT DISTINCT user_id FROM leads WHERE user_id IS NOT NULL AND user_id != ''"),
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
