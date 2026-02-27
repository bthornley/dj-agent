import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ArtistType } from '@/lib/types';

const VALID_ARTIST_TYPES: ArtistType[] = ['dj', 'band', 'solo_artist', 'music_teacher'];

// GET /api/profile — Get user's artist type
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const artistType = (user.publicMetadata as Record<string, unknown>).artistType || 'dj';

    return NextResponse.json({ artistType });
}

// PUT /api/profile — Update user's artist type
export async function PUT(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const artistType = body.artistType as ArtistType;

    if (!artistType || !VALID_ARTIST_TYPES.includes(artistType)) {
        return NextResponse.json({ error: 'Invalid artist type' }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    await client.users.updateUserMetadata(userId, {
        publicMetadata: {
            ...user.publicMetadata,
            artistType,
        },
    });

    return NextResponse.json({ success: true, artistType });
}
