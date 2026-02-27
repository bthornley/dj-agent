import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetAllSocialPosts, dbGetSocialPost, dbSaveSocialPost, dbDeleteSocialPost, dbGetPostStats } from '@/lib/db';
import { checkPostGuardrails } from '@/lib/agent/social/guardrails';
import { dbGetAllEvents } from '@/lib/db';
import { dbGetBrandProfile } from '@/lib/db';
import { SocialPost } from '@/lib/types';

// GET /api/social/posts — List posts (filterable)
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const pillar = searchParams.get('pillar') || undefined;
    const postType = searchParams.get('postType') || undefined;
    const planId = searchParams.get('planId') || undefined;
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
        const stats = await dbGetPostStats(userId);
        return NextResponse.json(stats);
    }

    const posts = await dbGetAllSocialPosts(userId, { status, pillar, postType, planId });
    return NextResponse.json(posts);
}

// POST /api/social/posts — Create or update a post
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const post: SocialPost = await request.json();
    if (!post.id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 });

    await dbSaveSocialPost(post, userId);
    return NextResponse.json({ success: true, post }, { status: 201 });
}

// PATCH /api/social/posts — Approve, reject, or update status
export async function PATCH(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, caption, hookText, hashtags } = await request.json();
    if (!id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 });

    const post = await dbGetSocialPost(id, userId);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // Update fields
    if (status) post.status = status;
    if (caption !== undefined) post.caption = caption;
    if (hookText !== undefined) post.hookText = hookText;
    if (hashtags !== undefined) post.hashtags = hashtags;
    post.updatedAt = new Date().toISOString();

    // Run guardrails on approval
    if (status === 'approved') {
        const events = await dbGetAllEvents(userId);
        const brand = await dbGetBrandProfile(userId);
        const guardrails = checkPostGuardrails(post, brand, events);
        if (!guardrails.passed) {
            return NextResponse.json({
                error: 'Guardrail check failed',
                blockers: guardrails.blockers,
                warnings: guardrails.warnings,
            }, { status: 422 });
        }
    }

    await dbSaveSocialPost(post, userId);
    return NextResponse.json({ success: true, post });
}

// DELETE /api/social/posts — Delete a post
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 });

    await dbDeleteSocialPost(id, userId);
    return NextResponse.json({ success: true });
}
