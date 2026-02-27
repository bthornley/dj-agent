import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetLatestContentPlan, dbSaveContentPlan, dbGetAllEvents, dbGetBrandProfile, dbSaveSocialPost, dbGetAllSocialPosts } from '@/lib/db';
import { generateWeeklyPlan } from '@/lib/agent/social/strategy';
import { generatePostContent } from '@/lib/agent/social/content';

// GET /api/social/plan — Get latest content plan
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const plan = await dbGetLatestContentPlan(userId);
    if (!plan) return NextResponse.json(null);

    // Also fetch the posts for this plan
    const posts = await dbGetAllSocialPosts(userId, { planId: plan.id });
    return NextResponse.json({ plan, posts });
}

// POST /api/social/plan — Generate a new weekly plan
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const weekOf = body.weekOf; // optional override

    // Gather inputs
    const events = await dbGetAllEvents(userId);
    const brand = await dbGetBrandProfile(userId);

    // Step 1: Strategy Agent generates the plan + post shells
    const { plan, posts } = generateWeeklyPlan(events, brand, weekOf);

    // Step 2: Content Agent fills in each post shell
    const allPosts = [];
    for (const post of posts) {
        const event = post.eventId ? events.find(e => e.id === post.eventId) : null;
        const { variantA, variantB } = generatePostContent(post, brand, event);
        allPosts.push(variantA);
        // Only include B variant for reels and carousels (not stories)
        if (post.postType === 'reel' || post.postType === 'carousel') {
            allPosts.push(variantB);
        }
    }

    // Update plan with all post IDs (including B variants)
    plan.postIds = allPosts.map(p => p.id);

    // Step 3: Save everything
    await dbSaveContentPlan(plan, userId);
    for (const post of allPosts) {
        await dbSaveSocialPost(post, userId);
    }

    return NextResponse.json({ plan, posts: allPosts }, { status: 201 });
}
