import { NextRequest, NextResponse } from 'next/server';
import { runQAAgent } from '@/lib/agents/qa/qa-agent';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60;

// GET /api/agents/qa — Run QA agent (called by Vercel Cron or manually from admin)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await getAgentEnabled('qa');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('qa', 'QA Agent');

    try {
        const { report, formatted } = await runQAAgent();
        await logAgentComplete(runId, {
            status: report.failCount > 0 ? 'warning' : 'success',
            summary: `${report.passCount} pass, ${report.failCount} fail, ${report.warnCount} warn`,
            alertsCount: report.failCount + report.warnCount,
        });

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
        await logAgentComplete(runId, {
            status: 'failed',
            summary: 'QA agent failed',
            error: error instanceof Error ? error.message : String(error),
        });
        await logAgentError({ agentName: 'qa', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[qa-cron] Failed:', error);
        return NextResponse.json({
            error: 'QA agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
