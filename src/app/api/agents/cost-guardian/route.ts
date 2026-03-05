import { NextRequest, NextResponse } from 'next/server';
import { runCostGuardianAgent } from '@/lib/agents/cost-guardian/cost-guardian-agent';

export const maxDuration = 60;

// GET /api/agents/cost-guardian — Run cost guardian agent (called by Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { snapshot, report } = await runCostGuardianAgent();

        return NextResponse.json({
            success: true,
            date: snapshot.date,
            totalEstimatedMonthlyCost: snapshot.totalEstimatedMonthlyCost,
            costToRevenuePercent: snapshot.costToRevenuePercent,
            alertCount: snapshot.alerts.length,
            guardrailActions: snapshot.guardrailActions.length,
            services: snapshot.services.map(s => ({
                name: s.name,
                status: s.status,
                usagePercent: s.usagePercent,
                estimatedCost: s.estimatedMonthlyCost,
            })),
            report,
        });
    } catch (error) {
        console.error('[cost-guardian-cron] Failed:', error);
        return NextResponse.json({
            error: 'Cost guardian agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
