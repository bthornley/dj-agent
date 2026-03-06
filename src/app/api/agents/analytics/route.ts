import { NextRequest, NextResponse } from 'next/server';
import { runAnalyticsAgent, getRecentSnapshots, generateWeeklyInvestorUpdate } from '@/lib/agents/analytics/analytics-agent';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60; // Allow up to 60s for Stripe + Clerk API calls

// GET /api/agents/analytics — Run analytics agent (called by Vercel Cron)
export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await getAgentEnabled('analytics');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('analytics', 'Analytics');

    try {
        const { metrics, alerts, report } = await runAnalyticsAgent();

        const isWeekly = new Date().getDay() === 0;
        let weeklyUpdate: string | undefined;
        if (isWeekly) {
            const snapshots = await getRecentSnapshots(7);
            weeklyUpdate = generateWeeklyInvestorUpdate(snapshots);
        }

        await logAgentComplete(runId, {
            status: alerts.length > 0 ? 'warning' : 'success',
            summary: `MRR: $${metrics.mrr}, Users: ${metrics.totalUsers}, ${alerts.length} alerts`,
            alertsCount: alerts.length,
        });

        return NextResponse.json({ success: true, date: metrics.date, metrics, alerts, report, weeklyUpdate });
    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Analytics failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'analytics', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[analytics-cron] Failed:', error);
        return NextResponse.json({ error: 'Analytics agent failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
