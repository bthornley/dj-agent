import { getDb } from '@/lib/db';
import { Client } from '@libsql/client';
import { randomUUID as uuid } from 'crypto';

// ============================================================
// Education Outreach Agent — Music School Blitz Campaign
// Prospects music schools, manages outreach sequences,
// tracks student signups, and generates campus materials.
// ============================================================

let _migrated = false;
async function ensureEducationSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS music_school_leads (
                id TEXT PRIMARY KEY,
                school_name TEXT NOT NULL,
                tier TEXT DEFAULT 'university',
                contact_name TEXT DEFAULT '',
                contact_email TEXT DEFAULT '',
                contact_role TEXT DEFAULT '',
                department TEXT DEFAULT 'Music',
                student_count INTEGER DEFAULT 0,
                location TEXT DEFAULT '',
                website TEXT DEFAULT '',
                status TEXT DEFAULT 'prospected',
                outreach_step INTEGER DEFAULT 0,
                last_contacted TEXT,
                notes TEXT DEFAULT '',
                slug TEXT DEFAULT '',
                signups INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS school_outreach_log (
                id TEXT PRIMARY KEY,
                school_id TEXT NOT NULL,
                step INTEGER NOT NULL,
                subject TEXT DEFAULT '',
                body TEXT DEFAULT '',
                status TEXT DEFAULT 'sent',
                sent_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export interface SchoolLead {
    id: string;
    school_name: string;
    tier: string;
    contact_name: string;
    contact_email: string;
    contact_role: string;
    department: string;
    student_count: number;
    location: string;
    website: string;
    status: string;
    outreach_step: number;
    last_contacted: string | null;
    slug: string;
    signups: number;
    created_at: string;
}

export interface OutreachLog {
    id: string;
    school_id: string;
    step: number;
    subject: string;
    body: string;
    status: string;
    sent_at: string;
}

// ---- School Prospecting ----

async function discoverMusicSchools(): Promise<number> {
    const { aiJSON } = await import('@/lib/ai');

    const queries = [
        'top music conservatories university programs United States contact email',
        'university music department chair contact email .edu',
        'music performance degree program career services contact',
        'college of music faculty directory department head email',
        'music school programs accepting students enrollment contact',
    ];

    const query = queries[Math.floor(Math.random() * queries.length)];

    // Use SerpAPI to search
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
        console.log('[education] No SERPAPI_KEY, using seed data');
        return await seedSchoolData();
    }

    const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=10&api_key=${apiKey}`;
    const resp = await fetch(searchUrl);
    const data = await resp.json();

    const snippets = (data.organic_results || [])
        .slice(0, 8)
        .map((r: { title?: string; snippet?: string; link?: string }) =>
            `${r.title || ''} — ${r.snippet || ''} — ${r.link || ''}`
        )
        .join('\n');

    if (!snippets) return await seedSchoolData();

    const result = await aiJSON<{
        schools: Array<{
            name: string; tier: string; contact_name: string; contact_email: string;
            contact_role: string; student_count: number; location: string; website: string;
        }>
    }>(
        'You are a research assistant finding music school contacts. Return structured JSON.',
        `Extract music school information from these search results. For each school found, provide:\n- name: full school/program name\n- tier: "conservatory", "university", "community", or "private"\n- contact_name: department contact (if found)\n- contact_email: email address (if found)\n- contact_role: role/title\n- student_count: estimated music students (0 if unknown)\n- location: city, state\n- website: URL\n\nSearch results:\n${snippets}\n\nReturn JSON: { "schools": [...] }`,
        { maxTokens: 2048, temperature: 0.3 }
    );

    if (!result?.schools?.length) return await seedSchoolData();

    const db = await ensureEducationSchema();
    let added = 0;

    for (const school of result.schools) {
        const slug = school.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        // Check for duplicates
        const existing = await db.execute({
            sql: `SELECT id FROM music_school_leads WHERE school_name = ? OR slug = ?`,
            args: [school.name, slug],
        });
        if (existing.rows.length > 0) continue;

        await db.execute({
            sql: `INSERT INTO music_school_leads (id, school_name, tier, contact_name, contact_email, contact_role, student_count, location, website, slug, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospected')`,
            args: [uuid(), school.name, school.tier || 'university', school.contact_name || '', school.contact_email || '',
            school.contact_role || '', school.student_count || 0, school.location || '', school.website || '', slug],
        });
        added++;
    }

    return added;
}

