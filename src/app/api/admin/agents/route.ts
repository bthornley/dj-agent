import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getSnapshot, getRecentSnapshots, generateWeeklyInvestorUpdate, runAnalyticsAgent } from '@/lib/agents/analytics/analytics-agent';
import { getInvestors, getPipelineSummary, runInvestorPipelineAgent } from '@/lib/agents/fundraising/investor-pipeline';
import { getContentQueue, runContentMarketingAgent } from '@/lib/agents/content/content-marketing';
import { runGrowthOpsAgent } from '@/lib/agents/growth/growth-ops';
import { runCustomerSuccessAgent } from '@/lib/agents/customer-success/customer-success';
import { runCommunityAgent } from '@/lib/agents/community/community-agent';
import { runInstagramAgent } from '@/lib/agents/instagram/instagram-agent';

export const maxDuration = 120;

// GET /api/admin/agents — Aggregated agent dashboard data
export async function GET() {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const today = new Date().toISOString().split('T')[0];

    // Analytics: latest snapshot + recent history
    let analytics = null;
    let history: Array<{ date: string; mrr: number; users: number }> = [];
    try {
        analytics = await getSnapshot(today);
        // If no snapshot today, try yesterday
        if (!analytics) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            analytics = await getSnapshot(yesterday);
        }
        const recent = await getRecentSnapshots(7);
        history = recent.map(s => ({ date: s.date, mrr: s.mrr, users: s.totalUsers }));
    } catch (e) { console.error('[admin/agents] analytics:', e); }

    // Investor Pipeline
    let pipeline = null;
    let investors: Array<{ name: string; firm: string; fit_score: number; status: string }> = [];
    try {
        pipeline = await getPipelineSummary();
        const allInvestors = await getInvestors();
        investors = allInvestors.slice(0, 20).map(i => ({
            name: i.name, firm: i.firm, fit_score: i.fit_score, status: i.status,
        }));
    } catch (e) { console.error('[admin/agents] investor:', e); }

    // Content queue
    let contentQueue: Array<{ title: string; content_type: string; platform: string; status: string }> = [];
    try {
        const queue = await getContentQueue();
        contentQueue = queue.slice(0, 10).map(c => ({
            title: c.title, content_type: c.content_type, platform: c.platform, status: c.status,
        }));
    } catch (e) { console.error('[admin/agents] content:', e); }

    // Weekly investor update
    let weeklyUpdate = null;
    try {
        const snaps = await getRecentSnapshots(7);
        if (snaps.length > 0) weeklyUpdate = generateWeeklyInvestorUpdate(snaps);
    } catch (e) { console.error('[admin/agents] weekly:', e); }

    return NextResponse.json({
        analytics,
        history,
        pipeline,
        investors,
        contentQueue,
        weeklyUpdate,
    });
}

// POST /api/admin/agents — Trigger an agent run (admin auth, no CRON_SECRET needed)
export async function POST(request: NextRequest) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    try {
        const { agentId } = await request.json();

        const runners: Record<string, () => Promise<unknown>> = {
            'analytics': runAnalyticsAgent,
            'growth-ops': runGrowthOpsAgent,
            'customer-success': runCustomerSuccessAgent,
            'investor-pipeline': runInvestorPipelineAgent,
            'content-marketing': runContentMarketingAgent,
            'community': runCommunityAgent,
            'instagram': runInstagramAgent,
        };

        const runner = runners[agentId];
        if (!runner) {
            return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 400 });
        }

        const result = await runner();
        return NextResponse.json({ success: true, agentId, result });
    } catch (error) {
        console.error('[admin/agents] run failed:', error);
        return NextResponse.json({
            error: 'Agent run failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
