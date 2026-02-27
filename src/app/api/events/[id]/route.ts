import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetEvent, dbSaveEvent, dbDeleteEvent } from '@/lib/db';
import { pickFields } from '@/lib/security';

// Allowlisted fields for event updates (mass-assignment protection)
const EVENT_UPDATABLE_FIELDS = [
    'status', 'clientName', 'org', 'phone', 'email',
    'venueName', 'address', 'loadInNotes', 'indoorOutdoor',
    'date', 'startTime', 'endTime', 'setupTime', 'strikeTime',
    'eventType', 'attendanceEstimate', 'dresscode',
    'setList', 'notes', 'payment', 'gear',
];

// GET /api/events/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const event = await dbGetEvent(id, userId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(event);
}

// PUT /api/events/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await dbGetEvent(id, userId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const safeUpdates = pickFields(body, EVENT_UPDATABLE_FIELDS);
    const updated = { ...existing, ...safeUpdates, id, updatedAt: new Date().toISOString() };
    await dbSaveEvent(updated, userId);
    return NextResponse.json(updated);
}

// DELETE /api/events/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbDeleteEvent(id, userId);
    return NextResponse.json({ success: true });
}
