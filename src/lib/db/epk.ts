import { EPKConfig } from '../types';
import { getDb, clampPageSize, PaginationOptions, PaginatedResult } from './connection';

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
