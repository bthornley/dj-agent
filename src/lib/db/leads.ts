import { Lead, QuerySeed } from '../types';
import { escapeLikeQuery } from '../security';
import { getDb, clampPageSize, PaginationOptions, PaginatedResult } from './connection';

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
