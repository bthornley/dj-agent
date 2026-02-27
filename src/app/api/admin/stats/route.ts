import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { dbGetPlatformStats } from '@/lib/db';

// GET /api/admin/stats — Platform-wide statistics
export async function GET() {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const stats = await dbGetPlatformStats();

    return NextResponse.json({
        totalUsers: stats.uniqueUserIds.length,
        totalEvents: stats.totalEvents,
        totalLeads: stats.totalLeads,
        totalPosts: stats.totalPosts,
        totalPlans: stats.totalPlans,
        totalMediaAssets: stats.totalMediaAssets,
    });
}
