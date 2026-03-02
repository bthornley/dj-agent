import { NextRequest, NextResponse } from 'next/server';
import { runContentMarketingAgent, getContentQueue } from '@/lib/agents/content/content-marketing';

export const maxDuration = 60;

// GET /api/agents/content-marketing — Run content agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await runContentMarketingAgent();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('[content-marketing-cron] Failed:', error);
        return NextResponse.json({
            error: 'Content marketing agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
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
