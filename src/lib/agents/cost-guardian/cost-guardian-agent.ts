import { Client } from '@libsql/client';
import { getDb } from '@/lib/db';

// ============================================================
// Cost Guardian Agent — Infrastructure Cost Monitor & Guardrails
// Runs daily via Vercel Cron to track service usage, detect
// cost risks, and enforce optimization strategies.
// ============================================================

// ---- Schema Migration ----

let _migrated = false;
async function ensureCostSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS cost_snapshots (
                date TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS cost_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                service TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'warning',
                message TEXT NOT NULL,
                action_taken TEXT,
                acknowledged INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS cost_guardrail_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                guardrail TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ---- Types ----

export interface ServiceCostMetrics {
    name: string;
    plan: string;
    currentUsage: number;
    limit: number;
    unit: string;
    usagePercent: number;
    estimatedMonthlyCost: number;
    threshold: number; // alert when usagePercent exceeds this
    status: 'healthy' | 'warning' | 'critical';
}

export interface CostSnapshot {
    date: string;
    services: ServiceCostMetrics[];
    totalEstimatedMonthlyCost: number;
    mrrForComparison: number;
    costToRevenuePercent: number;
    alerts: CostAlert[];
    guardrailActions: GuardrailAction[];
}

export interface CostAlert {
    service: string;
    type: 'usage_spike' | 'threshold_breach' | 'cost_anomaly' | 'rate_limit_hit' | 'budget_warning';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    actionTaken?: string;
}

export interface GuardrailAction {
    guardrail: string;
    action: string;
    details: string;
}

// ---- Service Monitors ----

async function measureTurso(db: Client): Promise<ServiceCostMetrics> {
    // Measure DB row count and storage indicators
    const tables = ['leads', 'query_seeds', 'search_quota', 'rate_limit_log',
        'daily_metrics', 'metric_alerts', 'cost_snapshots', 'agent_runs'];
    let totalRows = 0;
    for (const table of tables) {
        try {
            const result = await db.execute({ sql: `SELECT COUNT(*) as c FROM ${table}`, args: [] });
            totalRows += Number(result.rows[0]?.c ?? 0);
        } catch {
            // Table may not exist yet
        }
    }

    // Estimate storage (rough: ~500 bytes per row average)
    const estimatedStorageGB = (totalRows * 500) / (1024 * 1024 * 1024);
    const limitGB = 24; // Scaler plan
    const usagePercent = Math.round((estimatedStorageGB / limitGB) * 100);

    return {
        name: 'Turso',
        plan: estimatedStorageGB < 9 ? 'Free' : 'Scaler',
        currentUsage: Math.round(estimatedStorageGB * 1000) / 1000,
        limit: limitGB,
        unit: 'GB storage',
        usagePercent,
        estimatedMonthlyCost: estimatedStorageGB < 9 ? 0 : 29,
        threshold: 70,
        status: usagePercent > 85 ? 'critical' : usagePercent > 70 ? 'warning' : 'healthy',
    };
}

async function measureOpenAI(db: Client): Promise<ServiceCostMetrics> {
    // Count agent runs this month to estimate OpenAI token costs
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthKey = monthStart.toISOString().split('T')[0];

    let agentRuns = 0;
    try {
        // Count cron-triggered agent runs from our agent_runs or cost_snapshots table
        const result = await db.execute({
            sql: `SELECT COUNT(*) as c FROM cost_snapshots WHERE date >= ?`,
            args: [monthKey],
        });
        const daysThisMonth = new Date().getDate();
        // 7 agents run daily + per-user agent calls (lead scans, outreach, etc.)
        agentRuns = daysThisMonth * 7; // system-level agent runs
    } catch {
        agentRuns = new Date().getDate() * 7;
    }

    // Count user-triggered AI operations (lead scans that call OpenAI)
    let userAiCalls = 0;
    try {
        const result = await db.execute({
            sql: `SELECT SUM(count) as total FROM search_quota WHERE quota_key LIKE ?`,
            args: [`%:${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`],
        });
        userAiCalls = Number(result.rows[0]?.total ?? 0);
    } catch {
        // Table may not exist
    }

    const totalCalls = agentRuns + userAiCalls;
    // GPT-4o-mini: ~3K tokens/call avg → ~$0.001/call (input + output)
    const estimatedCost = Math.round(totalCalls * 0.001 * 100) / 100;
    const monthlyBudget = 50; // $50/mo budget for launch phase
    const usagePercent = Math.round((estimatedCost / monthlyBudget) * 100);

    return {
        name: 'OpenAI',
        plan: 'Pay-as-you-go',
        currentUsage: totalCalls,
        limit: Math.round(monthlyBudget / 0.001),
        unit: 'API calls (est.)',
        usagePercent,
        estimatedMonthlyCost: estimatedCost,
        threshold: 80,
        status: usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'healthy',
    };
}

async function measureClerk(): Promise<ServiceCostMetrics> {
    let totalUsers = 0;
    try {
        if (process.env.CLERK_SECRET_KEY) {
            const res = await fetch('https://api.clerk.com/v1/users/count', {
                headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
            });
            if (res.ok) {
                const data = await res.json();
                totalUsers = data.total_count ?? (typeof data === 'number' ? data : 0);
            }
        }
    } catch {
        // Clerk API unavailable
    }

    const freeLimit = 50000;
    const usagePercent = Math.round((totalUsers / freeLimit) * 100);
    const overage = Math.max(0, totalUsers - freeLimit);
    const estimatedCost = overage > 0 ? 20 + (overage * 0.02) : 0;

    return {
        name: 'Clerk',
        plan: totalUsers > freeLimit ? 'Pro' : 'Free',
        currentUsage: totalUsers,
        limit: freeLimit,
        unit: 'MAU',
        usagePercent,
        estimatedMonthlyCost: estimatedCost,
        threshold: 80,
        status: usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'healthy',
    };
}

async function measureResend(db: Client): Promise<ServiceCostMetrics> {
    // Estimate email volume from outreach activity
    let emailsThisMonth = 0;
    try {
        const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const result = await db.execute({
            sql: `SELECT COUNT(*) as c FROM leads WHERE created_at LIKE ? AND outreach_status = 'sent'`,
            args: [`${monthKey}%`],
        });
        emailsThisMonth = Number(result.rows[0]?.c ?? 0);
    } catch {
        // Table may not have outreach_status
    }

    const freeLimit = 3000;
    const usagePercent = Math.round((emailsThisMonth / freeLimit) * 100);
    const estimatedCost = emailsThisMonth > freeLimit ? 20 : 0;

    return {
        name: 'Resend',
        plan: emailsThisMonth > freeLimit ? 'Pro' : 'Free',
        currentUsage: emailsThisMonth,
        limit: freeLimit,
        unit: 'emails/mo',
        usagePercent,
        estimatedMonthlyCost: estimatedCost,
        threshold: 75,
        status: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'warning' : 'healthy',
    };
}

async function measureRateLimits(db: Client): Promise<ServiceCostMetrics> {
    // Monitor rate limit hits — high hit rates indicate we're protecting against cost spikes
    let rateLimitHits = 0;
    try {
        const result = await db.execute({
            sql: `SELECT COUNT(*) as c FROM rate_limit_log WHERE ts > ?`,
            args: [Date.now() - 86400000], // last 24 hours
        });
        rateLimitHits = Number(result.rows[0]?.c ?? 0);
    } catch {
        // Table may not exist
    }

    const dailyThreshold = 1000;
    const usagePercent = Math.round((rateLimitHits / dailyThreshold) * 100);

    return {
        name: 'Rate Limiter',
        plan: 'Active',
        currentUsage: rateLimitHits,
        limit: dailyThreshold,
        unit: 'hits/24h',
        usagePercent,
        estimatedMonthlyCost: 0,
        threshold: 50,
        status: usagePercent > 80 ? 'critical' : usagePercent > 50 ? 'warning' : 'healthy',
    };
}

async function measureStripe(): Promise<ServiceCostMetrics> {
    let monthlyVolume = 0;
    let txnCount = 0;

    try {
        if (process.env.STRIPE_SECRET_KEY) {
            const { getStripe } = await import('@/lib/stripe');
            const stripe = getStripe();

            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const charges = await stripe.charges.list({
                created: { gte: Math.floor(monthStart.getTime() / 1000) },
                limit: 100,
            });

            for (const charge of charges.data) {
                if (charge.status === 'succeeded') {
                    monthlyVolume += charge.amount / 100;
                    txnCount++;
                }
            }
        }
    } catch {
        // Stripe unavailable
    }

    // Stripe fees: 2.9% + $0.30 per txn
    const estimatedFees = Math.round((monthlyVolume * 0.029 + txnCount * 0.30) * 100) / 100;
    // No hard limit — purely variable
    const usagePercent = monthlyVolume > 0 ? Math.round((estimatedFees / monthlyVolume) * 100) : 0;

    return {
        name: 'Stripe',
        plan: 'Pay-as-you-go',
        currentUsage: monthlyVolume,
        limit: 0,
        unit: '$ processed',
        usagePercent: usagePercent,
        estimatedMonthlyCost: estimatedFees,
        threshold: 5, // alert if fees > 5% of volume (unusual)
        status: 'healthy',
    };
}

// ---- Guardrail Engine ----

async function enforceGuardrails(
    services: ServiceCostMetrics[],
    db: Client
): Promise<GuardrailAction[]> {
    const actions: GuardrailAction[] = [];

    // Guardrail 1: Clean up stale rate limit logs (reduces Turso row reads)
    try {
        const weekAgo = Date.now() - 7 * 86400000;
        const result = await db.execute({
            sql: `DELETE FROM rate_limit_log WHERE ts < ?`,
            args: [weekAgo],
        });
        if (result.rowsAffected > 0) {
            actions.push({
                guardrail: 'db_cleanup',
                action: 'Purged stale rate limit logs',
                details: `Removed ${result.rowsAffected} entries older than 7 days`,
            });
        }
    } catch {
        // Table may not exist
    }

    // Guardrail 2: Clean up old search quota entries (reduces row count)
    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const cutoffKey = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
        const result = await db.execute({
            sql: `DELETE FROM search_quota WHERE quota_key < ?`,
            args: [cutoffKey],
        });
        if (result.rowsAffected > 0) {
            actions.push({
                guardrail: 'quota_cleanup',
                action: 'Purged old search quota records',
                details: `Removed ${result.rowsAffected} entries older than 3 months`,
            });
        }
    } catch {
        // Ignore
    }

    // Guardrail 3: Archive old cost snapshots (keep last 90 days)
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const cutoff = ninetyDaysAgo.toISOString().split('T')[0];
        const result = await db.execute({
            sql: `DELETE FROM cost_snapshots WHERE date < ?`,
            args: [cutoff],
        });
        if (result.rowsAffected > 0) {
            actions.push({
                guardrail: 'snapshot_cleanup',
                action: 'Archived old cost snapshots',
                details: `Removed ${result.rowsAffected} snapshots older than 90 days`,
            });
        }
    } catch {
        // Ignore
    }

    // Guardrail 4: Archive old metric alerts (keep last 30 days)
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
        const result = await db.execute({
            sql: `DELETE FROM metric_alerts WHERE date < ? AND acknowledged = 1`,
            args: [cutoff],
        });
        if (result.rowsAffected > 0) {
            actions.push({
                guardrail: 'alert_cleanup',
                action: 'Archived acknowledged metric alerts',
                details: `Removed ${result.rowsAffected} old acknowledged alerts`,
            });
        }
    } catch {
        // Ignore
    }

    // Guardrail 5: Archive old cost alerts (keep last 60 days)
    try {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const cutoff = sixtyDaysAgo.toISOString().split('T')[0];
        const result = await db.execute({
            sql: `DELETE FROM cost_alerts WHERE date < ? AND acknowledged = 1`,
            args: [cutoff],
        });
        if (result.rowsAffected > 0) {
            actions.push({
                guardrail: 'cost_alert_cleanup',
                action: 'Archived old cost alerts',
                details: `Removed ${result.rowsAffected} old acknowledged cost alerts`,
            });
        }
    } catch {
        // Ignore
    }

    return actions;
}

