import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetAllEvents, dbSaveEvent } from '@/lib/db';

// Allowed event statuses
const VALID_STATUSES = ['inquiry', 'confirmed', 'completed', 'cancelled', ''];

// GET /api/events — List user's events
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const events = await dbGetAllEvents(userId);
    return NextResponse.json(events);
}

// POST /api/events — Create event
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const event = await request.json();

    // Validate required fields
    if (!event.id || typeof event.id !== 'string') {
        return NextResponse.json({ error: 'Event id is required' }, { status: 400 });
    }

    // Validate status if provided
    if (event.status && !VALID_STATUSES.includes(event.status)) {
        return NextResponse.json({ error: 'Invalid event status' }, { status: 400 });
    }

    // Cap string field lengths (prevent oversized payloads)
    const maxLen = 10000;
    for (const key of Object.keys(event)) {
        if (typeof event[key] === 'string' && event[key].length > maxLen) {
            event[key] = event[key].substring(0, maxLen);
        }
    }

    await dbSaveEvent(event, userId);
    return NextResponse.json({ success: true, event }, { status: 201 });
}
