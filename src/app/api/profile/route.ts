import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ArtistType } from '@/lib/types';

const VALID_ARTIST_TYPES: ArtistType[] = ['dj', 'band', 'solo_artist', 'music_teacher'];

// GET /api/profile — Get user's artist types
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.publicMetadata as Record<string, unknown>;
    // Support legacy single string or new array format
    const raw = meta.artistTypes ?? meta.artistType;
    const artistTypes: ArtistType[] = Array.isArray(raw) ? raw : [((raw as string) || 'dj') as ArtistType];

    return NextResponse.json({ artistTypes });
}

// PUT /api/profile — Update user's artist types (array)
export async function PUT(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const artistTypes: ArtistType[] = body.artistTypes;

    if (!Array.isArray(artistTypes) || artistTypes.length === 0) {
        return NextResponse.json({ error: 'Select at least one artist type' }, { status: 400 });
    }

    if (!artistTypes.every(t => VALID_ARTIST_TYPES.includes(t))) {
        return NextResponse.json({ error: 'Invalid artist type' }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    await client.users.updateUserMetadata(userId, {
        publicMetadata: {
            ...user.publicMetadata,
            artistTypes,
        },
    });

    return NextResponse.json({ success: true, artistTypes });
}