// ---- Alert Detection ----

async function detectCostAlerts(
    services: ServiceCostMetrics[],
    snapshot: CostSnapshot,
    db: Client,
): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];

    // Check each service against its threshold
    for (const svc of services) {
        if (svc.usagePercent >= svc.threshold && svc.status !== 'healthy') {
            alerts.push({
                service: svc.name,
                type: 'threshold_breach',
                severity: svc.status === 'critical' ? 'critical' : 'warning',
                message: `${svc.name} usage at ${svc.usagePercent}% of ${svc.limit} ${svc.unit} limit (threshold: ${svc.threshold}%)`,
            });
        }
    }

    // Check cost-to-revenue ratio
    if (snapshot.mrrForComparison > 0 && snapshot.costToRevenuePercent > 10) {
        alerts.push({
            service: 'Overall',
            type: 'budget_warning',
            severity: snapshot.costToRevenuePercent > 15 ? 'critical' : 'warning',
            message: `Infrastructure cost is ${snapshot.costToRevenuePercent}% of MRR ($${snapshot.totalEstimatedMonthlyCost} vs $${snapshot.mrrForComparison} MRR). Target: <5%`,
        });
    }

    // Compare with yesterday for anomalies
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];
        const prevResult = await db.execute({
            sql: `SELECT data FROM cost_snapshots WHERE date = ?`,
            args: [yesterdayKey],
        });
        if (prevResult.rows.length > 0) {
            const prev: CostSnapshot = JSON.parse(String(prevResult.rows[0].data));
            // Check for >30% cost increase day-over-day
            if (prev.totalEstimatedMonthlyCost > 0) {
                const increase = ((snapshot.totalEstimatedMonthlyCost - prev.totalEstimatedMonthlyCost) / prev.totalEstimatedMonthlyCost) * 100;
                if (increase > 30) {
                    alerts.push({
                        service: 'Overall',
                        type: 'cost_anomaly',
                        severity: 'critical',
                        message: `Estimated monthly cost spiked ${Math.round(increase)}% vs yesterday ($${snapshot.totalEstimatedMonthlyCost} vs $${prev.totalEstimatedMonthlyCost})`,
                    });
                }
            }
        }
    } catch {
        // No previous data — skip comparison
    }

    // Check OpenAI specifically — largest variable cost
    const openai = services.find(s => s.name === 'OpenAI');
    if (openai && openai.estimatedMonthlyCost > 75) {
        alerts.push({
            service: 'OpenAI',
            type: 'budget_warning',
            severity: openai.estimatedMonthlyCost > 150 ? 'critical' : 'warning',
            message: `OpenAI estimated spend: $${openai.estimatedMonthlyCost}/mo. Consider caching prompts or switching low-complexity tasks to open-source models.`,
            actionTaken: 'Logged for review',
        });
    }

    return alerts;
}

