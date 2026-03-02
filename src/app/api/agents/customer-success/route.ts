import { NextRequest, NextResponse } from 'next/server';
import { runCustomerSuccessAgent, findUpgradeCandidates } from '@/lib/agents/customer-success/customer-success';

export const maxDuration = 60;

// GET /api/agents/customer-success — Run CS agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const report = await runCustomerSuccessAgent();
        const upgradeCandidates = await findUpgradeCandidates();

        return NextResponse.json({
            success: true,
            report,
            upgradeCandidates,
        });
    } catch (error) {
        console.error('[customer-success-cron] Failed:', error);
        return NextResponse.json({
            error: 'Customer success agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