async function seedSchoolData(): Promise<number> {
    const db = await ensureEducationSchema();
    const seeds = [
        { name: 'Berklee College of Music', tier: 'conservatory', location: 'Boston, MA', students: 6500 },
        { name: 'Musicians Institute', tier: 'conservatory', location: 'Hollywood, CA', students: 1200 },
        { name: 'Belmont University — College of Music', tier: 'university', location: 'Nashville, TN', students: 1800 },
        { name: 'Frost School of Music — University of Miami', tier: 'university', location: 'Miami, FL', students: 900 },
        { name: 'USC Thornton School of Music', tier: 'university', location: 'Los Angeles, CA', students: 1100 },
        { name: 'UNT College of Music', tier: 'university', location: 'Denton, TX', students: 1600 },
        { name: 'Oberlin Conservatory of Music', tier: 'conservatory', location: 'Oberlin, OH', students: 580 },
        { name: 'Manhattan School of Music', tier: 'conservatory', location: 'New York, NY', students: 960 },
        { name: 'Indiana University — Jacobs School', tier: 'university', location: 'Bloomington, IN', students: 1700 },
        { name: 'University of North Texas — Jazz Studies', tier: 'university', location: 'Denton, TX', students: 800 },
    ];

    let added = 0;
    for (const s of seeds) {
        const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const existing = await db.execute({ sql: `SELECT id FROM music_school_leads WHERE slug = ?`, args: [slug] });
        if (existing.rows.length > 0) continue;
        await db.execute({
            sql: `INSERT INTO music_school_leads (id, school_name, tier, student_count, location, slug, status)
                  VALUES (?, ?, ?, ?, ?, ?, 'prospected')`,
            args: [uuid(), s.name, s.tier, s.students, s.location, slug],
        });
        added++;
    }
    return added;
}

// ---- Email Sequence Generation ----

async function generateOutreachEmails(school: SchoolLead): Promise<{ subject: string; body: string } | null> {
    const { aiJSON } = await import('@/lib/ai');
    const step = school.outreach_step + 1;
    if (step > 4) return null;

    const stepInstructions: Record<number, string> = {
        1: 'Write an introduction email offering free semester access to GigLift for music students. Mention AI-powered lead discovery for gigs, teaching jobs, and session work. Keep it warm and genuine.',
        2: 'Write a follow-up with a compelling case study angle — mention how a student at a similar school booked 8 paid gigs in 2 weeks using the platform.',
        3: 'Offer a free 20-minute virtual guest lecture called "AI Tools for the Working Musician" — no sales pitch, just career value.',
        4: 'Final gentle nudge — mention that held semester access codes will be released to other programs at month end. Include urgency without being pushy.',
    };

    const result = await aiJSON<{ subject: string; body: string }>(
        'You are writing outreach emails from Blake Thornley, founder of GigLift, to music school faculty. Write natural, warm, professional emails. Not salesy.',
        `Write email step ${step} of 4 for ${school.school_name} (${school.tier} in ${school.location}).
Contact: ${school.contact_name || 'Department Chair'} (${school.contact_role || 'Music Department'})
Estimated students: ${school.student_count || 'unknown'}

Instructions: ${stepInstructions[step]}

School signup URL: https://giglift.com/join/${school.slug}

Return JSON: { "subject": "...", "body": "..." }
Sign off as Blake Thornley, Founder, GigLift`,
        { maxTokens: 1024, temperature: 0.7 }
    );

    return result;
}

// ---- Pipeline Management ----