// ---- Report Generator ----

function generateCostReport(snapshot: CostSnapshot): string {
    const lines: string[] = [
        `🛡️ Cost Guardian Daily Report — ${snapshot.date}`,
        ``,
        `## Service Usage`,
    ];

    const statusEmoji = { healthy: '🟢', warning: '🟡', critical: '🔴' };
    for (const svc of snapshot.services) {
        const emoji = statusEmoji[svc.status];
        lines.push(
            `${emoji} **${svc.name}** (${svc.plan}): ${svc.currentUsage.toLocaleString()} / ${svc.limit.toLocaleString()} ${svc.unit} (${svc.usagePercent}%) — est. $${svc.estimatedMonthlyCost}/mo`
        );
    }

    lines.push(``, `## Cost Summary`);
    lines.push(`- Total estimated monthly cost: **$${snapshot.totalEstimatedMonthlyCost}**`);
    if (snapshot.mrrForComparison > 0) {
        lines.push(`- MRR: $${snapshot.mrrForComparison}`);
        lines.push(`- Cost/Revenue ratio: ${snapshot.costToRevenuePercent}% (target: <5%)`);
    }

    if (snapshot.alerts.length > 0) {
        lines.push(``, `## ⚡ Alerts (${snapshot.alerts.length})`);
        for (const alert of snapshot.alerts) {
            const sev = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : 'ℹ️';
            lines.push(`${sev} [${alert.service}] ${alert.message}`);
            if (alert.actionTaken) lines.push(`   → Action: ${alert.actionTaken}`);
        }
    } else {
        lines.push(``, `✅ No cost alerts — all services within budget.`);
    }

    if (snapshot.guardrailActions.length > 0) {
        lines.push(``, `## 🛡️ Guardrail Actions (${snapshot.guardrailActions.length})`);
        for (const g of snapshot.guardrailActions) {
            lines.push(`- **${g.guardrail}**: ${g.action} — ${g.details}`);
        }
    }

    return lines.join('\n');
}

