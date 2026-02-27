import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetAllSocialPosts } from '@/lib/db';
import { generateWeeklyReport, StatsInput } from '@/lib/agent/social/analytics';

// POST /api/social/analytics — Submit weekly stats and get report
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { weekOf, stats, previousReport } = body as {
        weekOf: string;
        stats: StatsInput;
        previousReport?: ReturnType<typeof generateWeeklyReport> | null;
    };

    if (!weekOf || !stats) {
        return NextResponse.json({ error: 'weekOf and stats are required' }, { status: 400 });
    }

    // Get posts for context
    const posts = await dbGetAllSocialPosts(userId);

    const report = generateWeeklyReport(weekOf, stats, posts, previousReport);
    return NextResponse.json({ report }, { status: 201 });
}
