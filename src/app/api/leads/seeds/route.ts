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

    // Auto-populate defaults for new users based on artist type
    if (seeds.length === 0) {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const artistType = ((user.publicMetadata as Record<string, unknown>).artistType as ArtistType) || 'dj';
        const defaults = getDefaultSeeds(artistType);
        for (const seed of defaults) {
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
