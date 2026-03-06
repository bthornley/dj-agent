import { Event, Lead, QuerySeed, LeadHandoff, SentEmail } from './types';
import { PaginatedResult } from './db';

// ============================================================
// API Client — Fetch wrapper for event + lead CRUD
// ============================================================

const BASE = '/api/events';
const LEADS_BASE = '/api/leads';

// ---- Resilient Fetch Wrapper ----

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000]; // Exponential backoff

async function fetchWithRetry(
    input: RequestInfo | URL,
    init?: RequestInit & { retries?: number; timeoutMs?: number }
): Promise<Response> {
    const maxRetries = init?.retries ?? MAX_RETRIES;
    const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(input, {
                ...init,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            // Only retry on 5xx server errors, not 4xx client errors
            if (res.status >= 500 && attempt < maxRetries) {
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] ?? 2000));
                continue;
            }
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            if (attempt >= maxRetries) throw err;
            // Retry on network errors and timeouts
            await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] ?? 2000));
        }
    }

    // Should not reach here, but satisfy TypeScript
    throw new Error('fetchWithRetry: exhausted retries');
}

export async function fetchEvents(): Promise<PaginatedResult<Event>> {
    const res = await fetchWithRetry(BASE);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
}

export async function fetchEvent(id: string): Promise<Event | null> {
    const res = await fetchWithRetry(`${BASE}/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
}

export async function createEvent(event: Event): Promise<{ success: boolean; id: string }> {
    const res = await fetchWithRetry(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const res = await fetchWithRetry(`${BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
    const res = await fetchWithRetry(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
}

// ============================================================
// Lead API Client
// ============================================================

export async function fetchLeads(filters?: {
    status?: string;
    priority?: string;
    minScore?: number;
    search?: string;
    mode?: string;
    limit?: number;
    offset?: number;
}): Promise<{ data: Lead[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.minScore !== undefined) params.set('minScore', String(filters.minScore));
    if (filters?.search) params.set('search', filters.search);
    if (filters?.mode) params.set('mode', filters.mode);
    if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
    if (filters?.offset !== undefined) params.set('offset', String(filters.offset));

    const url = params.toString() ? `${LEADS_BASE}?${params}` : LEADS_BASE;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
}

export async function fetchLead(id: string): Promise<Lead | null> {
    const res = await fetchWithRetry(`${LEADS_BASE}/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch lead');
    return res.json();
}

export async function createLead(lead: Partial<Lead>): Promise<{ success: boolean; lead: Lead }> {
    const res = await fetchWithRetry(LEADS_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
    });
    if (!res.ok) throw new Error('Failed to create lead');
    return res.json();
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const res = await fetchWithRetry(`${LEADS_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return res.json();
}

export async function deleteLead(id: string): Promise<void> {
    const res = await fetchWithRetry(`${LEADS_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete lead');
}

export async function deleteAllLeads(mode?: string): Promise<{ deleted: number }> {
    const params = new URLSearchParams({ all: 'true' });
    if (mode) params.set('mode', mode);
    const res = await fetchWithRetry(`${LEADS_BASE}?${params}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete leads');
    return res.json();
}

export async function scanUrl(input: {
    url: string;
    entity_name?: string;
    city?: string;
    state?: string;
    entity_type?: string;
}): Promise<{
    success: boolean;
    lead: Lead;
    isNew: boolean;
    isDuplicate: boolean;
    qcPassed: boolean;
    qcIssues: string[];
    qcWarnings: string[];
}> {
    const res = await fetchWithRetry(`${LEADS_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Scan failed' }));
        throw new Error(err.error || 'Scan failed');
    }
    return res.json();
}

export async function fetchLeadStats(mode?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    avgScore: number;
}> {
    const params = new URLSearchParams({ stats: 'true' });
    if (mode) params.set('mode', mode);
    const res = await fetchWithRetry(`${LEADS_BASE}?${params}`);
    if (!res.ok) throw new Error('Failed to fetch lead stats');
    return res.json();
}

export async function fetchSeeds(mode?: string): Promise<QuerySeed[]> {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    const url = params.toString() ? `${LEADS_BASE}/seeds?${params}` : `${LEADS_BASE}/seeds`;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error('Failed to fetch seeds');
    return res.json();
}

export async function createSeed(seed: Partial<QuerySeed>): Promise<{ success: boolean; seed: QuerySeed }> {
    const res = await fetchWithRetry(`${LEADS_BASE}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seed),
    });
    if (!res.ok) throw new Error('Failed to create seed');
    return res.json();
}

export async function deleteSeed(id: string): Promise<void> {
    const res = await fetchWithRetry(`${LEADS_BASE}/seeds?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete seed');
}

export async function deleteAllSeeds(mode?: string): Promise<{ deleted: number }> {
    const params = new URLSearchParams({ all: 'true' });
    if (mode) params.set('mode', mode);
    const res = await fetchWithRetry(`${LEADS_BASE}/seeds?${params}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete seeds');
    return res.json();
}

export async function handoffLeads(leadIds: string[]): Promise<{
    success: boolean;
    queued: number;
    failed: number;
    results: { lead_id: string; success: boolean; error?: string; handoff?: LeadHandoff }[];
}> {
    const res = await fetchWithRetry(`${LEADS_BASE}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
    });
    if (!res.ok) throw new Error('Failed to handoff leads');
    return res.json();
}

export async function autoScan(options: {
    auto: true;
    region?: string;
    limit?: number;
}): Promise<{
    mode: string;
    seedsProcessed: number;
    totalUrls: number;
    highValueLeads: number;
    filteredOut: number;
    errors: string[];
    results: {
        region: string;
        keywords: string[];
        urlsFound: number;
        leadsCreated: number;
        leadsFiltered: number;
        leads: { lead_id: string; entity_name: string; lead_score: number; priority: string }[];
        errors: string[];
    }[];
}> {
    const res = await fetchWithRetry(`${LEADS_BASE}/auto-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Auto-scan failed' }));
        throw new Error(err.error || 'Auto-scan failed');
    }
    return res.json();
}

export async function batchScanUrls(urls: { url: string; entity_name?: string; city?: string }[]): Promise<{
    mode: string;
    totalUrls: number;
    processed: number;
    highValue: number;
    filtered: number;
    results: { lead: Lead; isNew: boolean; qcPassed: boolean }[];
    errors: string[];
}> {
    const res = await fetchWithRetry(`${LEADS_BASE}/auto-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Batch scan failed' }));
        throw new Error(err.error || 'Batch scan failed');
    }
    return res.json();
}

// ============================================================
// Email API Client
// ============================================================

export async function sendEmail(params: {
    eventId?: string;
    to: string;
    subject: string;
    emailBody: string;
    replyTo?: string;
}): Promise<{ success: boolean; emailId?: string; resendId?: string; error?: string }> {
    const res = await fetchWithRetry('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    return res.json();
}

export async function fetchSentEmails(): Promise<SentEmail[]> {
    const res = await fetchWithRetry('/api/emails');
    if (!res.ok) throw new Error('Failed to fetch sent emails');
    return res.json();
}
