import { NextRequest, NextResponse } from 'next/server';
import { runContentMarketingAgent, getContentQueue } from '@/lib/agents/content/content-marketing';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60;

// GET /api/agents/content-marketing — Run content agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await getAgentEnabled('content-marketing');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('content-marketing', 'Content Marketing');

    try {
        const result = await runContentMarketingAgent();
        await logAgentComplete(runId, { status: 'success', summary: 'Content queue updated', actionsCount: 1 });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Content marketing failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'content-marketing', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[content-marketing-cron] Failed:', error);
        return NextResponse.json({ error: 'Content marketing agent failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

// POST /api/agents/content-marketing — Get content queue
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const queue = await getContentQueue(body.status);
        return NextResponse.json({ queue });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
