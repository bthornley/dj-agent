import { Event } from '../types';
import { escapeLikeQuery } from '../security';
import { getDb, clampPageSize, PaginationOptions, PaginatedResult } from './connection';

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
