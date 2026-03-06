import { Client } from '@libsql/client';
import { getStripe } from '@/lib/stripe';
import { dbGetPlatformStats, getDb } from '@/lib/db';

// ============================================================
// Analytics Agent — KPI Compiler & Metrics Store
// Runs daily via Vercel Cron to snapshot business metrics.
// ============================================================

// ---- Schema Migration ----

let _migrated = false;
async function ensureAnalyticsSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS daily_metrics (
                date TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS metric_alerts (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                metric TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT DEFAULT 'info',
                acknowledged INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export interface DailyMetrics {
    date: string;
    // Users
    totalUsers: number;
    newUsersToday: number;
    activeUsersLast7d: number;
    usersByMode: Record<string, number>;
    // Revenue
    mrr: number;
    arr: number;
    paidSubscribers: number;
    planBreakdown: Record<string, number>;
    // Product
    totalLeads: number;
    totalScansThisMonth: number;
    totalSeeds: number;
    avgLeadScore: number;
    // Growth
    trialToPaidRate: number;
    churnRate: number;
}

// ---- KPI Compiler ----

export async function compileKPIs(): Promise<DailyMetrics> {
    const db = await ensureAnalyticsSchema();
    const today = new Date().toISOString().split('T')[0];

    // --- User & product metrics via shared DB function (same as main admin page) ---
    const platformStats = await dbGetPlatformStats();
    const totalDbUsers = platformStats.uniqueUserIds.length;
    const totalLeads = platformStats.totalLeads;

    const seedsResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM query_seeds`,
        args: [],
    });
    const totalSeeds = Number(seedsResult.rows[0]?.count ?? 0);

    const scoreResult = await db.execute({
        sql: `SELECT AVG(lead_score) as avg FROM leads WHERE lead_score > 0`,
        args: [],
    });
    const avgLeadScore = Math.round(Number(scoreResult.rows[0]?.avg ?? 0));

    // Mode breakdown from leads
    const modeResult = await db.execute({
        sql: `SELECT mode, COUNT(DISTINCT user_id) as count FROM leads GROUP BY mode`,
        args: [],
    });
    const usersByMode: Record<string, number> = {};
    for (const row of modeResult.rows) {
        usersByMode[String(row.mode || 'performer')] = Number(row.count);
    }

    // Scan usage this month
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const scansResult = await db.execute({
        sql: `SELECT SUM(count) as total FROM search_quota WHERE quota_key LIKE ?`,
        args: [`%:${monthKey}`],
    });
    const totalScansThisMonth = Number(scansResult.rows[0]?.total ?? 0);

    // --- Revenue metrics from Stripe ---
    let mrr = 0;
    let paidSubscribers = 0;
    const planBreakdown: Record<string, number> = { free: 0, pro: 0, unlimited: 0, agency: 0 };

    try {
        if (process.env.STRIPE_SECRET_KEY) {
            const stripe = getStripe();

            // Get active subscriptions
            const subs = await stripe.subscriptions.list({
                status: 'active',
                limit: 100,
                expand: ['data.items.data.price'],
            });

            for (const sub of subs.data) {
                paidSubscribers++;
                const amount = sub.items.data[0]?.price?.unit_amount ?? 0;
                mrr += amount / 100; // Convert cents to dollars

                // Categorize by plan
                const priceId = sub.items.data[0]?.price?.id;
                if (priceId?.includes('pro')) planBreakdown.pro++;
                else if (priceId?.includes('unlimited')) planBreakdown.unlimited++;
                else if (priceId?.includes('agency')) planBreakdown.agency++;
            }
        }
    } catch (err) {
        console.error('[analytics] Stripe fetch failed:', err);
    }

    // Clerk user count (authoritative source)
    let totalUsers = totalDbUsers;
    let newUsersToday = 0;
    try {
        if (process.env.CLERK_SECRET_KEY) {
            // Clerk v4+ API: GET /v1/users/count returns { object, total_count }
            const res = await fetch('https://api.clerk.com/v1/users/count', {
                headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
            });
            if (res.ok) {
                const data = await res.json();
                // Handle both response formats
                const count = data.total_count ?? data;
                if (typeof count === 'number' && count > 0) {
                    totalUsers = count;
                }
            }

            // New users today
            const todayStart = new Date(today + 'T00:00:00Z').getTime();
            const usersRes = await fetch(
                `https://api.clerk.com/v1/users?created_at_since=${todayStart}&limit=100`,
                { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
            );
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                newUsersToday = Array.isArray(usersData) ? usersData.length : 0;
            }
        }
    } catch (err) {
        console.error('[analytics] Clerk fetch failed:', err);
    }

    // Use the larger of DB count and Clerk count
    totalUsers = Math.max(totalUsers, totalDbUsers);

    const arr = mrr * 12;
    planBreakdown.free = Math.max(0, totalUsers - paidSubscribers);

    const metrics: DailyMetrics = {
        date: today,
        totalUsers,
        newUsersToday,
        activeUsersLast7d: totalDbUsers, // Approximation: users with any activity
        usersByMode,
        mrr,
        arr,
        paidSubscribers,
        planBreakdown,
        totalLeads,
        totalScansThisMonth,
        totalSeeds,
        avgLeadScore,
        trialToPaidRate: totalUsers > 0 ? Math.round((paidSubscribers / totalUsers) * 100) : 0,
        churnRate: 0, // Computed from historical data once we have it
    };

    return metrics;
}

