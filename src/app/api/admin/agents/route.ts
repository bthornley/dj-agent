import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getSnapshot, getRecentSnapshots, generateWeeklyInvestorUpdate, getCFOInsights, runAnalyticsAgent } from '@/lib/agents/analytics/analytics-agent';
import { getInvestors, getPipelineSummary, getOutreachDrafts, runInvestorPipelineAgent } from '@/lib/agents/fundraising/investor-pipeline';
import { getContentQueue, runContentMarketingAgent } from '@/lib/agents/content/content-marketing';
import { runGrowthOpsAgent, getGrowthTasks } from '@/lib/agents/growth/growth-ops';
import { runEducationOutreachAgent, getSchoolPipeline } from '@/lib/agents/education/education-outreach';
import { runCustomerSuccessAgent } from '@/lib/agents/customer-success/customer-success';
import { runCommunityAgent } from '@/lib/agents/community/community-agent';
import { runInstagramAgent } from '@/lib/agents/instagram/instagram-agent';
import { runCostGuardianAgent } from '@/lib/agents/cost-guardian/cost-guardian-agent';
import { runQAAgent } from '@/lib/agents/qa/qa-agent';
import { getRecentAgentRuns, getAgentRunStats, logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError, getRecentAgentErrors } from '@/lib/agents/error-log';

export const maxDuration = 120;

// GET /api/admin/agents — Aggregated agent dashboard data + run history
export async function GET() {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const today = new Date().toISOString().split('T')[0];

    // Analytics: latest snapshot + recent history
    let analytics = null;
    let history: Array<{ date: string; mrr: number; users: number }> = [];
    try {
        analytics = await getSnapshot(today);
        if (!analytics) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            analytics = await getSnapshot(yesterday);
        }
        const recent = await getRecentSnapshots(7);
        history = recent.map(s => ({ date: s.date, mrr: s.mrr, users: s.totalUsers }));
    } catch (e) { console.error('[admin/agents] analytics:', e); }

    // Investor Outreach
    let pipeline = null;
    let investors: Array<{ name: string; firm: string; email: string; linkedin: string; fit_score: number; status: string; last_contacted: string }> = [];
    let outreachDrafts: Awaited<ReturnType<typeof getOutreachDrafts>> = [];
    try {
        pipeline = await getPipelineSummary();
        const allInvestors = await getInvestors();
        investors = allInvestors.slice(0, 30).map(i => ({
            name: i.name, firm: i.firm, email: i.email, linkedin: i.linkedin,
            fit_score: i.fit_score, status: i.status, last_contacted: i.last_contacted,
        }));
        outreachDrafts = await getOutreachDrafts(20);
    } catch (e) { console.error('[admin/agents] investor:', e); }

    // Content queue
    let contentQueue: Array<{ id: string; title: string; content_type: string; platform: string; status: string; body: string }> = [];
    try {
        const queue = await getContentQueue();
        contentQueue = queue.slice(0, 10).map(c => ({
            id: c.id, title: c.title, content_type: c.content_type, platform: c.platform, status: c.status, body: c.body,
        }));
    } catch (e) { console.error('[admin/agents] content:', e); }

    // Growth tasks
    let growthTasks: Awaited<ReturnType<typeof getGrowthTasks>> = [];
    try {
        growthTasks = await getGrowthTasks(20);
    } catch (e) { console.error('[admin/agents] growth:', e); }

    // CFO Insights
    let cfoInsights: Awaited<ReturnType<typeof getCFOInsights>> = [];
    try {
        cfoInsights = await getCFOInsights(3);
    } catch (e) { console.error('[admin/agents] cfo:', e); }

    // School pipeline
    let schoolPipeline = null;
    try {
        schoolPipeline = await getSchoolPipeline();
    } catch (e) { console.error('[admin/agents] education:', e); }

    // Weekly investor update
    let weeklyUpdate = null;
    try {
        const snaps = await getRecentSnapshots(7);
        if (snaps.length > 0) weeklyUpdate = generateWeeklyInvestorUpdate(snaps);
    } catch (e) { console.error('[admin/agents] weekly:', e); }

    // Agent run history (last 50 runs)
    let agentRuns: Awaited<ReturnType<typeof getRecentAgentRuns>> = [];
    let agentStats: Awaited<ReturnType<typeof getAgentRunStats>> = {};
    try {
        agentRuns = await getRecentAgentRuns(50);
        agentStats = await getAgentRunStats();
    } catch (e) { console.error('[admin/agents] run history:', e); }

    return NextResponse.json({
        analytics,
        history,
        pipeline,
        investors,
        outreachDrafts,
        contentQueue,
        growthTasks,
        cfoInsights,
        schoolPipeline,
        weeklyUpdate,
        agentRuns,
        agentStats,
        agentErrors: await getRecentAgentErrors(10),
    });
}

