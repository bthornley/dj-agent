import { getDb } from '@/lib/db';
import { Client } from '@libsql/client';
import { randomUUID as uuid } from 'crypto';

// ============================================================
// Growth Ops Agent — Onboarding, Activation & Ambassador Pipeline
// Automates user acquisition, activation, and retention workflows.
// ============================================================

let _migrated = false;
async function ensureGrowthSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS growth_events (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS onboarding_status (
                user_id TEXT PRIMARY KEY,
                mode TEXT DEFAULT 'performer',
                step TEXT DEFAULT 'signed_up',
                completed_steps TEXT DEFAULT '[]',
                nudge_count INTEGER DEFAULT 0,
                last_nudge_at TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS ambassador_applications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                instagram TEXT DEFAULT '',
                reason TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                reviewed_at TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export type OnboardingStep = 'signed_up' | 'profile_created' | 'seeds_added' | 'first_scan' | 'first_lead' | 'epk_built' | 'activated';

export interface OnboardingStatus {
    user_id: string;
    mode: string;
    step: OnboardingStep;
    completed_steps: OnboardingStep[];
    nudge_count: number;
}

export interface FunnelMetrics {
    total_signups: number;
    profile_created: number;
    seeds_added: number;
    first_scan: number;
    first_lead: number;
    activated: number;
    conversion_rate: number;
}

interface AmbassadorApplication {
    id: string;
    user_id: string;
    name: string;
    email: string;
    instagram: string;
    reason: string;
    status: string;
}

// ---- Onboarding Engine ----

const MODE_ONBOARDING: Record<string, { welcome: string; next_action: string }> = {
    performer: {
        welcome: 'Welcome to GigLift! Your AI agents are ready to find gigs at venues, bars, and events.',
        next_action: 'Add your first region and discovery seeds at /leads/seeds to start finding opportunities.',
    },
    instructor: {
        welcome: 'Welcome to GigLift! Your AI agents are ready to find teaching opportunities.',
        next_action: 'Add seeds for music schools and community centers in your area at /leads/seeds.',
    },
    studio: {
        welcome: 'Welcome to GigLift! Your AI agents are ready to find studio and session work.',
        next_action: 'Configure your seeds for recording studios and producers at /leads/seeds.',
    },
    touring: {
        welcome: 'Welcome to GigLift! Your AI agents are ready to find touring and travel gigs.',
        next_action: 'Set up regions and seeds for tour venues and booking agents at /leads/seeds.',
    },
};

export async function checkNewUsers(): Promise<Array<{ user_id: string; mode: string; action: string }>> {
    const db = await ensureGrowthSchema();

    // Find users with leads but no onboarding record (likely new)
    const result = await db.execute({
        sql: `SELECT DISTINCT l.user_id, l.mode
              FROM leads l
              LEFT JOIN onboarding_status o ON l.user_id = o.user_id
              WHERE o.user_id IS NULL
              LIMIT 50`,
        args: [],
    });

    const actions: Array<{ user_id: string; mode: string; action: string }> = [];

    for (const row of result.rows) {
        const userId = String(row.user_id);
        const mode = String(row.mode || 'performer');
        const config = MODE_ONBOARDING[mode] || MODE_ONBOARDING.performer;

        // Create onboarding record
        await db.execute({
            sql: `INSERT OR IGNORE INTO onboarding_status (user_id, mode, step) VALUES (?, ?, 'first_lead')`,
            args: [userId, mode],
        });

        actions.push({ user_id: userId, mode, action: config.welcome });
    }

    return actions;
}

export async function evaluateOnboardingProgress(): Promise<{
    stalled: number;
    nudged: number;
    activated: number;
}> {
    const db = await ensureGrowthSchema();
    let stalled = 0, nudged = 0, activated = 0;

    // Find users stuck at early steps (haven't progressed in 3+ days)
    const stalledUsers = await db.execute({
        sql: `SELECT user_id, mode, step, nudge_count
              FROM onboarding_status
              WHERE step NOT IN ('activated')
              AND (last_nudge_at = '' OR last_nudge_at < datetime('now', '-3 days'))
              AND nudge_count < 3
              LIMIT 20`,
        args: [],
    });

    for (const row of stalledUsers.rows) {
        const userId = String(row.user_id);
        const mode = String(row.mode || 'performer');
        const step = String(row.step) as OnboardingStep;
        stalled++;

        // Check if they've actually progressed
        const hasLeads = await db.execute({
            sql: `SELECT COUNT(*) as c FROM leads WHERE user_id = ?`, args: [userId],
        });
        const hasSeeds = await db.execute({
            sql: `SELECT COUNT(*) as c FROM query_seeds WHERE user_id = ?`, args: [userId],
        });
        const hasEpk = await db.execute({
            sql: `SELECT COUNT(*) as c FROM epk_configs WHERE user_id = ?`, args: [userId],
        });

        const leadCount = Number(hasLeads.rows[0]?.c ?? 0);
        const seedCount = Number(hasSeeds.rows[0]?.c ?? 0);
        const epkCount = Number(hasEpk.rows[0]?.c ?? 0);

        // Determine actual progress
        let actualStep: OnboardingStep = step;
        if (epkCount > 0 && leadCount >= 5) actualStep = 'activated';
        else if (leadCount > 0) actualStep = 'first_lead';
        else if (seedCount > 0) actualStep = 'seeds_added';

        if (actualStep === 'activated') {
            activated++;
            await db.execute({
                sql: `UPDATE onboarding_status SET step = 'activated', updated_at = datetime('now') WHERE user_id = ?`,
                args: [userId],
            });
        } else if (actualStep === step) {
            // Still stalled — log nudge
            nudged++;
            await db.execute({
                sql: `UPDATE onboarding_status SET nudge_count = nudge_count + 1, last_nudge_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?`,
                args: [userId],
            });

            // Log the nudge event
            await db.execute({
                sql: `INSERT INTO growth_events (id, user_id, event_type, metadata) VALUES (?, ?, 'nudge', ?)`,
                args: [uuid(), userId, JSON.stringify({ step, mode, nudge_count: Number(row.nudge_count) + 1 })],
            });
        } else {
            // Progressed — update step
            await db.execute({
                sql: `UPDATE onboarding_status SET step = ?, updated_at = datetime('now') WHERE user_id = ?`,
                args: [actualStep, userId],
            });
        }
    }

    return { stalled, nudged, activated };
}

// ---- Funnel Tracker ----

export async function getFunnelMetrics(): Promise<FunnelMetrics> {
    const db = await ensureGrowthSchema();

    const steps = await db.execute({
        sql: `SELECT step, COUNT(*) as count FROM onboarding_status GROUP BY step`,
        args: [],
    });

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of steps.rows) {
        counts[String(row.step)] = Number(row.count);
        total += Number(row.count);
    }

    const activated = counts['activated'] || 0;

    return {
        total_signups: total,
        profile_created: counts['profile_created'] || 0,
        seeds_added: counts['seeds_added'] || 0,
        first_scan: counts['first_scan'] || 0,
        first_lead: counts['first_lead'] || 0,
        activated,
        conversion_rate: total > 0 ? Math.round((activated / total) * 100) : 0,
    };
}

// ---- Ambassador Pipeline ----

export async function processAmbassadorApplications(): Promise<{ pending: number; auto_approved: number }> {
    const db = await ensureGrowthSchema();

    const pending = await db.execute({
        sql: `SELECT * FROM ambassador_applications WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20`,
        args: [],
    });

    let autoApproved = 0;

    for (const row of pending.rows) {
        const app: AmbassadorApplication = {
            id: String(row.id),
            user_id: String(row.user_id),
            name: String(row.name),
            email: String(row.email),
            instagram: String(row.instagram),
            reason: String(row.reason),
            status: String(row.status),
        };

        // Auto-approve if they have Instagram and a reason
        if (app.instagram && app.reason.length > 20) {
            await db.execute({
                sql: `UPDATE ambassador_applications SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?`,
                args: [app.id],
            });

            // Log event
            await db.execute({
                sql: `INSERT INTO growth_events (id, user_id, event_type, metadata) VALUES (?, ?, 'ambassador_approved', ?)`,
                args: [uuid(), app.user_id, JSON.stringify({ name: app.name, instagram: app.instagram })],
            });

            autoApproved++;
        }
    }

    return { pending: pending.rows.length, auto_approved: autoApproved };
}

// ---- Main Agent Entrypoint ----

export async function runGrowthOpsAgent(): Promise<{
    newUsers: number;
    onboarding: { stalled: number; nudged: number; activated: number };
    funnel: FunnelMetrics;
    ambassadors: { pending: number; auto_approved: number };
}> {
    console.log('[growth-ops] Starting growth ops run...');

    // 1. Check for new users and initialize onboarding
    const newUserActions = await checkNewUsers();
    console.log(`[growth-ops] Found ${newUserActions.length} new users`);

    // 2. Evaluate onboarding progress and nudge stalled users
    const onboarding = await evaluateOnboardingProgress();
    console.log(`[growth-ops] Onboarding: ${onboarding.stalled} stalled, ${onboarding.nudged} nudged, ${onboarding.activated} activated`);

    // 3. Get funnel metrics
    const funnel = await getFunnelMetrics();
    console.log(`[growth-ops] Funnel: ${funnel.total_signups} signups, ${funnel.conversion_rate}% conversion`);

    // 4. Process ambassador applications
    const ambassadors = await processAmbassadorApplications();
    console.log(`[growth-ops] Ambassadors: ${ambassadors.pending} pending, ${ambassadors.auto_approved} auto-approved`);

    return {
        newUsers: newUserActions.length,
        onboarding,
        funnel,
        ambassadors,
    };
}
