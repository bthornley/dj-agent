import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// GET /api/ambassador/referrals — Get list of users referred by this ambassador
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const client = await clerkClient();

        // Verify the current user is an ambassador
        const currentUser = await client.users.getUser(userId);
        const meta = currentUser.publicMetadata as Record<string, unknown>;
        if (!meta.ambassador) {
            return NextResponse.json({ error: 'Not an ambassador' }, { status: 403 });
        }

        // Get all users and filter for those referred by this ambassador
        // Note: Clerk doesn't support filtering by metadata, so we paginate through all users
        const referrals: Array<{
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            imageUrl: string;
            planId: string;
            referredAt: string;
            createdAt: number;
        }> = [];

        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const batch = await client.users.getUserList({ limit, offset, orderBy: '-created_at' });

            for (const user of batch.data) {
                const userMeta = user.publicMetadata as Record<string, unknown>;
                if (userMeta.referredBy === userId) {
                    referrals.push({
                        id: user.id,
                        email: user.emailAddresses[0]?.emailAddress || '',
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        imageUrl: user.imageUrl,
                        planId: (userMeta.planId as string) || 'free',
                        referredAt: (userMeta.referredAt as string) || '',
                        createdAt: user.createdAt,
                    });
                }
            }

            offset += limit;
            hasMore = batch.data.length === limit && offset < 500; // Cap at 500 users max
        }

        // Compute stats
        const totalReferrals = referrals.length;
        const paidReferrals = referrals.filter(r => r.planId !== 'free').length;
        const planBreakdown: Record<string, number> = {};
        for (const r of referrals) {
            planBreakdown[r.planId] = (planBreakdown[r.planId] || 0) + 1;
        }

        return NextResponse.json({
            ambassadorId: userId,
            referralCode: userId,
            referralLink: `https://giglift.app/?ref=${userId}`,
            stats: {
                totalReferrals,
                paidReferrals,
                conversionRate: totalReferrals > 0 ? Math.round((paidReferrals / totalReferrals) * 100) : 0,
                planBreakdown,
            },
            referrals,
        });
    } catch (error) {
        console.error('[ambassador/referrals] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }
}
