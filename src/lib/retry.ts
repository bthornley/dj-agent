// ============================================================
// Retry Utility — Resilient API calls with exponential backoff
// ============================================================

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelay?: number;
        maxDelay?: number;
        label?: string;
    } = {}
): Promise<T> {
    const { maxRetries = 3, baseDelay = 500, maxDelay = 5000, label = 'operation' } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            if (attempt < maxRetries) {
                const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 200, maxDelay);
                console.warn(`[retry] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`, lastError.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`[retry] ${label} failed after ${maxRetries + 1} attempts`);
    throw lastError;
}

// Convenience wrapper for fetch with retry
export async function fetchWithRetry(
    url: string,
    init?: RequestInit,
    retryOptions?: { maxRetries?: number; label?: string }
): Promise<Response> {
    return withRetry(
        async () => {
            const res = await fetch(url, init);
            if (!res.ok && res.status >= 500) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res;
        },
        { label: retryOptions?.label || `fetch ${url}`, maxRetries: retryOptions?.maxRetries ?? 2 }
    );
}
