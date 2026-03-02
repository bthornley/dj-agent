import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// POST /api/ambassador/apply — Submit ambassador application
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Validate required fields
        if (!body.artistName || !body.city || !body.whyAmbassador) {
            return NextResponse.json({ error: 'Artist name, city, and reason are required' }, { status: 400 });
        }

        // Require at least one social link
        const hasSocial = body.instagram || body.tiktok || body.youtube || body.twitter;
        if (!hasSocial) {
            return NextResponse.json({ error: 'At least one social media link is required' }, { status: 400 });
        }

        // Store application in user's privateMetadata (only admins can see this)
        const client = await clerkClient();

        // Check if already applied or already an ambassador
        const user = await client.users.getUser(userId);
        if ((user.publicMetadata as Record<string, unknown>)?.ambassador) {
            return NextResponse.json({ error: 'You are already an ambassador!' }, { status: 400 });
        }
        if ((user.privateMetadata as Record<string, unknown>)?.ambassadorApplication) {
            return NextResponse.json({ error: 'Application already submitted — we\'ll review it within 48 hours' }, { status: 400 });
        }

        // Save application to privateMetadata
        await client.users.updateUserMetadata(userId, {
            privateMetadata: {
                ambassadorApplication: {
                    artistName: body.artistName,
                    role: body.role || 'performer',
                    city: body.city,
                    instagram: body.instagram || '',
                    tiktok: body.tiktok || '',
                    youtube: body.youtube || '',
                    twitter: body.twitter || '',
                    spotify: body.spotify || '',
                    website: body.website || '',
                    whyAmbassador: body.whyAmbassador,
                    monthlyGigs: body.monthlyGigs || '',
                    communityDescription: body.communityDescription || '',
                    appliedAt: new Date().toISOString(),
                    status: 'pending',
                },
            },
            // Also set a public flag so admin list can show it
            publicMetadata: {
                ambassadorPending: true,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[ambassador/apply] Error:', error);
        return NextResponse.json({
            error: 'Failed to submit application',
            detail: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
