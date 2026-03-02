import { NextRequest, NextResponse } from 'next/server';
import { runCommunityAgent } from '@/lib/agents/community/community-agent';

export const maxDuration = 60;

// GET /api/agents/community — Run community agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const report = await runCommunityAgent();
        return NextResponse.json({ success: true, ...report });
    } catch (error) {
        console.error('[community-cron] Failed:', error);
        return NextResponse.json({
            error: 'Community agent failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
