// ============================================================
// In-memory rate limiter (token-bucket)
// ============================================================

interface RateLimitEntry {
    tokens: number;
    lastRefill: number;
}

const buckets = new Map<string, RateLimitEntry>();

/**
 * Check if a request is allowed under the rate limit.
 * @param key   Unique key (e.g. `userId:endpoint`)
 * @param limit Max requests per window
 * @param windowMs Window duration in ms (default 60s)
 * @returns { allowed, remaining, retryAfterMs }
 */
export function rateLimit(
    key: string,
    limit: number,
    windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now();
    let entry = buckets.get(key);

    if (!entry) {
        entry = { tokens: limit, lastRefill: now };
        buckets.set(key, entry);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - entry.lastRefill;
    const refillRate = limit / windowMs; // tokens per ms
    entry.tokens = Math.min(limit, entry.tokens + elapsed * refillRate);
    entry.lastRefill = now;

    if (entry.tokens < 1) {
        const retryAfterMs = Math.ceil((1 - entry.tokens) / refillRate);
        return { allowed: false, remaining: 0, retryAfterMs };
    }

    entry.tokens -= 1;
    return { allowed: true, remaining: Math.floor(entry.tokens), retryAfterMs: 0 };
}

// Periodically clean up stale entries (every 5 minutes)
setInterval(() => {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [key, entry] of buckets) {
        if (entry.lastRefill < cutoff) {
            buckets.delete(key);
        }
    }
}, 5 * 60_000);
