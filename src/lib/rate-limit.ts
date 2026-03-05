// ============================================================
// Database-backed rate limiter (works on serverless)
// Uses the search_quota table in Turso for distributed state.
// Falls back to in-memory if DB is unavailable.
// ============================================================

import { getDb } from './db';

/**
 * Check if a request is allowed under a sliding-window rate limit.
 * Uses the DB for persistence so it works across Vercel instances.
 *
 * @param key      Unique key (e.g. `userId:endpoint`)
 * @param limit    Max requests per window
 * @param windowMs Window duration in ms (default 60s)
 * @returns { allowed, remaining, retryAfterMs }
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
    try {
        const db = getDb();
        const now = Date.now();
        const windowStart = now - windowMs;
        const quotaKey = `rl:${key}`;

        // Ensure rate_limit_log table exists (idempotent)
        await db.execute({
            sql: `CREATE TABLE IF NOT EXISTS rate_limit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL,
                ts INTEGER NOT NULL
            )`,
            args: [],
        });

        // Create index if not exists
        await db.execute({
            sql: `CREATE INDEX IF NOT EXISTS idx_rl_key_ts ON rate_limit_log(key, ts)`,
            args: [],
        });

        // Clean old entries and count recent ones in a batch
        await db.execute({
            sql: `DELETE FROM rate_limit_log WHERE key = ? AND ts < ?`,
            args: [quotaKey, windowStart],
        });

        const countResult = await db.execute({
            sql: `SELECT COUNT(*) as c FROM rate_limit_log WHERE key = ? AND ts >= ?`,
            args: [quotaKey, windowStart],
        });
        const count = Number(countResult.rows[0]?.c ?? 0);

        if (count >= limit) {
            // Find oldest entry in window to compute retry-after
            const oldestResult = await db.execute({
                sql: `SELECT MIN(ts) as oldest FROM rate_limit_log WHERE key = ? AND ts >= ?`,
                args: [quotaKey, windowStart],
            });
            const oldest = Number(oldestResult.rows[0]?.oldest ?? now);
            const retryAfterMs = Math.max(0, (oldest + windowMs) - now);
            return { allowed: false, remaining: 0, retryAfterMs };
        }

        // Record this request
        await db.execute({
            sql: `INSERT INTO rate_limit_log (key, ts) VALUES (?, ?)`,
            args: [quotaKey, now],
        });

        return { allowed: true, remaining: limit - count - 1, retryAfterMs: 0 };
    } catch (err) {
        // If DB fails, allow the request (fail-open) and log the error
        console.error('[rate-limit] DB fallback — allowing request:', err);
        return { allowed: true, remaining: limit, retryAfterMs: 0 };
    }
}

/**
 * Return a safe error message — hides internal details in production.
 */
export function safeError(err: unknown): string {
    if (process.env.NODE_ENV === 'development') {
        return err instanceof Error ? err.message : String(err);
    }
    return 'An unexpected error occurred';
}
