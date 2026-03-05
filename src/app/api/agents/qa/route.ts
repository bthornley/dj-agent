import { NextRequest, NextResponse } from 'next/server';
import { runQAAgent } from '@/lib/agents/qa/qa-agent';

export const maxDuration = 60;

// GET /api/agents/qa — Run QA agent (called by Vercel Cron or manually from admin)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { report, formatted } = await runQAAgent();

        return NextResponse.json({
            success: true,
            date: report.date,
            overallStatus: report.overallStatus,
            passCount: report.passCount,
            failCount: report.failCount,
            warnCount: report.warnCount,
            totalDurationMs: report.totalDurationMs,
            checks: report.checks,
            report: formatted,
        });
    } catch (error) {
        console.error('[qa-cron] Failed:', error);
        return NextResponse.json({
            error: 'QA agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
