import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetBrandProfile, dbSaveBrandProfile } from '@/lib/db';
import { BrandProfile } from '@/lib/types';
import { rateLimit, safeError } from '@/lib/rate-limit';

// GET /api/social/brand — Get brand profile
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await dbGetBrandProfile(userId);
    return NextResponse.json(profile);
}

// POST /api/social/brand — Save brand profile
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`brand:${userId}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    try {
        const profile: BrandProfile = await request.json();
        if (!profile.id) return NextResponse.json({ error: 'Profile id is required' }, { status: 400 });

        profile.updatedAt = new Date().toISOString();
        await dbSaveBrandProfile(profile, userId);
        return NextResponse.json({ success: true, profile }, { status: 201 });
    } catch (err) {
        console.error('Brand profile save error:', err);
        return NextResponse.json({ error: safeError(err) }, { status: 500 });
    }
}
