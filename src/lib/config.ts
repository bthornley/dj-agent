// ============================================================
// GigLift — Centralized Configuration
// All magic numbers, limits, and tunable constants in one place.
// ============================================================

// ---- Pagination ----

export const DEFAULT_PAGE_SIZE = 200;
export const MAX_PAGE_SIZE = 1000;

// ---- Rate Limiting ----

export const RATE_LIMIT_DEFAULTS = {
    /** Default sliding window duration (ms) */
    windowMs: 60_000,
    /** Stale entry cleanup threshold (ms) */
    staleThresholdMs: 300_000,
} as const;

// ---- Search & Scan ----

export const SEARCH_DEFAULTS = {
    /** Default monthly scan limit for free plan */
    monthlyLimit: 10,
    /** Max URLs processed per auto-scan batch */
    maxBatchUrls: 50,
    /** Max concurrent URL scans */
    concurrency: 5,
} as const;

// ---- Lead Scoring ----

export const SCORING_WEIGHTS = {
    contactInfo: 25,
    musicFit: 20,
    venueQuality: 15,
    budgetSignal: 15,
    eventHistory: 10,
    locationFit: 10,
    socialPresence: 5,
} as const;

export const PRIORITY_THRESHOLDS = {
    P1: 80,
    P2: 60,
    P3: 40,
} as const;

// ---- API Client ----

export const FETCH_DEFAULTS = {
    /** Default timeout for API calls (ms) */
    timeoutMs: 15_000,
    /** Max retries on 5xx or network error */
    maxRetries: 3,
    /** Backoff delays per retry attempt (ms) */
    retryDelays: [500, 1000, 2000] as readonly number[],
} as const;

// ---- Customer Success ----

export const HEALTH_SCORE_WEIGHTS = {
    activityRecency: 0.30,
    scanUsage: 0.25,
    leadsGenerated: 0.20,
    featuresAdopted: 0.15,
    accountAge: 0.10,
} as const;

export const HEALTH_THRESHOLDS = {
    healthy: 70,
    atRisk: 40,
    // Below atRisk = churning
} as const;

// ---- Field Limits ----

export const FIELD_LIMITS = {
    /** Max length for any single text field in event/lead payloads */
    maxFieldLength: 10_000,
    /** Max ambassadors referenced in brand ambassador plan */
    maxAmbassadorsPerTier: 500,
} as const;

// ---- Cron ----

export const CRON_DEFAULTS = {
    /** Max runtime for cron jobs before self-killing (ms) */
    maxRuntimeMs: 55_000,
} as const;
