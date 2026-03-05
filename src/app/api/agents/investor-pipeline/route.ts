import { NextRequest, NextResponse } from 'next/server';
import { runInvestorPipelineAgent, getInvestors, addInvestor, updateInvestorStatus, getPipelineSummary, InvestorStatus } from '@/lib/agents/fundraising/investor-pipeline';

export const maxDuration = 120; // Allow up to 2 min for scoring + drafting

// GET /api/agents/investor-pipeline — Run pipeline agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await runInvestorPipelineAgent();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('[investor-pipeline-cron] Failed:', error);
        return NextResponse.json({
            error: 'Investor outreach failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

// POST /api/agents/investor-pipeline — Add an investor manually
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        if (body.action === 'add') {
            const investor = await addInvestor({
                name: body.name || '',
                firm: body.firm || '',
                email: body.email || '',
                linkedin: body.linkedin || '',
                stage_preference: body.stage_preference || '',
                check_size: body.check_size || '',
                sectors: body.sectors || '',
                fit_score: 0,
                status: 'discovered',
                notes: body.notes || '',
                last_contacted: '',
            });
            return NextResponse.json({ success: true, investor });
        }

        if (body.action === 'update_status') {
            await updateInvestorStatus(body.id, body.status as InvestorStatus, body.notes);
            return NextResponse.json({ success: true });
        }

        if (body.action === 'list') {
            const investors = await getInvestors(body.status);
            const pipeline = await getPipelineSummary();
            return NextResponse.json({ investors, pipeline });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('[investor-pipeline] POST failed:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
