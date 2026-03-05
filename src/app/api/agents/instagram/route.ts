import { NextRequest, NextResponse } from 'next/server';
import { runInstagramAgent, getPostQueue, updatePost, deletePost, generatePosts } from '@/lib/agents/instagram/instagram-agent';

export const maxDuration = 60;

// GET /api/agents/instagram — Run Instagram brand agent (Vercel Cron)
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const report = await runInstagramAgent();
        return NextResponse.json({ success: true, ...report });
    } catch (error) {
        console.error('[ig-agent-cron] Failed:', error);
        return NextResponse.json({ error: 'Instagram agent run failed' }, { status: 500 });
    }
}

// POST /api/agents/instagram — Manage posts (admin)
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    try {
        switch (action) {
            case 'generate': {
                const posts = await generatePosts(body.count || 3);
                return NextResponse.json({ success: true, posts });
            }
            case 'queue': {
                const posts = await getPostQueue(body.status, body.limit);
                return NextResponse.json({ success: true, posts });
            }
            case 'update': {
                await updatePost(body.id, body.updates);
                return NextResponse.json({ success: true });
            }
            case 'delete': {
                await deletePost(body.id);
                return NextResponse.json({ success: true });
            }
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error) {
        console.error('[ig-agent-api] Failed:', error);
        return NextResponse.json({ error: 'Action failed' }, { status: 500 });
    }
}
