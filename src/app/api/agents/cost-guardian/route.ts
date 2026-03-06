import { NextRequest, NextResponse } from 'next/server';
import { runCostGuardianAgent } from '@/lib/agents/cost-guardian/cost-guardian-agent';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { getAgentEnabled } from '@/lib/agents/schedule';

export const maxDuration = 60;

// GET /api/agents/cost-guardian — Run cost guardian agent (called by Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await getAgentEnabled('cost-guardian');
    if (!enabled) {
        return NextResponse.json({ success: true, skipped: true, reason: 'Agent disabled via admin' });
    }

    const runId = await logAgentStart('cost-guardian', 'Cost Guardian');

    try {
        const { snapshot, report } = await runCostGuardianAgent();
        await logAgentComplete(runId, {
            status: snapshot.alerts.length > 0 ? 'warning' : 'success',
            summary: `$${snapshot.totalEstimatedMonthlyCost}/mo, ${snapshot.alerts.length} alerts`,
            alertsCount: snapshot.alerts.length,
        });

        return NextResponse.json({
            success: true,
            date: snapshot.date,
            totalEstimatedMonthlyCost: snapshot.totalEstimatedMonthlyCost,
            costToRevenuePercent: snapshot.costToRevenuePercent,
            alertCount: snapshot.alerts.length,
            guardrailActions: snapshot.guardrailActions.length,
            services: snapshot.services.map(s => ({
                name: s.name, status: s.status, usagePercent: s.usagePercent, estimatedCost: s.estimatedMonthlyCost,
            })),
            report,
        });
    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Cost guardian failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'cost-guardian', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[cost-guardian-cron] Failed:', error);
        return NextResponse.json({ error: 'Cost guardian agent failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
