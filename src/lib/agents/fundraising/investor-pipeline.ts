import { getDb } from '@/lib/db';
import { Client } from '@libsql/client';
import { getRecentSnapshots, DailyMetrics, generateWeeklyInvestorUpdate } from '@/lib/agents/analytics/analytics-agent';
import { aiJSON } from '@/lib/ai';
import { randomUUID as uuid } from 'crypto';

const SERPAPI_BASE = 'https://serpapi.com/search.json';

// Search queries an expert fundraiser would use
const INVESTOR_SEARCH_QUERIES = [
    '"music tech" seed investor angel fund 2024 2025',
    '"creator economy" venture capital pre-seed SaaS',
    '"entertainment technology" angel investor portfolio music',
    '"AI SaaS" seed fund music entertainment marketplace',
    'angel investor "live music" booking technology startup',
];

// ============================================================
// Investor Outreach Agent — CRM, Scoring & Outreach
// Manages the fundraising pipeline: discover → score → draft → track
// ============================================================

let _migrated = false;
async function ensureInvestorSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS investors (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                firm TEXT DEFAULT '',
                email TEXT DEFAULT '',
                linkedin TEXT DEFAULT '',
                stage_preference TEXT DEFAULT '',
                check_size TEXT DEFAULT '',
                sectors TEXT DEFAULT '',
                fit_score INTEGER DEFAULT 0,
                status TEXT DEFAULT 'discovered',
                notes TEXT DEFAULT '',
                last_contacted TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS investor_outreach (
                id TEXT PRIMARY KEY,
                investor_id TEXT NOT NULL,
                type TEXT DEFAULT 'email',
                subject TEXT DEFAULT '',
                body TEXT NOT NULL,
                status TEXT DEFAULT 'draft',
                sent_at TEXT DEFAULT '',
                opened_at TEXT DEFAULT '',
                replied_at TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS investor_updates (
                id TEXT PRIMARY KEY,
                week_of TEXT NOT NULL,
                content TEXT NOT NULL,
                sent_to INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export type InvestorStatus = 'discovered' | 'scored' | 'outreach_sent' | 'replied' | 'intro_call' | 'partner_meeting' | 'term_sheet' | 'closed' | 'passed';

export interface Investor {
    id: string;
    name: string;
    firm: string;
    email: string;
    linkedin: string;
    stage_preference: string;
    check_size: string;
    sectors: string;
    fit_score: number;
    status: InvestorStatus;
    notes: string;
    last_contacted: string;
    created_at: string;
}

// ---- CRM Operations ----

export async function addInvestor(investor: Omit<Investor, 'id' | 'created_at'>): Promise<Investor> {
    const db = await ensureInvestorSchema();
    const id = uuid();
    const now = new Date().toISOString();

    await db.execute({
        sql: `INSERT INTO investors (id, name, firm, email, linkedin, stage_preference, check_size, sectors, fit_score, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, investor.name, investor.firm, investor.email, investor.linkedin,
            investor.stage_preference, investor.check_size, investor.sectors,
            investor.fit_score, investor.status, investor.notes],
    });

    return { ...investor, id, created_at: now };
}

export async function getInvestors(status?: InvestorStatus): Promise<Investor[]> {
    const db = await ensureInvestorSchema();
    let sql = 'SELECT * FROM investors ORDER BY fit_score DESC, created_at DESC';
    const args: string[] = [];

    if (status) {
        sql = 'SELECT * FROM investors WHERE status = ? ORDER BY fit_score DESC';
        args.push(status);
    }

    const result = await db.execute({ sql, args });
    return result.rows.map(row => ({
        id: String(row.id),
        name: String(row.name),
        firm: String(row.firm),
        email: String(row.email),
        linkedin: String(row.linkedin),
        stage_preference: String(row.stage_preference),
        check_size: String(row.check_size),
        sectors: String(row.sectors),
        fit_score: Number(row.fit_score),
        status: String(row.status) as InvestorStatus,
        notes: String(row.notes),
        last_contacted: String(row.last_contacted),
        created_at: String(row.created_at),
    }));
}

export async function updateInvestorStatus(id: string, status: InvestorStatus, notes?: string): Promise<void> {
    const db = await ensureInvestorSchema();
    await db.execute({
        sql: `UPDATE investors SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`,
        args: [status, notes ?? null, id],
    });
}

export async function getPipelineSummary(): Promise<Record<InvestorStatus, number>> {
    const db = await ensureInvestorSchema();
    const result = await db.execute({
        sql: `SELECT status, COUNT(*) as count FROM investors GROUP BY status`,
        args: [],
    });

    const summary: Record<string, number> = {
        discovered: 0, scored: 0, outreach_sent: 0, replied: 0,
        intro_call: 0, partner_meeting: 0, term_sheet: 0, closed: 0, passed: 0,
    };

    for (const row of result.rows) {
        summary[String(row.status)] = Number(row.count);
    }
    return summary as Record<InvestorStatus, number>;
}

// ---- Investor Scoring ----

export function scoreInvestor(investor: { stage_preference: string; check_size: string; sectors: string }): number {
    let score = 0;

    // Stage fit (seed/pre-seed = perfect, Series A = ok, later = poor)
    const stage = investor.stage_preference.toLowerCase();
    if (stage.includes('pre-seed') || stage.includes('seed')) score += 35;
    else if (stage.includes('angel')) score += 30;
    else if (stage.includes('series a')) score += 15;
    else score += 5;

    // Sector fit (music-tech, SaaS, AI, creator economy)
    const sectors = investor.sectors.toLowerCase();
    if (sectors.includes('music') || sectors.includes('audio')) score += 30;
    else if (sectors.includes('creator') || sectors.includes('entertainment')) score += 25;
    else if (sectors.includes('saas') || sectors.includes('ai') || sectors.includes('marketplace')) score += 20;
    else score += 5;

    // Check size fit ($100K-$500K ideal for $1M round)
    const checkSize = investor.check_size.toLowerCase();
    if (checkSize.includes('100k') || checkSize.includes('250k') || checkSize.includes('500k')) score += 25;
    else if (checkSize.includes('50k') || checkSize.includes('25k')) score += 15;
    else if (checkSize.includes('1m') || checkSize.includes('2m')) score += 10;
    else score += 5;

    // Has email = bonus
    if (investor.check_size) score += 10;

    return Math.min(100, score);
}

// ---- Outreach Drafting ----

export function draftPitchEmail(investor: Investor, metrics: DailyMetrics): string {
    const subject = `GigLift — AI agents for the $47B musician booking market`;

    const body = `Hi ${investor.name.split(' ')[0]},

I'm Blake, founder of GigLift — an AI agent platform that helps musicians find gigs, students, and studio work autonomously.

We've built a crew of 7 AI agents that discover venues, score leads, draft booking emails, build press kits, plan social content, create event flyers, and manage the full booking calendar. Musicians deploy their agents and wake up to new opportunities.

**Quick numbers:**
- ${metrics.totalUsers.toLocaleString()} users across 4 modes (Performer, Instructor, Studio, Touring)
- ${metrics.totalLeads.toLocaleString()} leads generated
- $${metrics.mrr.toLocaleString()} MRR / $${metrics.arr.toLocaleString()} ARR
- ${metrics.paidSubscribers} paid subscribers
- $47B TAM (live bookings + music lessons)

We're raising a $1M seed round at a $5M pre-money valuation to scale our AI agent infrastructure and go-to-market.

${investor.firm ? `I noticed ${investor.firm}'s focus on ${investor.sectors || 'technology'} — our approach to autonomous AI agents for a massive fragmented market could be a strong fit.` : ''}

I've attached our full pitch deck (co-branded with Bandsintown, our strategic M&A partner) for your review. Would love 20 minutes to walk you through the platform live.

Best,
Blake Thornley
Founder & CEO, GigLift
https://giglift.com

P.S. Pitch deck also available at: https://giglift.com/admin/docs`;

    return `Subject: ${subject}\n\n${body}`;
}

// ---- Weekly Update Management ----

export async function saveWeeklyUpdate(weekOf: string, content: string): Promise<void> {
    const db = await ensureInvestorSchema();
    await db.execute({
        sql: `INSERT INTO investor_updates (id, week_of, content) VALUES (?, ?, ?)`,
        args: [uuid(), weekOf, content],
    });
}

export async function getLatestUpdates(limit: number = 4): Promise<Array<{ week_of: string; content: string; created_at: string }>> {
    const db = await ensureInvestorSchema();
    const result = await db.execute({
        sql: `SELECT week_of, content, created_at FROM investor_updates ORDER BY created_at DESC LIMIT ?`,
        args: [limit],
    });
    return result.rows.map(row => ({
        week_of: String(row.week_of),
        content: String(row.content),
        created_at: String(row.created_at),
    }));
}

// ---- Outreach Logging ----

export async function logOutreach(investorId: string, subject: string, body: string): Promise<void> {
    const db = await ensureInvestorSchema();
    await db.execute({
        sql: `INSERT INTO investor_outreach (id, investor_id, subject, body, status) VALUES (?, ?, ?, ?, 'draft')`,
        args: [uuid(), investorId, subject, body],
    });
    await db.execute({
        sql: `UPDATE investors SET last_contacted = datetime('now'), status = 'outreach_sent', updated_at = datetime('now') WHERE id = ? AND status IN ('discovered', 'scored')`,
        args: [investorId],
    });
}

// ---- Get Outreach Drafts (joined with investor info) ----

export interface OutreachDraft {
    id: string;
    investor_name: string;
    investor_firm: string;
    investor_email: string;
    subject: string;
    body: string;
    status: string;
    created_at: string;
}

export async function getOutreachDrafts(limit: number = 20): Promise<OutreachDraft[]> {
    const db = await ensureInvestorSchema();
    const result = await db.execute({
        sql: `SELECT o.id, i.name as investor_name, i.firm as investor_firm, i.email as investor_email,
              o.subject, o.body, o.status, o.created_at
              FROM investor_outreach o
              JOIN investors i ON o.investor_id = i.id
              ORDER BY o.created_at DESC
              LIMIT ?`,
        args: [limit],
    });
    return result.rows.map(row => ({
        id: String(row.id),
        investor_name: String(row.investor_name),
        investor_firm: String(row.investor_firm),
        investor_email: String(row.investor_email),
        subject: String(row.subject),
        body: String(row.body),
        status: String(row.status),
        created_at: String(row.created_at),
    }));
}

// ---- Internet Search Discovery ----

interface ParsedInvestor {
    name: string;
    firm: string;
    email: string;
    linkedin: string;
    stage_preference: string;
    check_size: string;
    sectors: string;
}

async function searchInvestors(query: string): Promise<Array<{ title: string; snippet: string; link: string }>> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
        console.warn('[investor-agent] SERPAPI_KEY not set, skipping internet search');
        return [];
    }

    try {
        const searchUrl = new URL(SERPAPI_BASE);
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('api_key', apiKey);
        searchUrl.searchParams.set('engine', 'google');
        searchUrl.searchParams.set('num', '10');
        searchUrl.searchParams.set('gl', 'us');

        const res = await fetch(searchUrl.toString(), {
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
            console.error(`[investor-agent] SerpAPI returned ${res.status}`);
            return [];
        }

        const data = await res.json();
        return (data.organic_results || []).map((r: { title?: string; snippet?: string; link?: string }) => ({
            title: r.title || '',
            snippet: r.snippet || '',
            link: r.link || '',
        }));
    } catch (err) {
        console.error('[investor-agent] Search failed:', err);
        return [];
    }
}

async function parseInvestorsFromResults(
    results: Array<{ title: string; snippet: string; link: string }>
): Promise<ParsedInvestor[]> {
    if (results.length === 0) return [];

    const searchContext = results.map((r, i) =>
        `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}`
    ).join('\n\n');

    const parsed = await aiJSON<{ investors: ParsedInvestor[] }>(
        `You are an expert fundraising analyst. Extract investor/VC information from search results.
Return a JSON object with an "investors" array. For each investor or firm found, extract:
- name: full name of investor or managing partner
- firm: fund/firm name
- email: contact email if visible (empty string if not found)
- linkedin: LinkedIn URL if visible (empty string if not found)
- stage_preference: their investment stage (e.g. "pre-seed", "seed", "Series A")
- check_size: typical check size if mentioned (e.g. "$100K-$500K")
- sectors: their focus sectors (e.g. "music-tech, SaaS, AI")

Only include entries that are clearly investors, VCs, or angel investors. Skip aggregator sites, news articles, or irrelevant results. If a result mentions a firm but no individual, use the firm name as "name" too.`,
        `Extract investors from these search results:\n\n${searchContext}`,
        { maxTokens: 2048, temperature: 0.3 }
    );

    return parsed?.investors || [];
}

export async function discoverInvestors(): Promise<{ discovered: number; skipped: number; errors: string[] }> {
    console.log('[investor-agent] Starting internet search for investors...');
    const errors: string[] = [];
    let totalDiscovered = 0;
    let totalSkipped = 0;

    // Get existing investors to deduplicate
    const existing = await getInvestors();
    const existingKeys = new Set(
        existing.map(i => `${i.name.toLowerCase().trim()}|${i.firm.toLowerCase().trim()}`)
    );

    // Rotate through search queries (use 2 per run to conserve API calls)
    const now = new Date();
    const queryIndex = (now.getDate() * 2) % INVESTOR_SEARCH_QUERIES.length;
    const queries = [
        INVESTOR_SEARCH_QUERIES[queryIndex % INVESTOR_SEARCH_QUERIES.length],
        INVESTOR_SEARCH_QUERIES[(queryIndex + 1) % INVESTOR_SEARCH_QUERIES.length],
    ];

    for (const query of queries) {
        try {
            console.log(`[investor-agent] Searching: "${query.substring(0, 50)}..."`);
            const results = await searchInvestors(query);
            const parsed = await parseInvestorsFromResults(results);

            for (const inv of parsed) {
                const key = `${inv.name.toLowerCase().trim()}|${inv.firm.toLowerCase().trim()}`;
                if (existingKeys.has(key)) {
                    totalSkipped++;
                    continue;
                }
                existingKeys.add(key);

                const score = scoreInvestor(inv);
                await addInvestor({
                    name: inv.name,
                    firm: inv.firm,
                    email: inv.email,
                    linkedin: inv.linkedin,
                    stage_preference: inv.stage_preference,
                    check_size: inv.check_size,
                    sectors: inv.sectors,
                    fit_score: score,
                    status: 'discovered',
                    notes: `Auto-discovered via web search. Score: ${score}/100`,
                    last_contacted: '',
                });
                totalDiscovered++;
            }

            // Rate limit between searches
            await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'unknown error';
            errors.push(`Search failed for "${query.substring(0, 30)}...": ${msg}`);
            console.error(`[investor-agent] Search error:`, msg);
        }
    }

    console.log(`[investor-agent] Discovery complete: ${totalDiscovered} new, ${totalSkipped} duplicates`);
    return { discovered: totalDiscovered, skipped: totalSkipped, errors };
}

// ---- Main Agent Entrypoint ----

export async function runInvestorPipelineAgent(): Promise<{
    pipeline: Record<InvestorStatus, number>;
    newDiscoveries: number;
    newDrafts: number;
    weeklyUpdate: string | null;
}> {
    console.log('[investor-agent] Starting outreach run...');

    // 0. Discover new investors from the internet
    const discovery = await discoverInvestors();
    console.log(`[investor-agent] Discovered ${discovery.discovered} new investor leads`);

    // 1. Score any unscored investors
    const discovered = await getInvestors('discovered');
    for (const inv of discovered) {
        const score = scoreInvestor(inv);
        await updateInvestorStatus(inv.id, 'scored', `Auto-scored: ${score}/100`);
        const db = await ensureInvestorSchema();
        await db.execute({
            sql: `UPDATE investors SET fit_score = ?, updated_at = datetime('now') WHERE id = ?`,
            args: [score, inv.id],
        });
    }
    console.log(`[investor-agent] Scored ${discovered.length} new investors`);

    // 2. Draft outreach for top-scored investors without outreach
    const scored = await getInvestors('scored');
    const topInvestors = scored.filter(i => i.fit_score >= 60).slice(0, 5);

    let newDrafts = 0;
    const snapshots = await getRecentSnapshots(1);
    const latestMetrics = snapshots[0];

    if (latestMetrics) {
        for (const inv of topInvestors) {
            const draft = draftPitchEmail(inv, latestMetrics);
            const [subject, ...bodyParts] = draft.split('\n\n');
            await logOutreach(inv.id, subject.replace('Subject: ', ''), bodyParts.join('\n\n'));
            newDrafts++;
        }
    }
    console.log(`[investor-agent] Drafted ${newDrafts} new outreach emails`);

    // 3. Generate weekly update on Sundays
    let weeklyUpdate: string | null = null;
    if (new Date().getDay() === 0) {
        const weekSnapshots = await getRecentSnapshots(7);
        weeklyUpdate = generateWeeklyInvestorUpdate(weekSnapshots);
        const weekOf = new Date().toISOString().split('T')[0];
        await saveWeeklyUpdate(weekOf, weeklyUpdate);
        console.log('[investor-agent] Generated weekly investor update');
    }

    const pipeline = await getPipelineSummary();

    return { pipeline, newDiscoveries: discovery.discovered, newDrafts, weeklyUpdate };
}
