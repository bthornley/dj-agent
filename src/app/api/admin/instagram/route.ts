import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { runInstagramAgent, getPostQueue, updatePost, deletePost, generatePosts } from '@/lib/agents/instagram/instagram-agent';

export const maxDuration = 60;

// POST /api/admin/instagram — Admin-guarded Instagram agent actions
export async function POST(request: NextRequest) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { action } = body;

    try {
        switch (action) {
            case 'run': {
                const report = await runInstagramAgent();
                return NextResponse.json({ success: true, ...report });
            }
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
        console.error('[admin/instagram] Failed:', error);
        return NextResponse.json({
            error: 'Action failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
