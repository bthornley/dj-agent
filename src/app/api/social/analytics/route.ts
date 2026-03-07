import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetAllSocialPosts } from '@/lib/db';
import { generateWeeklyReport, StatsInput } from '@/lib/agent/social/analytics';

// GET /api/social/analytics — Get mock analytics report for the dashboard
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const postResult = await dbGetAllSocialPosts(userId); const posts = postResult.data;
        const postCount = posts.filter(p => p.status === 'posted').length;

        const stats: StatsInput = {
            reach: 14520 + (postCount * 1200),
            impressions: 22100 + (postCount * 1800),
            saves: 142 + (postCount * 8),
            shares: 89 + (postCount * 5),
            comments: 45 + (postCount * 4),
            followerGrowth: 18 + (postCount * 2),
            profileVisits: 312 + (postCount * 25),
            linkClicks: 24 + (postCount * 2),
            topPostIds: posts.filter(p => p.status === 'posted').slice(0, 2).map(p => p.id)
        };

        const now = new Date();
        const monday = new Date(now);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

        const report = generateWeeklyReport(monday.toISOString().split('T')[0], stats, posts);
        return NextResponse.json({ report });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}

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
    const postResult = await dbGetAllSocialPosts(userId); const posts = postResult.data;

    const report = generateWeeklyReport(weekOf, stats, posts, previousReport);
    return NextResponse.json({ report }, { status: 201 });
}
