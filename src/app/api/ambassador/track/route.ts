import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// POST /api/ambassador/track — Attribute a new signup to an ambassador
// Called on first dashboard load if giglift_ref cookie exists
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    try {
        const body = await request.json();
        const referrerId = body.ref;
        if (!referrerId || typeof referrerId !== 'string') {
            return NextResponse.json({ error: 'Missing ref' }, { status: 400 });
        }

        // Don't let users refer themselves
        if (referrerId === userId) {
            return NextResponse.json({ skip: true });
        }

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const meta = user.publicMetadata as Record<string, unknown>;

        // Only attribute once — don't overwrite existing referral
        if (meta.referredBy) {
            return NextResponse.json({ skip: true, alreadyReferred: true });
        }

        // Verify the referrer exists and is an ambassador
        try {
            const referrer = await client.users.getUser(referrerId);
            const referrerMeta = referrer.publicMetadata as Record<string, unknown>;
            if (!referrerMeta.ambassador) {
                return NextResponse.json({ skip: true, notAmbassador: true });
            }
        } catch {
            return NextResponse.json({ skip: true, referrerNotFound: true });
        }

        // Attribute the referral
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                referredBy: referrerId,
                referredAt: new Date().toISOString(),
            },
        });

        return NextResponse.json({ success: true, referredBy: referrerId });
    } catch (error) {
        console.error('[ambassador/track] Error:', error);
        return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 });
    }
}
