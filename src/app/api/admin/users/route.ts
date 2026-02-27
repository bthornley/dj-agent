import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { dbGetPlatformStats, dbGetUserStats } from '@/lib/db';
import { clerkClient } from '@clerk/nextjs/server';

// GET /api/admin/users — List all users with stats
export async function GET(request: NextRequest) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const client = await clerkClient();

        // Build params — only include query if search is non-empty
        const listParams: Parameters<typeof client.users.getUserList>[0] = {
            limit,
            offset: (page - 1) * limit,
            orderBy: '-created_at',
        };
        if (search.trim()) {
            listParams.query = search.trim();
        }

        // Get users from Clerk
        const clerkUsers = await client.users.getUserList(listParams);

        // Get DB stats for platform user IDs
        let dbUserIds = new Set<string>();
        try {
            const platformStats = await dbGetPlatformStats();
            dbUserIds = new Set(platformStats.uniqueUserIds);
        } catch (dbErr) {
            console.error('DB stats error (non-fatal):', dbErr);
        }

        // Build user list with stats
        const users = await Promise.all(
            clerkUsers.data.map(async (user) => {
                const hasDbData = dbUserIds.has(user.id);
                let stats = { events: 0, leads: 0, posts: 0, plans: 0, mediaAssets: 0, hasBrand: false };

                if (hasDbData) {
                    try {
                        stats = await dbGetUserStats(user.id);
                    } catch (e) {
                        console.error('User stats error:', e);
                    }
                }

                return {
                    id: user.id,
                    email: user.emailAddresses[0]?.emailAddress || '',
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    imageUrl: user.imageUrl,
                    createdAt: user.createdAt,
                    lastSignInAt: user.lastSignInAt,
                    role: (user.publicMetadata as Record<string, unknown>)?.role || 'user',
                    planId: (user.publicMetadata as Record<string, unknown>)?.planId || 'free',
                    stats,
                };
            })
        );

        return NextResponse.json({
            users,
            total: clerkUsers.totalCount,
            page,
            limit,
        });
    } catch (err) {
        console.error('Admin users list error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to fetch users', detail: message }, { status: 500 });
    }
}
