import { NextRequest, NextResponse } from 'next/server';
import { runCommunityAgent } from '@/lib/agents/community/community-agent';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60;

// GET /api/agents/community — Run community agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await getAgentEnabled('community');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('community', 'Community');

    try {
        const report = await runCommunityAgent();
        await logAgentComplete(runId, { status: 'success', summary: 'Community engagement tracked', actionsCount: 1 });
        return NextResponse.json({ success: true, ...report });
    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Community agent failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'community', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[community-cron] Failed:', error);
        return NextResponse.json({ error: 'Community agent failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