// POST /api/admin/agents — Trigger an agent run with logging
export async function POST(request: NextRequest) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    try {
        const { agentId } = await request.json();

        const agentMap: Record<string, { name: string; run: () => Promise<unknown> }> = {
            'qa': { name: 'QA Agent', run: runQAAgent },
            'cost-guardian': { name: 'Cost Guardian', run: runCostGuardianAgent },
            'analytics': { name: 'Analytics', run: runAnalyticsAgent },
            'growth-ops': { name: 'Growth Ops', run: runGrowthOpsAgent },
            'customer-success': { name: 'Customer Success', run: runCustomerSuccessAgent },
            'investor-pipeline': { name: 'Investor Outreach', run: runInvestorPipelineAgent },
            'content-marketing': { name: 'Content Marketing', run: runContentMarketingAgent },
            'community': { name: 'Community', run: runCommunityAgent },
            'instagram': { name: 'Instagram', run: runInstagramAgent },
            'education-outreach': { name: 'Education Outreach', run: runEducationOutreachAgent },
        };

        const agent = agentMap[agentId];
        if (!agent) {
            return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 400 });
        }

        // Log the run
        const runId = await logAgentStart(agentId, agent.name);

        try {
            const result = await agent.run();
            const summary = extractSummary(agentId, result);
            await logAgentComplete(runId, {
                status: summary.hasAlerts ? 'warning' : 'success',
                summary: summary.text,
                alertsCount: summary.alertsCount,
                actionsCount: summary.actionsCount,
            });
            return NextResponse.json({ success: true, agentId, result });
        } catch (error) {
            await logAgentComplete(runId, {
                status: 'failed',
                summary: 'Agent run failed',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    } catch (error) {
        console.error('[admin/agents] run failed:', error);
        await logAgentError({
            agentName: 'unknown',
            error: error instanceof Error ? error : String(error),
            context: 'POST /api/admin/agents',
            severity: 'error',
        });
        return NextResponse.json({
            error: 'Agent run failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

function extractSummary(agentId: string, result: unknown): {
    text: string; hasAlerts: boolean; alertsCount: number; actionsCount: number;
} {
    const r = result as Record<string, unknown>;

    switch (agentId) {
        case 'qa': {
            const report = r?.report as Record<string, unknown> | undefined;
            return {
                text: `QA: ${report?.passCount ?? 0} passed, ${report?.failCount ?? 0} failed, ${report?.warnCount ?? 0} warnings`,
                hasAlerts: (Number(report?.failCount) || 0) > 0,
                alertsCount: (Number(report?.failCount) || 0) + (Number(report?.warnCount) || 0),
                actionsCount: Number(report?.passCount) || 0,
            };
        }
        case 'cost-guardian': {
            const snapshot = r?.snapshot as Record<string, unknown> | undefined;
            const alerts = (snapshot?.alerts as Array<unknown>) ?? [];
            const actions = (snapshot?.guardrailActions as Array<unknown>) ?? [];
            return {
                text: `Cost: $${snapshot?.totalEstimatedMonthlyCost ?? 0}/mo, ${alerts.length} alerts, ${actions.length} guardrail actions`,
                hasAlerts: alerts.length > 0,
                alertsCount: alerts.length,
                actionsCount: actions.length,
            };
        }
        case 'analytics': {
            const metrics = r?.metrics as Record<string, unknown> | undefined;
            const alerts = (r?.alerts as Array<unknown>) ?? [];
            return {
                text: `KPIs: ${metrics?.totalUsers ?? 0} users, $${metrics?.mrr ?? 0} MRR, ${alerts.length} anomalies`,
                hasAlerts: alerts.length > 0,
                alertsCount: alerts.length,
                actionsCount: 1,
            };
        }
        case 'growth-ops': {
            const tasks = Number(r?.growthTasks) || 0;
            const newUsers = Number(r?.newUsers) || 0;
            const onb = r?.onboarding as Record<string, number> | undefined;
            return {
                text: `Growth: ${newUsers} new users, ${onb?.activated ?? 0} activated, ${onb?.nudged ?? 0} nudged, ${tasks} tasks generated`,
                hasAlerts: (onb?.stalled ?? 0) > 5,
                alertsCount: onb?.stalled ?? 0,
                actionsCount: tasks + newUsers,
            };
        }
        case 'investor-pipeline': {
            const discoveries = Number(r?.newDiscoveries) || 0;
            const drafts = Number(r?.newDrafts) || 0;
            return {
                text: `Investor Outreach: ${discoveries} new leads discovered, ${drafts} emails drafted`,
                hasAlerts: false,
                alertsCount: 0,
                actionsCount: discoveries + drafts,
            };
        }
        case 'education-outreach': {
            const newSchools = Number(r?.newSchools) || 0;
            const out = r?.outreach as Record<string, number> | undefined;
            const pipe = r?.pipeline as Record<string, number> | undefined;
            return {
                text: `Education: ${newSchools} new schools, ${out?.contacted ?? 0} contacted, ${pipe?.total ?? 0} in pipeline`,
                hasAlerts: false,
                alertsCount: 0,
                actionsCount: newSchools + (out?.contacted ?? 0),
            };
        }
        default: {
            const alerts = (r?.alerts as Array<unknown>) ?? [];
            return {
                text: `Completed successfully`,
                hasAlerts: alerts.length > 0,
                alertsCount: alerts.length,
                actionsCount: 1,
            };
        }
    }
}