async function advanceOutreachPipeline(): Promise<{ contacted: number; advanced: number }> {
    const db = await ensureEducationSchema();

    // Find schools ready for next outreach step
    const schools = await db.execute({
        sql: `SELECT * FROM music_school_leads
              WHERE status IN ('prospected', 'contacted')
              AND outreach_step < 4
              AND (last_contacted IS NULL OR last_contacted < datetime('now', '-4 days'))
              ORDER BY CASE tier WHEN 'conservatory' THEN 1 WHEN 'university' THEN 2 ELSE 3 END
              LIMIT 5`,
        args: [],
    });

    let contacted = 0;
    let advanced = 0;

    for (const row of schools.rows) {
        const school: SchoolLead = {
            id: String(row.id), school_name: String(row.school_name), tier: String(row.tier),
            contact_name: String(row.contact_name), contact_email: String(row.contact_email),
            contact_role: String(row.contact_role), department: String(row.department),
            student_count: Number(row.student_count), location: String(row.location),
            website: String(row.website), status: String(row.status),
            outreach_step: Number(row.outreach_step), last_contacted: row.last_contacted ? String(row.last_contacted) : null,
            slug: String(row.slug), signups: Number(row.signups), created_at: String(row.created_at),
        };

        const email = await generateOutreachEmails(school);
        if (!email) continue;

        // Log the outreach
        await db.execute({
            sql: `INSERT INTO school_outreach_log (id, school_id, step, subject, body, status)
                  VALUES (?, ?, ?, ?, ?, 'drafted')`,
            args: [uuid(), school.id, school.outreach_step + 1, email.subject, email.body],
        });

        // Advance the school
        await db.execute({
            sql: `UPDATE music_school_leads
                  SET outreach_step = outreach_step + 1,
                      status = CASE WHEN status = 'prospected' THEN 'contacted' ELSE status END,
                      last_contacted = datetime('now')
                  WHERE id = ?`,
            args: [school.id],
        });

        contacted++;
        advanced++;
    }

    return { contacted, advanced };
}

// ---- Data Retrieval for Admin UI ----

export async function getSchoolPipeline(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byTier: Record<string, number>;
    schools: SchoolLead[];
    recentOutreach: OutreachLog[];
}> {
    const db = await ensureEducationSchema();

    const allSchools = await db.execute({ sql: `SELECT * FROM music_school_leads ORDER BY created_at DESC LIMIT 50`, args: [] });

    const schools: SchoolLead[] = allSchools.rows.map(row => ({
        id: String(row.id), school_name: String(row.school_name), tier: String(row.tier),
        contact_name: String(row.contact_name), contact_email: String(row.contact_email),
        contact_role: String(row.contact_role), department: String(row.department),
        student_count: Number(row.student_count), location: String(row.location),
        website: String(row.website), status: String(row.status),
        outreach_step: Number(row.outreach_step), last_contacted: row.last_contacted ? String(row.last_contacted) : null,
        slug: String(row.slug), signups: Number(row.signups), created_at: String(row.created_at),
    }));

    const byStatus: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    for (const s of schools) {
        byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        byTier[s.tier] = (byTier[s.tier] || 0) + 1;
    }

    const outreach = await db.execute({
        sql: `SELECT * FROM school_outreach_log ORDER BY sent_at DESC LIMIT 10`,
        args: [],
    });
    const recentOutreach: OutreachLog[] = outreach.rows.map(row => ({
        id: String(row.id), school_id: String(row.school_id), step: Number(row.step),
        subject: String(row.subject), body: String(row.body), status: String(row.status),
        sent_at: String(row.sent_at),
    }));

    return { total: schools.length, byStatus, byTier, schools, recentOutreach };
}

// ---- Main Agent Entrypoint ----

export async function runEducationOutreachAgent(): Promise<{
    newSchools: number;
    outreach: { contacted: number; advanced: number };
    pipeline: { total: number; byStatus: Record<string, number>; byTier: Record<string, number> };
}> {
    console.log('[education-outreach] Starting music school blitz...');

    // 1. Discover new music schools
    let newSchools = 0;
    try {
        newSchools = await discoverMusicSchools();
        console.log(`[education-outreach] Discovered ${newSchools} new schools`);
    } catch (err) {
        console.error('[education-outreach] Discovery failed:', err);
    }

    // 2. Advance outreach pipeline
    let outreach = { contacted: 0, advanced: 0 };
    try {
        outreach = await advanceOutreachPipeline();
        console.log(`[education-outreach] Contacted ${outreach.contacted}, advanced ${outreach.advanced}`);
    } catch (err) {
        console.error('[education-outreach] Outreach failed:', err);
    }

    // 3. Get pipeline summary
    const pipelineData = await getSchoolPipeline();

    console.log(`[education-outreach] Pipeline: ${pipelineData.total} schools, ${JSON.stringify(pipelineData.byStatus)}`);

    return {
        newSchools,
        outreach,
        pipeline: { total: pipelineData.total, byStatus: pipelineData.byStatus, byTier: pipelineData.byTier },
    };
}
