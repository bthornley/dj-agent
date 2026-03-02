import { createClient, Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';
import { getPlanById, PlanId } from '@/lib/stripe';

// ============================================================
// Customer Success Agent — Health Scoring, Churn Prevention & Upgrades
// Proactively monitors user health and drives retention + expansion.
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
async function ensureCSSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS user_health (
                user_id TEXT PRIMARY KEY,
                health_score INTEGER DEFAULT 50,
                risk_level TEXT DEFAULT 'healthy',
                lead_count INTEGER DEFAULT 0,
                scan_count INTEGER DEFAULT 0,
                seed_count INTEGER DEFAULT 0,
                has_epk INTEGER DEFAULT 0,
                has_social INTEGER DEFAULT 0,
                plan_id TEXT DEFAULT 'free',
                last_activity TEXT DEFAULT '',
                milestones_hit TEXT DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS cs_events (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                message TEXT DEFAULT '',
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export type RiskLevel = 'healthy' | 'at_risk' | 'churning';

export interface UserHealth {
    user_id: string;
    health_score: number;
    risk_level: RiskLevel;
    lead_count: number;
    scan_count: number;
    seed_count: number;
    has_epk: boolean;
    has_social: boolean;
    plan_id: string;
    milestones_hit: string[];
}

export interface CSReport {
    total_users_tracked: number;
    healthy: number;
    at_risk: number;
    churning: number;
    upgrade_candidates: number;
    new_milestones: number;
    avg_health_score: number;
}

// ---- Health Scorer ----

// Health = (0.3 × activity_recency) + (0.25 × scan_usage) +
//          (0.2 × leads_generated) + (0.15 × features_adopted) +
//          (0.1 × account_age_factor)

export function computeHealthScore(data: {
    lead_count: number;
    scan_count: number;
    seed_count: number;
    has_epk: boolean;
    has_social: boolean;
    days_since_last_activity: number;
    days_since_signup: number;
}): { score: number; risk: RiskLevel } {
    // Activity recency (30 pts max) — more recent = higher
    const recencyScore = data.days_since_last_activity <= 1 ? 30
        : data.days_since_last_activity <= 3 ? 25
            : data.days_since_last_activity <= 7 ? 18
                : data.days_since_last_activity <= 14 ? 10
                    : data.days_since_last_activity <= 30 ? 5
                        : 0;

    // Scan usage (25 pts max)
    const scanScore = Math.min(25, data.scan_count * 2.5);

    // Leads generated (20 pts max)
    const leadScore = Math.min(20, data.lead_count * 1);

    // Feature adoption (15 pts max)
    let featureScore = 0;
    if (data.seed_count > 0) featureScore += 5;
    if (data.has_epk) featureScore += 5;
    if (data.has_social) featureScore += 5;

    // Account age factor (10 pts max) — newer accounts get a grace period
    const ageScore = data.days_since_signup <= 7 ? 10
        : data.days_since_signup <= 30 ? 7
            : 5;

    const score = Math.round(recencyScore + scanScore + leadScore + featureScore + ageScore);

    const risk: RiskLevel = score >= 60 ? 'healthy'
        : score >= 30 ? 'at_risk'
            : 'churning';

    return { score: Math.min(100, score), risk };
}

// ---- User Health Evaluation ----

export async function evaluateAllUsers(): Promise<UserHealth[]> {
    const db = await ensureCSSchema();

    // Get all distinct users with their activity data
    const users = await db.execute({
        sql: `SELECT
                user_id,
                COUNT(*) as lead_count,
                MAX(created_at) as last_lead_at,
                MIN(created_at) as first_lead_at
              FROM leads
              GROUP BY user_id`,
        args: [],
    });

    const results: UserHealth[] = [];

    for (const row of users.rows) {
        const userId = String(row.user_id);
        if (!userId) continue;

        const leadCount = Number(row.lead_count ?? 0);

        // Get scan count for this month
        const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const scans = await db.execute({
            sql: `SELECT count FROM search_quota WHERE quota_key = ?`,
            args: [`${userId}:${monthKey}`],
        });
        const scanCount = Number(scans.rows[0]?.count ?? 0);

        // Get seed count
        const seeds = await db.execute({
            sql: `SELECT COUNT(*) as c FROM query_seeds WHERE user_id = ?`,
            args: [userId],
        });
        const seedCount = Number(seeds.rows[0]?.c ?? 0);

        // Check EPK
        const epk = await db.execute({
            sql: `SELECT COUNT(*) as c FROM epk_configs WHERE user_id = ?`,
            args: [userId],
        });
        const hasEpk = Number(epk.rows[0]?.c ?? 0) > 0;

        // Check social posts
        const social = await db.execute({
            sql: `SELECT COUNT(*) as c FROM social_posts WHERE user_id = ?`,
            args: [userId],
        });
        const hasSocial = Number(social.rows[0]?.c ?? 0) > 0;

        // Compute timing
        const lastActivity = String(row.last_lead_at || '');
        const firstActivity = String(row.first_lead_at || '');
        const now = Date.now();
        const daysSinceLastActivity = lastActivity
            ? Math.floor((now - new Date(lastActivity).getTime()) / 86400000)
            : 999;
        const daysSinceSignup = firstActivity
            ? Math.floor((now - new Date(firstActivity).getTime()) / 86400000)
            : 0;

        const { score, risk } = computeHealthScore({
            lead_count: leadCount,
            scan_count: scanCount,
            seed_count: seedCount,
            has_epk: hasEpk,
            has_social: hasSocial,
            days_since_last_activity: daysSinceLastActivity,
            days_since_signup: daysSinceSignup,
        });

        // Get existing milestones
        const existing = await db.execute({
            sql: `SELECT milestones_hit FROM user_health WHERE user_id = ?`,
            args: [userId],
        });
        const existingMilestones: string[] = existing.rows.length > 0
            ? JSON.parse(String(existing.rows[0].milestones_hit || '[]'))
            : [];

        // Check for new milestones
        const newMilestones: string[] = [...existingMilestones];
        if (leadCount >= 1 && !newMilestones.includes('first_lead')) newMilestones.push('first_lead');
        if (leadCount >= 10 && !newMilestones.includes('10_leads')) newMilestones.push('10_leads');
        if (leadCount >= 50 && !newMilestones.includes('50_leads')) newMilestones.push('50_leads');
        if (leadCount >= 100 && !newMilestones.includes('100_leads')) newMilestones.push('100_leads');
        if (scanCount >= 10 && !newMilestones.includes('10_scans')) newMilestones.push('10_scans');
        if (hasEpk && !newMilestones.includes('epk_built')) newMilestones.push('epk_built');
        if (hasSocial && !newMilestones.includes('social_started')) newMilestones.push('social_started');

        // Log new milestones
        const brandNewMilestones = newMilestones.filter(m => !existingMilestones.includes(m));
        for (const milestone of brandNewMilestones) {
            await db.execute({
                sql: `INSERT INTO cs_events (id, user_id, event_type, message) VALUES (?, ?, 'milestone', ?)`,
                args: [uuid(), userId, `🎉 Milestone: ${milestone}`],
            });
        }

        // Upsert health record
        await db.execute({
            sql: `INSERT INTO user_health (user_id, health_score, risk_level, lead_count, scan_count, seed_count, has_epk, has_social, milestones_hit, last_activity, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                  ON CONFLICT(user_id) DO UPDATE SET
                    health_score = ?, risk_level = ?, lead_count = ?, scan_count = ?, seed_count = ?,
                    has_epk = ?, has_social = ?, milestones_hit = ?, last_activity = ?, updated_at = datetime('now')`,
            args: [
                userId, score, risk, leadCount, scanCount, seedCount, hasEpk ? 1 : 0, hasSocial ? 1 : 0,
                JSON.stringify(newMilestones), lastActivity,
                score, risk, leadCount, scanCount, seedCount, hasEpk ? 1 : 0, hasSocial ? 1 : 0,
                JSON.stringify(newMilestones), lastActivity,
            ],
        });

        results.push({
            user_id: userId,
            health_score: score,
            risk_level: risk,
            lead_count: leadCount,
            scan_count: scanCount,
            seed_count: seedCount,
            has_epk: hasEpk,
            has_social: hasSocial,
            plan_id: 'free',
            milestones_hit: newMilestones,
        });
    }

    return results;
}

// ---- Upgrade Candidates ----

export async function findUpgradeCandidates(): Promise<Array<{ user_id: string; reason: string }>> {
    const db = await ensureCSSchema();

    const candidates: Array<{ user_id: string; reason: string }> = [];

    // Free users hitting scan limits
    const scanLimited = await db.execute({
        sql: `SELECT uh.user_id, uh.scan_count
              FROM user_health uh
              WHERE uh.plan_id = 'free' AND uh.scan_count >= 8
              LIMIT 20`,
        args: [],
    });
    for (const row of scanLimited.rows) {
        candidates.push({
            user_id: String(row.user_id),
            reason: `Using ${row.scan_count}/10 free scans — approaching limit`,
        });
    }

    // Free users with many leads (near 25 cap)
    const leadLimited = await db.execute({
        sql: `SELECT uh.user_id, uh.lead_count
              FROM user_health uh
              WHERE uh.plan_id = 'free' AND uh.lead_count >= 20
              LIMIT 20`,
        args: [],
    });
    for (const row of leadLimited.rows) {
        candidates.push({
            user_id: String(row.user_id),
            reason: `${row.lead_count}/25 leads stored — approaching storage limit`,
        });
    }

    // Power users on free (high health score, active features)
    const powerUsers = await db.execute({
        sql: `SELECT user_id, health_score
              FROM user_health
              WHERE plan_id = 'free' AND health_score >= 70
              LIMIT 10`,
        args: [],
    });
    for (const row of powerUsers.rows) {
        candidates.push({
            user_id: String(row.user_id),
            reason: `Power user (health: ${row.health_score}/100) — great upgrade candidate`,
        });
    }

    return candidates;
}

// ---- Main Agent Entrypoint ----

export async function runCustomerSuccessAgent(): Promise<CSReport> {
    console.log('[customer-success] Starting health evaluation...');

    const healthResults = await evaluateAllUsers();

    const healthy = healthResults.filter(u => u.risk_level === 'healthy').length;
    const atRisk = healthResults.filter(u => u.risk_level === 'at_risk').length;
    const churning = healthResults.filter(u => u.risk_level === 'churning').length;
    const avgHealth = healthResults.length > 0
        ? Math.round(healthResults.reduce((s, u) => s + u.health_score, 0) / healthResults.length)
        : 0;

    const upgradeCandidates = await findUpgradeCandidates();

    // Count new milestones from cs_events today
    const db = await ensureCSSchema();
    const today = new Date().toISOString().split('T')[0];
    const milestonesResult = await db.execute({
        sql: `SELECT COUNT(*) as c FROM cs_events WHERE event_type = 'milestone' AND created_at >= ?`,
        args: [today],
    });
    const newMilestones = Number(milestonesResult.rows[0]?.c ?? 0);

    console.log(`[customer-success] ${healthResults.length} users evaluated: ${healthy} healthy, ${atRisk} at-risk, ${churning} churning`);
    console.log(`[customer-success] ${upgradeCandidates.length} upgrade candidates, ${newMilestones} new milestones`);

    return {
        total_users_tracked: healthResults.length,
        healthy,
        at_risk: atRisk,
        churning,
        upgrade_candidates: upgradeCandidates.length,
        new_milestones: newMilestones,
        avg_health_score: avgHealth,
    };
}