// ---- Snapshot Storage ----

async function saveSnapshot(snapshot: CostSnapshot, db: Client): Promise<void> {
    await db.execute({
        sql: `INSERT INTO cost_snapshots (date, data) VALUES (?, ?)
              ON CONFLICT(date) DO UPDATE SET data = ?, created_at = datetime('now')`,
        args: [snapshot.date, JSON.stringify(snapshot), JSON.stringify(snapshot)],
    });
}

async function saveAlerts(alerts: CostAlert[], date: string, db: Client): Promise<void> {
    for (const alert of alerts) {
        await db.execute({
            sql: `INSERT INTO cost_alerts (date, service, alert_type, severity, message, action_taken)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [date, alert.service, alert.type, alert.severity, alert.message, alert.actionTaken ?? null],
        });
    }
}

async function saveGuardrailLog(actions: GuardrailAction[], date: string, db: Client): Promise<void> {
    for (const action of actions) {
        await db.execute({
            sql: `INSERT INTO cost_guardrail_log (date, guardrail, action, details) VALUES (?, ?, ?, ?)`,
            args: [date, action.guardrail, action.action, action.details],
        });
    }
}

// ---- Main Agent Entrypoint ----

export async function runCostGuardianAgent(): Promise<{
    snapshot: CostSnapshot;
    report: string;
}> {
    console.log('[cost-guardian] Starting daily cost monitoring...');

    const db = await ensureCostSchema();
    const today = new Date().toISOString().split('T')[0];

    // 1. Measure all services
    const [turso, openai, clerk, resend, rateLimits, stripe] = await Promise.all([
        measureTurso(db),
        measureOpenAI(db),
        measureClerk(),
        measureResend(db),
        measureRateLimits(db),
        measureStripe(),
    ]);

    const services = [turso, openai, clerk, resend, stripe, rateLimits];
    const totalEstimatedMonthlyCost = Math.round(
        services.reduce((sum, s) => sum + s.estimatedMonthlyCost, 0) * 100
    ) / 100;

    // 2. Get MRR for cost/revenue comparison
    let mrr = 0;
    try {
        const metricsResult = await db.execute({
            sql: `SELECT data FROM daily_metrics ORDER BY date DESC LIMIT 1`,
            args: [],
        });
        if (metricsResult.rows.length > 0) {
            const metrics = JSON.parse(String(metricsResult.rows[0].data));
            mrr = metrics.mrr ?? 0;
        }
    } catch {
        // Analytics table may not exist yet
    }

    const costToRevenuePercent = mrr > 0 ? Math.round((totalEstimatedMonthlyCost / mrr) * 100) : 0;

    // 3. Build initial snapshot
    const snapshot: CostSnapshot = {
        date: today,
        services,
        totalEstimatedMonthlyCost,
        mrrForComparison: mrr,
        costToRevenuePercent,
        alerts: [],
        guardrailActions: [],
    };

    // 4. Detect alerts
    snapshot.alerts = await detectCostAlerts(services, snapshot, db);

    // 5. Enforce guardrails
    snapshot.guardrailActions = await enforceGuardrails(services, db);

    // 6. Generate report
    const report = generateCostReport(snapshot);

    // 7. Persist everything
    await saveSnapshot(snapshot, db);
    if (snapshot.alerts.length > 0) {
        await saveAlerts(snapshot.alerts, today, db);
    }
    if (snapshot.guardrailActions.length > 0) {
        await saveGuardrailLog(snapshot.guardrailActions, today, db);
    }

    console.log('[cost-guardian] Snapshot saved for', today);
    console.log(`[cost-guardian] ${snapshot.alerts.length} alerts, ${snapshot.guardrailActions.length} guardrail actions`);

    return { snapshot, report };
}
