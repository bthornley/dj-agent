import { NextRequest, NextResponse } from 'next/server';
import { runGrowthOpsAgent, getFunnelMetrics } from '@/lib/agents/growth/growth-ops';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60;

// GET /api/agents/growth-ops — Run growth ops agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await getAgentEnabled('growth-ops');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('growth-ops', 'Growth Ops');

    try {
        const result = await runGrowthOpsAgent();
        await logAgentComplete(runId, {
            status: 'success',
            summary: `${result.newUsers} new users, ${result.growthTasks} tasks generated`,
            actionsCount: result.growthTasks,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Growth ops failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'growth-ops', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[growth-ops-cron] Failed:', error);
        return NextResponse.json({ error: 'Growth ops agent failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

// POST /api/agents/growth-ops — Manual operations (funnel check, etc.)
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        if (body.action === 'funnel') {
            const funnel = await getFunnelMetrics();
            return NextResponse.json({ funnel });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
