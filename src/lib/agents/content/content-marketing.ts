import { createClient, Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';
import { getRecentSnapshots, DailyMetrics } from '@/lib/agents/analytics/analytics-agent';

// ============================================================
// Content Marketing Agent — Blog, Social Threads & Topic Scanning
// Generates SEO content and social posts to build authority.
// ============================================================

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
async function ensureContentSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS content_queue (
                id TEXT PRIMARY KEY,
                content_type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                platform TEXT DEFAULT 'blog',
                status TEXT DEFAULT 'draft',
                seo_keywords TEXT DEFAULT '',
                scheduled_for TEXT DEFAULT '',
                published_at TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS trending_topics (
                id TEXT PRIMARY KEY,
                topic TEXT NOT NULL,
                source TEXT DEFAULT '',
                relevance_score INTEGER DEFAULT 0,
                used INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export interface ContentPiece {
    id: string;
    content_type: 'blog' | 'twitter_thread' | 'linkedin_post' | 'case_study';
    title: string;
    body: string;
    platform: string;
    status: string;
    seo_keywords: string;
}

// ---- Topic Scanner ----

const EVERGREEN_TOPICS = [
    { topic: 'How to find gigs as an independent musician', keywords: 'find gigs, independent musician, booking' },
    { topic: 'AI tools for musicians in 2026', keywords: 'AI music tools, musician AI, automation' },
    { topic: 'How to build an Electronic Press Kit (EPK)', keywords: 'EPK, press kit, musician branding' },
    { topic: 'Music instructor lead generation strategies', keywords: 'music lessons, lead generation, students' },
    { topic: 'How to price yourself as a DJ or musician', keywords: 'DJ pricing, musician rates, gig pricing' },
    { topic: 'The rise of AI agents in the creator economy', keywords: 'AI agents, creator economy, automation' },
    { topic: 'Studio musician: how to find session work', keywords: 'session musician, studio work, recording' },
    { topic: 'Touring musician guide to booking venues', keywords: 'touring, venue booking, tour planning' },
    { topic: 'Why musicians need a CRM', keywords: 'musician CRM, lead tracking, booking management' },
    { topic: 'Social media strategy for musicians', keywords: 'musician social media, content calendar, Instagram' },
    { topic: 'How to get more private music students', keywords: 'music students, teaching, private lessons' },
    { topic: 'Building a sustainable music career with AI', keywords: 'sustainable music career, AI tools, automation' },
];

export async function scanForTopics(): Promise<number> {
    const db = await ensureContentSchema();

    // Check which evergreen topics haven't been used yet
    let added = 0;
    for (const topic of EVERGREEN_TOPICS) {
        const exists = await db.execute({
            sql: `SELECT id FROM trending_topics WHERE topic = ?`,
            args: [topic.topic],
        });

        if (exists.rows.length === 0) {
            await db.execute({
                sql: `INSERT INTO trending_topics (id, topic, source, relevance_score) VALUES (?, ?, 'evergreen', 80)`,
                args: [uuid(), topic.topic],
            });
            added++;
        }
    }

    return added;
}

export async function getUnusedTopics(limit: number = 3): Promise<Array<{ id: string; topic: string; relevance_score: number }>> {
    const db = await ensureContentSchema();
    const result = await db.execute({
        sql: `SELECT id, topic, relevance_score FROM trending_topics WHERE used = 0 ORDER BY relevance_score DESC LIMIT ?`,
        args: [limit],
    });
    return result.rows.map(row => ({
        id: String(row.id),
        topic: String(row.topic),
        relevance_score: Number(row.relevance_score),
    }));
}

// ---- Blog Post Generator ----

export function generateBlogPost(topic: string, metrics?: DailyMetrics): ContentPiece {
    const matchingTopic = EVERGREEN_TOPICS.find(t => t.topic === topic);
    const keywords = matchingTopic?.keywords || '';

    // Build a structured blog post outline
    const body = [
        `# ${topic}`,
        ``,
        `*Published by GigLift — AI-powered lead generation for musicians*`,
        ``,
        `## Introduction`,
        ``,
        `The music industry is evolving fast. Whether you're a performer, instructor, studio musician, or touring artist, finding consistent work remains the biggest challenge.`,
        ``,
        topic.toLowerCase().includes('ai') ? [
            `## The AI Revolution in Music`,
            ``,
            `AI agents are changing how musicians find opportunities. Instead of manually searching job boards and social media, autonomous AI can:`,
            `- Discover venues, schools, and studios actively looking for talent`,
            `- Score and rank opportunities by fit and budget potential`,
            `- Draft personalized outreach that converts`,
            `- Build professional press kits and manage social presence`,
        ].join('\n') : [
            `## The Challenge`,
            ``,
            `Most musicians spend 60-70% of their non-performing time on business tasks:`,
            `- Searching for gig opportunities`,
            `- Cold-emailing venues and bookers`,
            `- Managing their online presence`,
            `- Following up on leads`,
        ].join('\n'),
        ``,
        `## How GigLift Solves This`,
        ``,
        `GigLift deploys 5 AI agents that work autonomously:`,
        `1. **Lead Scout** — Discovers opportunities across 10+ web sources`,
        `2. **Lead Scorer** — Ranks leads 0-100 based on fit and budget signals`,
        `3. **Outreach Writer** — Drafts personalized booking emails`,
        `4. **EPK Architect** — Builds professional electronic press kits`,
        `5. **Social Hype** — Plans and writes social content`,
        ``,
        metrics ? [
            `## By the Numbers`,
            ``,
            `- ${metrics.totalUsers.toLocaleString()} musicians using GigLift`,
            `- ${metrics.totalLeads.toLocaleString()} leads discovered`,
            `- 4 modes: Performer, Instructor, Studio, Touring`,
        ].join('\n') : '',
        ``,
        `## Getting Started`,
        ``,
        `Sign up free at [giglift.app](https://giglift.app) and deploy your AI agents in under 2 minutes.`,
        ``,
        `---`,
        `*Keywords: ${keywords}*`,
    ].filter(Boolean).join('\n');

    return {
        id: uuid(),
        content_type: 'blog',
        title: topic,
        body,
        platform: 'blog',
        status: 'draft',
        seo_keywords: keywords,
    };
}

// ---- Social Thread Generator ----

export function generateTwitterThread(topic: string, metrics?: DailyMetrics): ContentPiece {
    const tweets = [
        `🧵 ${topic}\n\nA thread 👇`,
        `Most musicians spend 60-70% of their non-stage time on business tasks.\n\nSearching for gigs. Cold-emailing venues. Managing social media.\n\nWhat if AI could do all of that while you sleep?`,
        `We built GigLift — a crew of 5 AI agents that work 24/7 for musicians:\n\n🔍 Lead Scout — finds gigs\n📊 Lead Scorer — ranks by fit\n✍️ Outreach Writer — drafts emails\n🎨 EPK Architect — builds press kits\n📱 Social Hype — plans content`,
        `It works across 4 modes:\n\n🎵 Performer — venues, bars, festivals\n📚 Instructor — schools, programs\n🎙️ Studio — session work, producers\n🚐 Touring — tour routes, venues`,
        metrics
            ? `The numbers so far:\n\n👥 ${metrics.totalUsers.toLocaleString()} musicians\n📋 ${metrics.totalLeads.toLocaleString()} leads found\n🔎 ${metrics.totalScansThisMonth} scans this month\n💰 Free tier available`
            : `Join hundreds of musicians already using AI to find their next opportunity.\n\nFree tier available — deploy your agents in 2 minutes.`,
        `Try it free → giglift.app\n\nYour AI agents are waiting. 🤖`,
    ];

    return {
        id: uuid(),
        content_type: 'twitter_thread',
        title: `Thread: ${topic}`,
        body: tweets.map((t, i) => `[${i + 1}/${tweets.length}]\n${t}`).join('\n\n---\n\n'),
        platform: 'twitter',
        status: 'draft',
        seo_keywords: '',
    };
}

export function generateLinkedInPost(topic: string, metrics?: DailyMetrics): ContentPiece {
    const post = [
        `${topic}`,
        ``,
        `I've been building GigLift — an AI agent platform for musicians — and here's what I've learned:`,
        ``,
        `The #1 struggle for independent musicians isn't talent. It's finding consistent work.`,
        ``,
        `So we built 5 autonomous AI agents that handle the entire hustle:`,
        `→ Discover venues, schools, studios actively seeking talent`,
        `→ Score every lead on fit, budget, and booking potential`,
        `→ Draft personalized outreach emails`,
        `→ Build professional press kits`,
        `→ Plan weekly social content`,
        ``,
        metrics ? `📊 ${metrics.totalUsers.toLocaleString()} musicians deployed their agents so far.` : '',
        ``,
        `The future of the creator economy is AI agents handling the business side so creators can focus on creating.`,
        ``,
        `If you're a musician (or know one), check it out: giglift.app`,
        ``,
        `#MusicTech #AI #CreatorEconomy #Startups #Musicians`,
    ].filter(Boolean).join('\n');

    return {
        id: uuid(),
        content_type: 'linkedin_post',
        title: `LinkedIn: ${topic}`,
        body: post,
        platform: 'linkedin',
        status: 'draft',
        seo_keywords: '',
    };
}

// ---- Content Queue Management ----

export async function saveContent(piece: ContentPiece): Promise<void> {
    const db = await ensureContentSchema();
    await db.execute({
        sql: `INSERT INTO content_queue (id, content_type, title, body, platform, status, seo_keywords)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [piece.id, piece.content_type, piece.title, piece.body, piece.platform, piece.status, piece.seo_keywords],
    });
}

export async function getContentQueue(status?: string): Promise<ContentPiece[]> {
    const db = await ensureContentSchema();
    let sql = 'SELECT * FROM content_queue ORDER BY created_at DESC LIMIT 20';
    const args: string[] = [];

    if (status) {
        sql = 'SELECT * FROM content_queue WHERE status = ? ORDER BY created_at DESC LIMIT 20';
        args.push(status);
    }

    const result = await db.execute({ sql, args });
    return result.rows.map(row => ({
        id: String(row.id),
        content_type: String(row.content_type) as ContentPiece['content_type'],
        title: String(row.title),
        body: String(row.body),
        platform: String(row.platform),
        status: String(row.status),
        seo_keywords: String(row.seo_keywords),
    }));
}

// ---- Main Agent Entrypoint ----

export async function runContentMarketingAgent(): Promise<{
    topics_added: number;
    content_generated: { blog: number; twitter: number; linkedin: number };
    queue_size: number;
}> {
    console.log('[content-marketing] Starting content generation run...');

    // 1. Scan for new topics
    const topicsAdded = await scanForTopics();
    console.log(`[content-marketing] Added ${topicsAdded} new topics`);

    // 2. Pick unused topics and generate content
    const topics = await getUnusedTopics(1); // 1 topic per run
    const snapshots = await getRecentSnapshots(1);
    const metrics = snapshots[0];

    let blogCount = 0, twitterCount = 0, linkedinCount = 0;

    for (const { id, topic } of topics) {
        // Generate blog post
        const blog = generateBlogPost(topic, metrics);
        await saveContent(blog);
        blogCount++;

        // Generate Twitter thread
        const thread = generateTwitterThread(topic, metrics);
        await saveContent(thread);
        twitterCount++;

        // Generate LinkedIn post
        const linkedin = generateLinkedInPost(topic, metrics);
        await saveContent(linkedin);
        linkedinCount++;

        // Mark topic as used
        const db = await ensureContentSchema();
        await db.execute({
            sql: `UPDATE trending_topics SET used = 1 WHERE id = ?`,
            args: [id],
        });
    }

    const queue = await getContentQueue('draft');

    console.log(`[content-marketing] Generated: ${blogCount} blog, ${twitterCount} threads, ${linkedinCount} LinkedIn`);

    return {
        topics_added: topicsAdded,
        content_generated: { blog: blogCount, twitter: twitterCount, linkedin: linkedinCount },
        queue_size: queue.length,
    };
}