// ---- Snapshot Storage ----

export async function saveSnapshot(metrics: DailyMetrics): Promise<void> {
    const db = await ensureAnalyticsSchema();
    await db.execute({
        sql: `INSERT INTO daily_metrics (date, data) VALUES (?, ?)
              ON CONFLICT(date) DO UPDATE SET data = ?, created_at = datetime('now')`,
        args: [metrics.date, JSON.stringify(metrics), JSON.stringify(metrics)],
    });
}

export async function getSnapshot(date: string): Promise<DailyMetrics | null> {
    const db = await ensureAnalyticsSchema();
    const result = await db.execute({
        sql: `SELECT data FROM daily_metrics WHERE date = ?`,
        args: [date],
    });
    if (result.rows.length === 0) return null;
    return JSON.parse(String(result.rows[0].data));
}

export async function getRecentSnapshots(days: number = 7): Promise<DailyMetrics[]> {
    const db = await ensureAnalyticsSchema();
    const result = await db.execute({
        sql: `SELECT data FROM daily_metrics ORDER BY date DESC LIMIT ?`,
        args: [days],
    });
    return result.rows.map(row => JSON.parse(String(row.data)));
}

// ---- Anomaly Detection ----

export async function detectAnomalies(current: DailyMetrics): Promise<string[]> {
    const history = await getRecentSnapshots(7);
    if (history.length < 3) return []; // Need history to detect anomalies

    const alerts: string[] = [];

    // Check MRR drop
    const prevMRR = history[0]?.mrr ?? 0;
    if (prevMRR > 0 && current.mrr < prevMRR * 0.9) {
        alerts.push(`⚠️ MRR dropped ${Math.round(((prevMRR - current.mrr) / prevMRR) * 100)}% from $${prevMRR} to $${current.mrr}`);
    }

    // Check user growth stall
    const prevUsers = history[0]?.totalUsers ?? 0;
    if (prevUsers > 10 && current.newUsersToday === 0) {
        alerts.push(`📉 No new signups today (total: ${current.totalUsers})`);
    }

    // Check scan usage spike
    const avgScans = history.reduce((s, h) => s + h.totalScansThisMonth, 0) / history.length;
    if (avgScans > 0 && current.totalScansThisMonth > avgScans * 2) {
        alerts.push(`📈 Scan usage spike: ${current.totalScansThisMonth} vs ${Math.round(avgScans)} avg`);
    }

    return alerts;
}

// ---- Report Generator ----

