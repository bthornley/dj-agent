import { NextRequest, NextResponse } from 'next/server';
import { runAnalyticsAgent, getRecentSnapshots, generateWeeklyInvestorUpdate } from '@/lib/agents/analytics/analytics-agent';

export const maxDuration = 60; // Allow up to 60s for Stripe + Clerk API calls

// GET /api/agents/analytics — Run analytics agent (called by Vercel Cron)
export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { metrics, alerts, report } = await runAnalyticsAgent();

        // On Sundays, also generate the weekly investor update
        const isWeekly = new Date().getDay() === 0;
        let weeklyUpdate: string | undefined;
        if (isWeekly) {
            const snapshots = await getRecentSnapshots(7);
            weeklyUpdate = generateWeeklyInvestorUpdate(snapshots);
        }

        return NextResponse.json({
            success: true,
            date: metrics.date,
            metrics,
            alerts,
            report,
            weeklyUpdate,
        });
    } catch (error) {
        console.error('[analytics-cron] Failed:', error);
        return NextResponse.json({
            error: 'Analytics agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
