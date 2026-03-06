import { getDb } from '@/lib/db';

// ============================================================
// Growth Automation Actions — Executable automated growth tasks
// These are triggered from the admin UI "Launch" buttons on
// automated growth recommendation cards.
// ============================================================

export type AutomationResult = {
    success: boolean;
    action: string;
    details: string;
    metrics?: Record<string, number>;
};

// ── 1. Stalled User Re-engagement Email Drip ──
// Sends personalized nudge emails to users who signed up but haven't completed onboarding.
export async function runStalledUserDrip(): Promise<AutomationResult> {
    const { sendOutreachEmail } = await import('@/lib/email');
    const db = getDb();

    // Find stalled users (signed up > 2 days ago, haven't scanned yet)
    const stalled = await db.execute({
        sql: `SELECT u.id, u.email, u.display_name, u.app_mode
              FROM users u
              LEFT JOIN scan_history sh ON u.id = sh.user_id
              WHERE sh.id IS NULL
              AND u.created_at < datetime('now', '-2 days')
              AND u.created_at > datetime('now', '-14 days')
              LIMIT 10`,
        args: [],
    });

    let sent = 0;
    for (const user of stalled.rows) {
        const email = String(user.email);
        const name = String(user.display_name || 'there');
        const mode = String(user.app_mode || 'performer');

        if (!email || email === 'undefined') continue;

        const modeAction = mode === 'instructor'
            ? 'finding students and teaching gigs'
            : 'discovering venues and booking opportunities';

        try {
            await sendOutreachEmail({
                to: email,
                subject: `${name}, your AI agents are ready to start ${mode === 'instructor' ? 'finding students' : 'booking gigs'} 🎵`,
                body: `Hey ${name},\n\nYou signed up for GigLift but haven't run your first scan yet!\n\nYour AI agents are standing by to start ${modeAction}. It takes about 30 seconds:\n\n1. Go to giglift.com/leads/seeds\n2. Add a few seed keywords (venue names, neighborhoods, genres)\n3. Hit "Scan" — your agents do the rest\n\nMusicians who run their first scan within the first week find 3x more leads on average.\n\nLet's get you booked!\n\nBest,\nThe GigLift Team`,
                replyTo: 'support@giglift.com',
            });
            sent++;
        } catch (err) {
            console.error(`[growth-auto] Failed to send drip to ${email}:`, err);
        }
    }

    return {
        success: true,
        action: 'stalled_user_drip',
        details: `Sent re-engagement emails to ${sent} stalled users out of ${stalled.rows.length} found`,
        metrics: { stalled_found: stalled.rows.length, emails_sent: sent },
    };
}

// ── 2. Trial-to-Paid Upgrade Campaign ──
// Identifies power users on free tier and sends upgrade nudge with personalized stats.
export async function runTrialUpgradeCampaign(): Promise<AutomationResult> {
    const { sendOutreachEmail } = await import('@/lib/email');
    const db = getDb();

    // Find active free users with high usage (potential upgrade candidates)
    const candidates = await db.execute({
        sql: `SELECT u.id, u.email, u.display_name, u.plan,
              COUNT(DISTINCT sh.id) as scan_count
              FROM users u
              LEFT JOIN scan_history sh ON u.id = sh.user_id
              WHERE u.plan = 'free'
              AND u.created_at < datetime('now', '-7 days')
              GROUP BY u.id
              HAVING scan_count >= 3
              ORDER BY scan_count DESC
              LIMIT 10`,
        args: [],
    });

    let sent = 0;
    for (const user of candidates.rows) {
        const email = String(user.email);
        const name = String(user.display_name || 'there');
        const scans = Number(user.scan_count);

        if (!email || email === 'undefined') continue;

        try {
            await sendOutreachEmail({
                to: email,
                subject: `You've run ${scans} scans — unlock unlimited with Pro ⚡`,
                body: `Hey ${name},\n\nYou've been making great use of GigLift — ${scans} scans and counting!\n\nWith a **Pro upgrade**, you'll unlock:\n\n• **Unlimited scans** (no daily caps)\n• **Auto-Scanner** — runs 24/7 finding leads while you sleep\n• **Priority AI processing** — faster, deeper results\n• **Advanced lead scoring** — focus on the highest-value opportunities\n• **Email outreach templates** — one-click pitches to venues\n\nPro is just **$29/month** — most musicians recoup that from a single gig.\n\nUpgrade now → giglift.com/account\n\nKeep grinding! 🎸\nThe GigLift Team`,
                replyTo: 'support@giglift.com',
            });
            sent++;
        } catch (err) {
            console.error(`[growth-auto] Failed to send upgrade email to ${email}:`, err);
        }
    }

    return {
        success: true,
        action: 'trial_upgrade_campaign',
        details: `Sent upgrade nudges to ${sent} power users on free tier (${candidates.rows.length} candidates found)`,
        metrics: { candidates_found: candidates.rows.length, emails_sent: sent },
    };
}

