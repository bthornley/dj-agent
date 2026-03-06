import { NextRequest, NextResponse } from 'next/server';
import { runEducationOutreachAgent } from '@/lib/agents/education/education-outreach';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60;

// GET /api/agents/education-outreach — Run education outreach agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if agent is enabled
    const enabled = await getAgentEnabled('education-outreach');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('education-outreach', 'Education Outreach');

    try {
        const result = await runEducationOutreachAgent();
        await logAgentComplete(runId, {
            status: 'success',
            summary: `Discovered ${result.newSchools} schools, contacted ${result.outreach.contacted}`,
            actionsCount: result.outreach.contacted,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        await logAgentComplete(runId, {
            status: 'failed',
            summary: 'Education outreach agent failed',
            error: error instanceof Error ? error.message : String(error),
        });
        await logAgentError({
            agentName: 'education-outreach',
            error: error instanceof Error ? error : String(error),
            context: 'Vercel Cron',
            severity: 'error',
        });
        console.error('[education-outreach-cron] Failed:', error);
        return NextResponse.json({
            error: 'Education outreach agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
