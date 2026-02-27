import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { dbGetAllSeeds, dbSaveSeed, dbDeleteSeed } from '@/lib/db';
import { getDefaultSeeds } from '@/lib/agent/lead-finder/sources';
import { ArtistType } from '@/lib/types';

// GET /api/leads/seeds — Get user's seeds (auto-populate defaults on first access)
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let seeds = await dbGetAllSeeds(userId);

    // Auto-populate defaults for new users based on artist types + regions
    if (seeds.length === 0) {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const meta = user.publicMetadata as Record<string, unknown>;

        const rawTypes = meta.artistTypes ?? meta.artistType;
        const artistTypes: ArtistType[] = Array.isArray(rawTypes) ? rawTypes : [((rawTypes as string) || 'dj') as ArtistType];

        const rawRegions = meta.regions;
        const regions: string[] = Array.isArray(rawRegions) ? rawRegions : ['Orange County', 'Long Beach'];

        // Merge seeds from all selected types + regions, deduplicate
        const seen = new Set<string>();
        const allSeeds: ReturnType<typeof getDefaultSeeds> = [];
        for (const type of artistTypes) {
            for (const s of getDefaultSeeds(type, regions)) {
                const key = s.keywords.join('|');
                if (!seen.has(key)) {
                    seen.add(key);
                    allSeeds.push(s);
                }
            }
        }
        for (const seed of allSeeds) {
            await dbSaveSeed(seed, userId);
        }
        seeds = await dbGetAllSeeds(userId);
    }

    return NextResponse.json(seeds);
}

// POST /api/leads/seeds — Create a seed
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const seed = await request.json();
    await dbSaveSeed(seed, userId);
    return NextResponse.json({ success: true, seed }, { status: 201 });
}

// DELETE /api/leads/seeds — Delete a seed
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await dbDeleteSeed(id, userId);
    return NextResponse.json({ success: true });
}