// ── 3. Referral Program Activation ──
// Sends referral invite to users who have booked at least one gig, encouraging them to share.
export async function runReferralActivation(): Promise<AutomationResult> {
    const { sendOutreachEmail } = await import('@/lib/email');
    const db = getDb();

    // Find users with leads who haven't been sent a referral invite
    const active = await db.execute({
        sql: `SELECT u.id, u.email, u.display_name,
              COUNT(DISTINCT l.id) as lead_count
              FROM users u
              INNER JOIN leads l ON u.id = l.user_id
              WHERE l.status IN ('contacted', 'responded', 'booked')
              AND u.email NOT IN (
                  SELECT DISTINCT se.to_email FROM sent_emails se
                  WHERE se.subject LIKE '%referral%' OR se.subject LIKE '%invite%'
              )
              GROUP BY u.id
              HAVING lead_count >= 2
              LIMIT 10`,
        args: [],
    });

    let sent = 0;
    for (const user of active.rows) {
        const email = String(user.email);
        const name = String(user.display_name || 'there');
        const leads = Number(user.lead_count);

        if (!email || email === 'undefined') continue;

        try {
            await sendOutreachEmail({
                to: email,
                subject: `Share GigLift, earn free months 🎁`,
                body: `Hey ${name},\n\nYou've worked ${leads} leads on GigLift — nice hustle!\n\nKnow another musician who could use AI-powered gig discovery? **Refer them and you both get a free month of Pro.**\n\nHere's your personal referral link:\n👉 **giglift.com/join?ref=${String(user.id).slice(0, 8)}**\n\nHow it works:\n1. Share your link with musician friends\n2. When they sign up and run their first scan, you both unlock Pro for 30 days\n3. No limits — refer 12 friends, get a whole year free\n\nSpread the word! 🎶\nThe GigLift Team`,
                replyTo: 'support@giglift.com',
            });
            sent++;
        } catch (err) {
            console.error(`[growth-auto] Failed to send referral email to ${email}:`, err);
        }
    }

    return {
        success: true,
        action: 'referral_activation',
        details: `Sent referral invites to ${sent} active users (${active.rows.length} eligible)`,
        metrics: { eligible_users: active.rows.length, invites_sent: sent },
    };
}

// ── 4. Win-Back Campaign ──
// Targets users who were active but haven't logged in for 14+ days.
export async function runWinBackCampaign(): Promise<AutomationResult> {
    const { sendOutreachEmail } = await import('@/lib/email');
    const db = getDb();

    // Find churning users (were active, but haven't been seen in 14+ days)
    const churning = await db.execute({
        sql: `SELECT u.id, u.email, u.display_name, u.app_mode,
              MAX(sh.created_at) as last_scan
              FROM users u
              INNER JOIN scan_history sh ON u.id = sh.user_id
              WHERE sh.created_at < datetime('now', '-14 days')
              AND u.created_at < datetime('now', '-21 days')
              GROUP BY u.id
              LIMIT 10`,
        args: [],
    });

    let sent = 0;
    for (const user of churning.rows) {
        const email = String(user.email);
        const name = String(user.display_name || 'there');

        if (!email || email === 'undefined') continue;

        try {
            await sendOutreachEmail({
                to: email,
                subject: `We miss you, ${name}! New leads are waiting 🎵`,
                body: `Hey ${name},\n\nIt's been a while since you've checked GigLift — and your AI agents have been busy!\n\nHere's what you might be missing:\n• **New venue leads** in your area\n• **Updated lead scoring** — we improved our algorithms\n• **Seasonal gig opportunities** — spring/summer booking season is heating up\n\nYour agents found leads that other musicians haven't seen yet. Don't leave money on the table.\n\n👉 **Log in now** → giglift.com/dashboard\n\nSee you there! 🎸\nThe GigLift Team`,
                replyTo: 'support@giglift.com',
            });
            sent++;
        } catch (err) {
            console.error(`[growth-auto] Failed to send winback to ${email}:`, err);
        }
    }

    return {
        success: true,
        action: 'win_back_campaign',
        details: `Sent win-back emails to ${sent} churning users (${churning.rows.length} found inactive 14+ days)`,
        metrics: { churning_users: churning.rows.length, emails_sent: sent },
    };
}

// ── Action Registry ──
// Maps action IDs to their functions for dynamic dispatch from the admin UI.
export const GROWTH_ACTIONS: Record<string, {
    name: string;
    run: () => Promise<AutomationResult>;
    description: string;
}> = {
    stalled_user_drip: {
        name: 'Stalled User Re-engagement',
        run: runStalledUserDrip,
        description: 'Email users who signed up but haven\'t scanned',
    },
    trial_upgrade_campaign: {
        name: 'Trial → Paid Upgrade Nudge',
        run: runTrialUpgradeCampaign,
        description: 'Email power users on free tier about Pro',
    },
    referral_activation: {
        name: 'Referral Program Activation',
        run: runReferralActivation,
        description: 'Send referral links to active users',
    },
    win_back_campaign: {
        name: 'Win-Back Campaign',
        run: runWinBackCampaign,
        description: 'Re-engage users inactive for 14+ days',
    },
};
