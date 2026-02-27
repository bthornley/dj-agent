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

        // Get users from Clerk
        const clerkUsers = await client.users.getUserList({
            limit,
            offset: (page - 1) * limit,
            query: search || undefined,
            orderBy: '-created_at',
        });

        // Get DB stats for platform user IDs
        const platformStats = await dbGetPlatformStats();
        const dbUserIds = new Set(platformStats.uniqueUserIds);

        // Build user list with stats
        const users = await Promise.all(
            clerkUsers.data.map(async (user) => {
                const hasDbData = dbUserIds.has(user.id);
                let stats = { events: 0, leads: 0, posts: 0, plans: 0, mediaAssets: 0, hasBrand: false };

                if (hasDbData) {
                    stats = await dbGetUserStats(user.id);
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
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
