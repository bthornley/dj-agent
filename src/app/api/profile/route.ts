import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ArtistType } from '@/lib/types';

const VALID_ARTIST_TYPES: ArtistType[] = ['dj', 'band', 'solo_artist', 'music_teacher'];

// GET /api/profile — Get user's artist types + regions
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.publicMetadata as Record<string, unknown>;

    // Artist types (legacy compat)
    const rawTypes = meta.artistTypes ?? meta.artistType;
    const artistTypes: ArtistType[] = Array.isArray(rawTypes) ? rawTypes : [((rawTypes as string) || 'dj') as ArtistType];

    // Regions
    const rawRegions = meta.regions;
    const regions: string[] = Array.isArray(rawRegions) ? rawRegions : ['Orange County', 'Long Beach'];

    // Google Photos album URL
    const googlePhotosAlbumUrl = (meta.googlePhotosAlbumUrl as string) || '';

    return NextResponse.json({ artistTypes, regions, googlePhotosAlbumUrl });
}

// PUT /api/profile — Update user's artist types and/or regions
export async function PUT(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Update artist types if provided
    if (body.artistTypes) {
        const artistTypes: ArtistType[] = body.artistTypes;
        if (!Array.isArray(artistTypes) || artistTypes.length === 0) {
            return NextResponse.json({ error: 'Select at least one artist type' }, { status: 400 });
        }
        if (!artistTypes.every(t => VALID_ARTIST_TYPES.includes(t))) {
            return NextResponse.json({ error: 'Invalid artist type' }, { status: 400 });
        }
        updates.artistTypes = artistTypes;
    }

    // Update regions if provided
    if (body.regions) {
        const regions: string[] = body.regions;
        if (!Array.isArray(regions) || regions.length === 0) {
            return NextResponse.json({ error: 'Select at least one region' }, { status: 400 });
        }
        updates.regions = regions;
    }

    // Update Google Photos album URL if provided
    if (body.googlePhotosAlbumUrl !== undefined) {
        const url = body.googlePhotosAlbumUrl as string;
        if (url && !url.startsWith('https://photos.google.com/') && !url.startsWith('https://photos.app.goo.gl/')) {
            return NextResponse.json({ error: 'Invalid Google Photos URL. Must start with https://photos.google.com/ or https://photos.app.goo.gl/' }, { status: 400 });
        }
        updates.googlePhotosAlbumUrl = url;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    await client.users.updateUserMetadata(userId, {
        publicMetadata: {
            ...user.publicMetadata,
            ...updates,
        },
    });

    return NextResponse.json({ success: true, ...updates });
}
