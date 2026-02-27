import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetAllSeeds, dbSaveSeed, dbDeleteSeed } from '@/lib/db';
import { DEFAULT_SEEDS } from '@/lib/agent/lead-finder/sources';

// GET /api/leads/seeds — Get user's seeds (auto-populate defaults on first access)
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let seeds = await dbGetAllSeeds(userId);

    // Auto-populate defaults for new users
    if (seeds.length === 0) {
        for (const seed of DEFAULT_SEEDS) {
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
