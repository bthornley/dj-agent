import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetSocialPost, dbSaveSocialPost, dbGetBrandProfile, dbGetAllEvents } from '@/lib/db';
import { pushDraftToAllPlatforms } from '@/lib/agent/social/platforms';
import { checkPostGuardrails } from '@/lib/agent/social/guardrails';

// POST /api/social/publish — Push an approved post as draft to connected platforms
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId } = await request.json();
    if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

    // Get the post
    const post = await dbGetSocialPost(postId, userId);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // Must be approved before pushing
    if (post.status !== 'approved') {
        return NextResponse.json({ error: 'Post must be approved before publishing. Current status: ' + post.status }, { status: 422 });
    }

    // Get brand profile for connected accounts
    const brand = await dbGetBrandProfile(userId);
    if (!brand || !brand.connectedAccounts?.length) {
        return NextResponse.json({ error: 'No connected accounts. Add your social profiles in Brand Setup.' }, { status: 422 });
    }

    // Run guardrails one final time
    const events = await dbGetAllEvents(userId);
    const guardrails = checkPostGuardrails(post, brand, events);
    if (!guardrails.passed) {
        return NextResponse.json({
            error: 'Guardrail check failed',
            blockers: guardrails.blockers,
            warnings: guardrails.warnings,
        }, { status: 422 });
    }

    // Push to platforms
    const results = await pushDraftToAllPlatforms(post, brand.connectedAccounts);

    // Update post status if any succeeded
    const anySuccess = results.some(r => r.success);
    if (anySuccess) {
        post.status = 'scheduled'; // Mark as pushed/scheduled
        post.notes = (post.notes || '') + '\n\n📤 Draft pushed to: ' + results.filter(r => r.success).map(r => r.platform).join(', ');
        post.updatedAt = new Date().toISOString();
        await dbSaveSocialPost(post, userId);
    }

    return NextResponse.json({
        success: anySuccess,
        results,
        post,
    });
}
