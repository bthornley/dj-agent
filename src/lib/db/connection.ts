import { createClient, Client } from '@libsql/client';

// ============================================================
// Turso (LibSQL) Database — Connection & Shared Utilities
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

export function clampPageSize(limit?: number): number {
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

const DEFAULT_SEARCH_LIMIT = 10;

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
