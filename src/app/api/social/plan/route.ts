import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { dbGetLatestContentPlan, dbSaveContentPlan, dbGetAllEvents, dbGetBrandProfile, dbSaveSocialPost, dbGetAllSocialPosts, dbGetAllMediaAssets, dbDeleteSocialPost } from '@/lib/db';
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

    // Step 0: Delete all existing draft posts so queue only has current plan
    const existingPosts = await dbGetAllSocialPosts(userId);
    for (const p of existingPosts) {
        if (p.status === 'draft' || p.status === 'rejected') {
            await dbDeleteSocialPost(p.id, userId);
        }
    }

    // Gather inputs
    const events = await dbGetAllEvents(userId);
    const brand = await dbGetBrandProfile(userId);

    // Gather media sources — sorted newest first
    const mediaAssets = (await dbGetAllMediaAssets(userId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const allMedia = mediaAssets.filter(a => a.mediaType === 'image' || a.mediaType === 'video');

    // Get Google Photos album URL from profile
    let googlePhotosAlbumUrl = '';
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        googlePhotosAlbumUrl = (user.publicMetadata as Record<string, unknown>).googlePhotosAlbumUrl as string || '';
    } catch { /* ignore */ }

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

    // Step 3: Attach exactly 1 media per post (recency-weighted random)
    for (const post of allPosts) {
        if (allMedia.length > 0) {
            // Recency-weighted random: newer assets get higher weight
            // Weight decays linearly — index 0 (newest) gets highest weight
            const weights = allMedia.map((_, i) => Math.max(1, allMedia.length - i));
            const totalWeight = weights.reduce((s, w) => s + w, 0);
            let rand = Math.random() * totalWeight;
            let picked = 0;
            for (let i = 0; i < weights.length; i++) {
                rand -= weights[i];
                if (rand <= 0) { picked = i; break; }
            }
            post.mediaRefs = [allMedia[picked].url];
        } else if (googlePhotosAlbumUrl) {
            post.mediaRefs = [googlePhotosAlbumUrl];
        } else {
            post.mediaRefs = [];
        }
    }

    // Update plan with all post IDs (including B variants)
    plan.postIds = allPosts.map(p => p.id);

    // Step 4: Save everything
    await dbSaveContentPlan(plan, userId);
    for (const post of allPosts) {
        await dbSaveSocialPost(post, userId);
    }

    return NextResponse.json({ plan, posts: allPosts }, { status: 201 });
}
