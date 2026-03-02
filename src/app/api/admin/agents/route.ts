import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getSnapshot, getRecentSnapshots, generateWeeklyInvestorUpdate } from '@/lib/agents/analytics/analytics-agent';
import { getInvestors, getPipelineSummary } from '@/lib/agents/fundraising/investor-pipeline';
import { getContentQueue } from '@/lib/agents/content/content-marketing';

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