export function generateDailyReport(metrics: DailyMetrics, alerts: string[]): string {
    const sections = [
        `📊 GigLift Daily Metrics — ${metrics.date}`,
        ``,
        `## Revenue`,
        `- MRR: $${metrics.mrr.toLocaleString()}`,
        `- ARR: $${metrics.arr.toLocaleString()}`,
        `- Paid subscribers: ${metrics.paidSubscribers}`,
        `- Plan breakdown: Free: ${metrics.planBreakdown.free} | Pro: ${metrics.planBreakdown.pro} | Unlimited: ${metrics.planBreakdown.unlimited} | Agency: ${metrics.planBreakdown.agency}`,
        ``,
        `## Users`,
        `- Total: ${metrics.totalUsers}`,
        `- New today: ${metrics.newUsersToday}`,
        `- Active (7d): ${metrics.activeUsersLast7d}`,
        `- Trial→Paid: ${metrics.trialToPaidRate}%`,
        `- By mode: ${Object.entries(metrics.usersByMode).map(([k, v]) => `${k}: ${v}`).join(' | ')}`,
        ``,
        `## Product`,
        `- Total leads: ${metrics.totalLeads.toLocaleString()}`,
        `- Scans this month: ${metrics.totalScansThisMonth}`,
        `- Seeds configured: ${metrics.totalSeeds}`,
        `- Avg lead score: ${metrics.avgLeadScore}/100`,
    ];

    if (alerts.length > 0) {
        sections.push(``, `## ⚡ Alerts`, ...alerts.map(a => `- ${a}`));
    }

    return sections.join('\n');
}

