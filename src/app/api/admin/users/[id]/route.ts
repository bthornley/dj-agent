import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { dbGetUserStats, dbGetAllEvents, dbGetAllLeads, dbGetAllSocialPosts, dbGetBrandProfile } from '@/lib/db';
import { clerkClient } from '@clerk/nextjs/server';

// GET /api/admin/users/[id] — Get user detail with all data
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: userId } = await params;

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        // Get all user data from DB
        const [stats, events, leads, posts, brand] = await Promise.all([
            dbGetUserStats(userId),
            dbGetAllEvents(userId),
            dbGetAllLeads(userId),
            dbGetAllSocialPosts(userId),
            dbGetBrandProfile(userId),
        ]);

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                imageUrl: user.imageUrl,
                createdAt: user.createdAt,
                lastSignInAt: user.lastSignInAt,
                role: (user.publicMetadata as Record<string, unknown>)?.role || 'user',
                publicMetadata: user.publicMetadata,
            },
            stats,
            events: events.slice(0, 20), // Most recent 20
            leads: leads.slice(0, 20),
            posts: posts.slice(0, 20),
            brand,
        });
    } catch (err) {
        console.error('Admin user detail error:', err);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

// PATCH /api/admin/users/[id] — Update user metadata
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: userId } = await params;
    const body = await request.json();

    try {
        const client = await clerkClient();

        if (body.role !== undefined) {
            await client.users.updateUserMetadata(userId, {
                publicMetadata: { role: body.role },
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Admin user update error:', err);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
