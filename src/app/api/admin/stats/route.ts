import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { clerkClient } from '@clerk/nextjs/server';
import { dbGetPlatformStats } from '@/lib/db';

// GET /api/admin/stats — Platform-wide statistics
export async function GET() {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const stats = await dbGetPlatformStats();

    // Get real user count from Clerk (not just users with DB activity)
    let totalUsers = stats.uniqueUserIds.length;
    try {
        const client = await clerkClient();
        const count = await client.users.getCount();
        if (count > 0) totalUsers = count;
    } catch (e) {
        console.error('[admin/stats] Clerk user count failed:', e);
    }

    return NextResponse.json({
        totalUsers,
        totalEvents: stats.totalEvents,
        totalLeads: stats.totalLeads,
        totalPosts: stats.totalPosts,
        totalPlans: stats.totalPlans,
        totalMediaAssets: stats.totalMediaAssets,
    });
}

