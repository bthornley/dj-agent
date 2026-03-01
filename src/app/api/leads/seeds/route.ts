import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { dbGetAllSeeds, dbSaveSeed, dbDeleteSeed, dbDeleteAllSeeds } from '@/lib/db';
import { getDefaultSeeds } from '@/lib/agent/lead-finder/sources';
import { ArtistType } from '@/lib/types';

// GET /api/leads/seeds — Get user's seeds (auto-populate defaults on first access)
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || undefined;

    let seeds = await dbGetAllSeeds(userId, mode);

    // Auto-populate defaults for new users based on artist types + regions
    if (seeds.length === 0) {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const meta = user.publicMetadata as Record<string, unknown>;

        const rawTypes = meta.artistTypes ?? meta.artistType;
        const artistTypes: ArtistType[] = Array.isArray(rawTypes) ? rawTypes : [((rawTypes as string) || 'dj') as ArtistType];

        const rawRegions = meta.regions;
        const regions: string[] = Array.isArray(rawRegions) ? rawRegions : ['Orange County', 'Long Beach'];

        // Determine which mode to populate for
        const seedMode = mode || 'performer';

        // For performer mode, use DJ/band/solo seeds; for teacher mode, use music_teacher seeds
        const typesForMode = seedMode === 'teacher'
            ? (['music_teacher'] as ArtistType[])
            : artistTypes.filter(t => t !== 'music_teacher');

        // If none match, default to 'dj' for performer
        if (typesForMode.length === 0 && seedMode === 'performer') {
            typesForMode.push('dj');
        }

        const seen = new Set<string>();
        const allSeeds: ReturnType<typeof getDefaultSeeds> = [];
        for (const type of typesForMode) {
            for (const s of getDefaultSeeds(type, regions)) {
                const key = s.keywords.join('|');
                if (!seen.has(key)) {
                    seen.add(key);
                    allSeeds.push(s);
                }
            }
        }
        for (const seed of allSeeds) {
            await dbSaveSeed(seed, userId, seedMode);
        }
        seeds = await dbGetAllSeeds(userId, mode);
    }

    return NextResponse.json(seeds);
}

// POST /api/leads/seeds — Create a seed
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const seedMode = body.mode || 'performer';

    await dbSaveSeed(body, userId, seedMode);
    return NextResponse.json({ success: true, seed: body }, { status: 201 });
}

// DELETE /api/leads/seeds — Delete a seed
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // Delete all seeds (optionally filtered by mode)
    if (searchParams.get('all') === 'true') {
        const mode = searchParams.get('mode') || undefined;
        const deleted = await dbDeleteAllSeeds(userId, mode);
        return NextResponse.json({ success: true, deleted });
    }

    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await dbDeleteSeed(id, userId);
    return NextResponse.json({ success: true });
}
