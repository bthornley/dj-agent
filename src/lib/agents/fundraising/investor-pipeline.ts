import { createClient, Client } from '@libsql/client';
import { getRecentSnapshots, DailyMetrics, generateWeeklyInvestorUpdate } from '@/lib/agents/analytics/analytics-agent';
import { randomUUID as uuid } from 'crypto';

// ============================================================
// Investor Pipeline Agent — CRM, Scoring & Outreach
// Manages the fundraising pipeline: discover → score → draft → track
// ============================================================

// Reuse Turso connection
let _db: Client | null = null;
function getDb(): Client {
    if (!_db) {
        _db = createClient({
            url: process.env.TURSO_DATABASE_URL || 'file:data/giglift.db',
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    }
    return _db;
}

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

We've built a crew of 5 AI agents that discover venues, score leads, draft booking emails, build press kits, and plan social content. Musicians deploy their agents and wake up to new opportunities.

**Quick numbers:**
- ${metrics.totalUsers.toLocaleString()} users across 4 modes (Performer, Instructor, Studio, Touring)
- ${metrics.totalLeads.toLocaleString()} leads generated
- $${metrics.mrr.toLocaleString()} MRR / $${metrics.arr.toLocaleString()} ARR
- ${metrics.paidSubscribers} paid subscribers
- $47B TAM (live bookings + music lessons)

We're raising a $1M seed round at a $5M pre-money valuation to scale our AI agent infrastructure and go-to-market.

${investor.firm ? `I noticed ${investor.firm}'s focus on ${investor.sectors || 'technology'} — our approach to autonomous AI agents for a massive fragmented market could be a strong fit.` : ''}

Would love 20 minutes to show you the platform in action.

Best,
Blake Thornley
Founder, GigLift
https://giglift.com`;

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

// ---- Main Agent Entrypoint ----

export async function runInvestorPipelineAgent(): Promise<{
    pipeline: Record<InvestorStatus, number>;
    newDrafts: number;
    weeklyUpdate: string | null;
}> {
    console.log('[investor-agent] Starting pipeline run...');

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

    return { pipeline, newDrafts, weeklyUpdate };
}
