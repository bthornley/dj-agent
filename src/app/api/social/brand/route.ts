import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetBrandProfile, dbSaveBrandProfile } from '@/lib/db';
import { BrandProfile } from '@/lib/types';

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

    try {
        const profile: BrandProfile = await request.json();
        if (!profile.id) return NextResponse.json({ error: 'Profile id is required' }, { status: 400 });

        profile.updatedAt = new Date().toISOString();
        await dbSaveBrandProfile(profile, userId);
        return NextResponse.json({ success: true, profile }, { status: 201 });
    } catch (err) {
        console.error('Brand profile save error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Save failed: ${message}` }, { status: 500 });
    }
}
