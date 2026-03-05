import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetAllEvents, dbSaveEvent } from '@/lib/db';
import { rateLimit, safeError } from '@/lib/rate-limit';
import { parseBody, EventCreateSchema } from '@/lib/validation';
import type { Event as GigEvent } from '@/lib/types';

// GET /api/events — List user's events
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const result = await dbGetAllEvents(userId, { limit, offset });
    return NextResponse.json(result);
}

// POST /api/events — Create event
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`events:${userId}`, 20, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const { data: event, error } = await parseBody(request, EventCreateSchema);
    if (error) return error;

    try {
        await dbSaveEvent(event as unknown as GigEvent, userId);
        return NextResponse.json({ success: true, event }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: safeError(err) }, { status: 500 });
    }
}