export function generateWeeklyInvestorUpdate(snapshots: DailyMetrics[]): string {
    if (snapshots.length === 0) return 'No data available yet.';

    const latest = snapshots[0];
    const oldest = snapshots[snapshots.length - 1];
    const mrrGrowth = oldest.mrr > 0
        ? Math.round(((latest.mrr - oldest.mrr) / oldest.mrr) * 100)
        : 0;
    const userGrowth = oldest.totalUsers > 0
        ? Math.round(((latest.totalUsers - oldest.totalUsers) / oldest.totalUsers) * 100)
        : 0;
    const newUsers7d = snapshots.reduce((s, m) => s + m.newUsersToday, 0);

    return [
        `# GigLift Weekly Investor Update`,
        `_Week of ${oldest.date} → ${latest.date}_`,
        ``,
        `## Key Numbers`,
        `| Metric | Current | WoW Change |`,
        `|---|---|---|`,
        `| MRR | $${latest.mrr.toLocaleString()} | ${mrrGrowth >= 0 ? '+' : ''}${mrrGrowth}% |`,
        `| Total Users | ${latest.totalUsers.toLocaleString()} | ${userGrowth >= 0 ? '+' : ''}${userGrowth}% |`,
        `| Paid Subscribers | ${latest.paidSubscribers} | — |`,
        `| New Users (7d) | ${newUsers7d} | — |`,
        `| Leads Generated | ${latest.totalLeads.toLocaleString()} | — |`,
        `| Avg Lead Score | ${latest.avgLeadScore}/100 | — |`,
        `| Trial→Paid | ${latest.trialToPaidRate}% | — |`,
        ``,
        `## Highlights`,
        `- ${latest.paidSubscribers} paying subscribers across ${Object.entries(latest.planBreakdown).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')}`,
        `- ${latest.totalScansThisMonth} scans executed this month`,
        `- ${latest.totalSeeds} discovery seeds configured`,
        `- Active modes: ${Object.entries(latest.usersByMode).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        ``,
        `_Powered by GigLift Analytics Agent_`,
    ].join('\n');
}

// ---- Main Agent Entrypoint ----

// ---- CFO Analysis ----

export interface CFOInsight {
    id: string;
    date: string;
    revenue_health: string;
    unit_economics: string;
    risk_flags: string[];
    recommended_actions: string[];
    runway_assessment: string;
    summary: string;
    created_at: string;
}

async function ensureCFOSchema(): Promise<Client> {
    const db = await ensureAnalyticsSchema();
    await db.executeMultiple(`
        CREATE TABLE IF NOT EXISTS cfo_insights (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            revenue_health TEXT DEFAULT '',
            unit_economics TEXT DEFAULT '',
            risk_flags TEXT DEFAULT '[]',
            recommended_actions TEXT DEFAULT '[]',
            runway_assessment TEXT DEFAULT '',
            summary TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);
    return db;
}

export async function getCFOInsights(limit: number = 5): Promise<CFOInsight[]> {
    const db = await ensureCFOSchema();
    const result = await db.execute({
        sql: `SELECT * FROM cfo_insights ORDER BY created_at DESC LIMIT ?`,
        args: [limit],
    });
    return result.rows.map(row => ({
        id: String(row.id),
        date: String(row.date),
        revenue_health: String(row.revenue_health),
        unit_economics: String(row.unit_economics),
        risk_flags: JSON.parse(String(row.risk_flags || '[]')),
        recommended_actions: JSON.parse(String(row.recommended_actions || '[]')),
        runway_assessment: String(row.runway_assessment),
        summary: String(row.summary),
        created_at: String(row.created_at),
    }));
}

async function generateCFOAnalysis(metrics: DailyMetrics, alerts: string[], history: DailyMetrics[]): Promise<void> {
    const { aiJSON } = await import('@/lib/ai');
    const { randomUUID: uuid } = await import('crypto');

    const historyContext = history.map(h =>
        `${h.date}: MRR=$${h.mrr}, ARR=$${h.arr}, Users=${h.totalUsers}, Paid=${h.paidSubscribers}, Leads=${h.totalLeads}`
    ).join('\n');

    const result = await aiJSON<{
        revenue_health: string;
        unit_economics: string;
        risk_flags: string[];
        recommended_actions: string[];
        runway_assessment: string;
        summary: string;
    }>(
        `You are an expert CFO analyzing a SaaS startup called GigLift (AI agents for musicians). Provide a concise financial analysis from a CFO perspective.`,
        `Analyze these metrics for GigLift:

TODAY's Metrics:
- MRR: $${metrics.mrr} | ARR: $${metrics.arr}
- Total Users: ${metrics.totalUsers} | New Today: ${metrics.newUsersToday}
- Active (7d): ${metrics.activeUsersLast7d}
- Paid Subscribers: ${metrics.paidSubscribers}
- Plan Breakdown: ${JSON.stringify(metrics.planBreakdown)}
- Trial-to-Paid Rate: ${metrics.trialToPaidRate}%
- Churn Rate: ${metrics.churnRate}%
- Total Leads: ${metrics.totalLeads} | Scans This Month: ${metrics.totalScansThisMonth}
- Avg Lead Score: ${metrics.avgLeadScore}/100

7-Day History:
${historyContext}

Current Anomaly Alerts:
${alerts.length > 0 ? alerts.join('\n') : 'None'}

Return JSON with:
- revenue_health: 2-3 sentence assessment of revenue trajectory and health
- unit_economics: 2-3 sentence analysis of CAC, LTV indicators, and margins
- risk_flags: array of 2-4 specific financial risk concerns
- recommended_actions: array of 3-5 specific CFO-level actions to take
- runway_assessment: 1-2 sentence assessment of burn rate and runway  
- summary: 1 sentence executive summary`,
        { maxTokens: 1500, temperature: 0.5 }
    );

    if (!result) return;

    const db = await ensureCFOSchema();
    await db.execute({
        sql: `INSERT INTO cfo_insights (id, date, revenue_health, unit_economics, risk_flags, recommended_actions, runway_assessment, summary)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            uuid(), metrics.date,
            result.revenue_health || '',
            result.unit_economics || '',
            JSON.stringify(result.risk_flags || []),
            JSON.stringify(result.recommended_actions || []),
            result.runway_assessment || '',
            result.summary || '',
        ],
    });
}

export async function runAnalyticsAgent(): Promise<{
    metrics: DailyMetrics;
    alerts: string[];
    report: string;
    cfoInsights: boolean;
}> {
    console.log('[analytics-agent] Starting daily KPI compilation...');

    const metrics = await compileKPIs();
    await saveSnapshot(metrics);

    const alerts = await detectAnomalies(metrics);
    const report = generateDailyReport(metrics, alerts);

    // Generate CFO analysis
    let cfoInsights = false;
    try {
        const history = await getRecentSnapshots(7);
        await generateCFOAnalysis(metrics, alerts, history);
        cfoInsights = true;
        console.log('[analytics-agent] CFO analysis generated');
    } catch (err) {
        console.error('[analytics-agent] CFO analysis failed:', err);
    }

    console.log('[analytics-agent] Snapshot saved for', metrics.date);
    if (alerts.length > 0) {
        console.log('[analytics-agent] Alerts:', alerts);
    }

    return { metrics, alerts, report, cfoInsights };
}

