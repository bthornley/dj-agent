import { NextRequest, NextResponse } from 'next/server';
import { runCustomerSuccessAgent, findUpgradeCandidates } from '@/lib/agents/customer-success/customer-success';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60;

// GET /api/agents/customer-success — Run CS agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await getAgentEnabled('customer-success');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('customer-success', 'Customer Success');

    try {
        const report = await runCustomerSuccessAgent();
        const upgradeCandidates = await findUpgradeCandidates();
        await logAgentComplete(runId, {
            status: 'success',
            summary: `${upgradeCandidates.length} upgrade candidates found`,
            actionsCount: upgradeCandidates.length,
        });
        return NextResponse.json({ success: true, report, upgradeCandidates });
    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Customer success failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'customer-success', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[customer-success-cron] Failed:', error);
        return NextResponse.json({ error: 'Customer success agent failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
