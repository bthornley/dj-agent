import { createClient, Client } from '@libsql/client';
import { randomUUID as uuid } from 'crypto';

// ============================================================
// Community Agent — Feedback, Power Users & Engagement
// Surfaces insights from user activity and manages community health.
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
async function ensureCommunitySchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS community_feedback (
                id TEXT PRIMARY KEY,
                user_id TEXT DEFAULT '',
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'open',
                source TEXT DEFAULT 'auto',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS power_users (
                user_id TEXT PRIMARY KEY,
                score INTEGER DEFAULT 0,
                lead_count INTEGER DEFAULT 0,
                scan_count INTEGER DEFAULT 0,
                features_used INTEGER DEFAULT 0,
                ambassador_candidate INTEGER DEFAULT 0,
                contacted INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS engagement_campaigns (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                target_segment TEXT DEFAULT 'all',
                status TEXT DEFAULT 'planned',
                start_date TEXT DEFAULT '',
                end_date TEXT DEFAULT '',
                metrics TEXT DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export interface FeedbackItem {
    id: string;
    user_id: string;
    type: 'feature_request' | 'bug_report' | 'improvement' | 'praise';
    title: string;
    description: string;
    priority: string;
    status: string;
}

export interface PowerUser {
    user_id: string;
    score: number;
    lead_count: number;
    scan_count: number;
    features_used: number;
    ambassador_candidate: boolean;
}

export interface CommunityReport {
    total_feedback: number;
    open_feedback: number;
    power_users_found: number;
    ambassador_candidates: number;
    active_campaigns: number;
    engagement_insights: string[];
}

// ---- Feedback Collector ----

export async function collectFeedbackFromUsage(): Promise<FeedbackItem[]> {
    const db = await ensureCommunitySchema();
    const feedback: FeedbackItem[] = [];

    // Detect patterns that suggest feature needs

    // Users with many scans but few leads → lead quality issue
    const qualityIssue = await db.execute({
        sql: `SELECT sq.quota_key, sq.count as scans
              FROM search_quota sq
              WHERE sq.count > 5`,
        args: [],
    });

    for (const row of qualityIssue.rows) {
        const userId = String(row.quota_key).split(':')[0];
        if (!userId) continue;

        const leads = await db.execute({
            sql: `SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND lead_score >= 50`,
            args: [userId],
        });
        const highQualityLeads = Number(leads.rows[0]?.c ?? 0);
        const scans = Number(row.scans);

        // High scan count but low quality leads → potential issue
        if (scans > 10 && highQualityLeads < 3) {
            const exists = await db.execute({
                sql: `SELECT id FROM community_feedback WHERE user_id = ? AND type = 'improvement' AND title LIKE '%lead quality%' AND created_at > datetime('now', '-7 days')`,
                args: [userId],
            });
            if (exists.rows.length === 0) {
                const item: FeedbackItem = {
                    id: uuid(),
                    user_id: userId,
                    type: 'improvement',
                    title: 'Low lead quality detected',
                    description: `User has ${scans} scans but only ${highQualityLeads} leads scoring 50+. May need better seed configuration or source tuning.`,
                    priority: 'medium',
                    status: 'open',
                };
                await db.execute({
                    sql: `INSERT INTO community_feedback (id, user_id, type, title, description, priority, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'auto')`,
                    args: [item.id, item.user_id, item.type, item.title, item.description, item.priority, item.status],
                });
                feedback.push(item);
            }
        }
    }

    // Users with EPK but no social posts → feature gap
    const epkNoSocial = await db.execute({
        sql: `SELECT e.user_id
              FROM epk_configs e
              LEFT JOIN social_posts sp ON e.user_id = sp.user_id
              WHERE sp.id IS NULL`,
        args: [],
    });

    for (const row of epkNoSocial.rows) {
        const userId = String(row.user_id);
        const exists = await db.execute({
            sql: `SELECT id FROM community_feedback WHERE user_id = ? AND title LIKE '%social content%' AND created_at > datetime('now', '-14 days')`,
            args: [userId],
        });
        if (exists.rows.length === 0) {
            const item: FeedbackItem = {
                id: uuid(),
                user_id: userId,
                type: 'feature_request',
                title: 'EPK user not using social content features',
                description: `User built an EPK but hasn't used the Social Hype agent. May benefit from a nudge about content planning.`,
                priority: 'low',
                status: 'open',
            };
            await db.execute({
                sql: `INSERT INTO community_feedback (id, user_id, type, title, description, priority, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'auto')`,
                args: [item.id, item.user_id, item.type, item.title, item.description, item.priority, item.status],
            });
            feedback.push(item);
        }
    }

    return feedback;
}

// ---- Power User Finder ----

export async function findPowerUsers(): Promise<PowerUser[]> {
    const db = await ensureCommunitySchema();

    // Score users based on activity depth
    const users = await db.execute({
        sql: `SELECT
                l.user_id,
                COUNT(DISTINCT l.lead_id) as lead_count,
                (SELECT COALESCE(SUM(sq.count), 0) FROM search_quota sq WHERE sq.quota_key LIKE l.user_id || ':%') as scan_count,
                (SELECT COUNT(*) FROM query_seeds qs WHERE qs.user_id = l.user_id) as seed_count,
                (SELECT COUNT(*) FROM epk_configs e WHERE e.user_id = l.user_id) as has_epk,
                (SELECT COUNT(*) FROM social_posts sp WHERE sp.user_id = l.user_id) as social_count,
                (SELECT COUNT(*) FROM brand_profiles bp WHERE bp.user_id = l.user_id) as has_brand
              FROM leads l
              GROUP BY l.user_id
              HAVING lead_count >= 5`,
        args: [],
    });

    const powerUsers: PowerUser[] = [];

    for (const row of users.rows) {
        const userId = String(row.user_id);
        const leadCount = Number(row.lead_count);
        const scanCount = Number(row.scan_count);
        const seedCount = Number(row.seed_count);
        const hasEpk = Number(row.has_epk) > 0;
        const socialCount = Number(row.social_count);
        const hasBrand = Number(row.has_brand) > 0;

        // Count features used
        let featuresUsed = 0;
        if (seedCount > 0) featuresUsed++;
        if (leadCount > 0) featuresUsed++;
        if (hasEpk) featuresUsed++;
        if (socialCount > 0) featuresUsed++;
        if (hasBrand) featuresUsed++;

        // Power user score
        const score = Math.min(100,
            (leadCount * 2) +
            (scanCount * 3) +
            (featuresUsed * 10) +
            (socialCount * 2)
        );

        // Ambassador candidate: high score + multiple features
        const ambassadorCandidate = score >= 50 && featuresUsed >= 3;

        // Upsert
        await db.execute({
            sql: `INSERT INTO power_users (user_id, score, lead_count, scan_count, features_used, ambassador_candidate, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                  ON CONFLICT(user_id) DO UPDATE SET
                    score = ?, lead_count = ?, scan_count = ?, features_used = ?, ambassador_candidate = ?, updated_at = datetime('now')`,
            args: [userId, score, leadCount, scanCount, featuresUsed, ambassadorCandidate ? 1 : 0,
                score, leadCount, scanCount, featuresUsed, ambassadorCandidate ? 1 : 0],
        });

        if (score >= 30) {
            powerUsers.push({
                user_id: userId,
                score,
                lead_count: leadCount,
                scan_count: scanCount,
                features_used: featuresUsed,
                ambassador_candidate: ambassadorCandidate,
            });
        }
    }

    return powerUsers.sort((a, b) => b.score - a.score);
}

// ---- Engagement Insights ----

export async function generateEngagementInsights(): Promise<string[]> {
    const db = await ensureCommunitySchema();
    const insights: string[] = [];

    // Most popular mode
    const modeResult = await db.execute({
        sql: `SELECT mode, COUNT(*) as c FROM leads GROUP BY mode ORDER BY c DESC LIMIT 1`,
        args: [],
    });
    if (modeResult.rows.length > 0) {
        insights.push(`🎯 Most popular mode: ${modeResult.rows[0].mode} (${modeResult.rows[0].c} leads)`);
    }

    // Average lead score
    const scoreResult = await db.execute({
        sql: `SELECT AVG(lead_score) as avg, MAX(lead_score) as max FROM leads WHERE lead_score > 0`,
        args: [],
    });
    if (scoreResult.rows.length > 0) {
        insights.push(`📊 Avg lead score: ${Math.round(Number(scoreResult.rows[0].avg))}/100 (best: ${scoreResult.rows[0].max})`);
    }

    // Feature adoption
    const epkCount = await db.execute({ sql: `SELECT COUNT(*) as c FROM epk_configs`, args: [] });
    const socialCount = await db.execute({ sql: `SELECT COUNT(DISTINCT user_id) as c FROM social_posts`, args: [] });
    const seedCount = await db.execute({ sql: `SELECT COUNT(DISTINCT user_id) as c FROM query_seeds`, args: [] });

    insights.push(`🎨 EPK adoption: ${epkCount.rows[0]?.c} users`);
    insights.push(`📱 Social Hype adoption: ${socialCount.rows[0]?.c} users`);
    insights.push(`🌱 Seeds configured: ${seedCount.rows[0]?.c} users`);

    // Power users
    const powerCount = await db.execute({
        sql: `SELECT COUNT(*) as c FROM power_users WHERE score >= 50`,
        args: [],
    });
    insights.push(`⭐ Power users (score 50+): ${powerCount.rows[0]?.c}`);

    return insights;
}

// ---- Main Agent Entrypoint ----

export async function runCommunityAgent(): Promise<CommunityReport> {
    console.log('[community] Starting community analysis...');

    // 1. Collect feedback from usage patterns
    const newFeedback = await collectFeedbackFromUsage();
    console.log(`[community] Collected ${newFeedback.length} new feedback items`);

    // 2. Find power users
    const powerUsers = await findPowerUsers();
    const ambassadorCandidates = powerUsers.filter(u => u.ambassador_candidate);
    console.log(`[community] Found ${powerUsers.length} power users, ${ambassadorCandidates.length} ambassador candidates`);

    // 3. Generate engagement insights
    const insights = await generateEngagementInsights();

    // 4. Count open feedback
    const db = await ensureCommunitySchema();
    const openFeedback = await db.execute({
        sql: `SELECT COUNT(*) as c FROM community_feedback WHERE status = 'open'`,
        args: [],
    });

    // 5. Count active campaigns
    const activeCampaigns = await db.execute({
        sql: `SELECT COUNT(*) as c FROM engagement_campaigns WHERE status = 'active'`,
        args: [],
    });

    return {
        total_feedback: newFeedback.length,
        open_feedback: Number(openFeedback.rows[0]?.c ?? 0),
        power_users_found: powerUsers.length,
        ambassador_candidates: ambassadorCandidates.length,
        active_campaigns: Number(activeCampaigns.rows[0]?.c ?? 0),
        engagement_insights: insights,
    };
}
