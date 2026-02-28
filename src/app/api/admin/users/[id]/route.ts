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

        // Get all user data from DB — each wrapped independently
        const stats = await dbGetUserStats(userId).catch(() => ({
            events: 0, leads: 0, posts: 0, plans: 0, mediaAssets: 0, hasBrand: false,
        }));
        const events = await dbGetAllEvents(userId).catch(() => []);
        const leads = await dbGetAllLeads(userId).catch(() => []);
        const posts = await dbGetAllSocialPosts(userId).catch(() => []);
        const brand = await dbGetBrandProfile(userId).catch(() => null);

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
            events: (events || []).slice(0, 20),
            leads: (leads || []).slice(0, 20),
            posts: (posts || []).slice(0, 20),
            brand,
        });
    } catch (err) {
        console.error('Admin user detail error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to fetch user', detail: message }, { status: 500 });
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

        if (body.planId !== undefined) {
            const validPlans = ['free', 'pro', 'unlimited', 'agency'];
            if (!validPlans.includes(body.planId)) {
                return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
            }
            await client.users.updateUserMetadata(userId, {
                publicMetadata: { planId: body.planId },
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Admin user update error:', err);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
