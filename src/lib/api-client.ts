import { Event, Lead, QuerySeed, LeadHandoff } from './types';

// ============================================================
// API Client — Fetch wrapper for event + lead CRUD
// ============================================================

const BASE = '/api/events';
const LEADS_BASE = '/api/leads';

export async function fetchEvents(): Promise<Event[]> {
    const res = await fetch(BASE);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
}

export async function fetchEvent(id: string): Promise<Event | null> {
    const res = await fetch(`${BASE}/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
}

export async function createEvent(event: Event): Promise<{ success: boolean; id: string }> {
    const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const res = await fetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
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
}): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.minScore !== undefined) params.set('minScore', String(filters.minScore));
    if (filters?.search) params.set('search', filters.search);

    const url = params.toString() ? `${LEADS_BASE}?${params}` : LEADS_BASE;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
}

export async function fetchLead(id: string): Promise<Lead | null> {
    const res = await fetch(`${LEADS_BASE}/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch lead');
    return res.json();
}

export async function createLead(lead: Partial<Lead>): Promise<{ success: boolean; lead: Lead }> {
    const res = await fetch(LEADS_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
    });
    if (!res.ok) throw new Error('Failed to create lead');
    return res.json();
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const res = await fetch(`${LEADS_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return res.json();
}

export async function deleteLead(id: string): Promise<void> {
    const res = await fetch(`${LEADS_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete lead');
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
    const res = await fetch(`${LEADS_BASE}/scan`, {
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

export async function fetchLeadStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    avgScore: number;
}> {
    const res = await fetch(`${LEADS_BASE}?stats=true`);
    if (!res.ok) throw new Error('Failed to fetch lead stats');
    return res.json();
}

export async function fetchSeeds(): Promise<QuerySeed[]> {
    const res = await fetch(`${LEADS_BASE}/seeds`);
    if (!res.ok) throw new Error('Failed to fetch seeds');
    return res.json();
}

export async function createSeed(seed: Partial<QuerySeed>): Promise<{ success: boolean; seed: QuerySeed }> {
    const res = await fetch(`${LEADS_BASE}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seed),
    });
    if (!res.ok) throw new Error('Failed to create seed');
    return res.json();
}

export async function deleteSeed(id: string): Promise<void> {
    const res = await fetch(`${LEADS_BASE}/seeds?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete seed');
}

export async function handoffLeads(leadIds: string[]): Promise<{
    success: boolean;
    queued: number;
    failed: number;
    results: { lead_id: string; success: boolean; error?: string; handoff?: LeadHandoff }[];
}> {
    const res = await fetch(`${LEADS_BASE}/handoff`, {
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
    const res = await fetch(`${LEADS_BASE}/auto-scan`, {
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
    const res = await fetch(`${LEADS_BASE}/auto-scan`, {
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


