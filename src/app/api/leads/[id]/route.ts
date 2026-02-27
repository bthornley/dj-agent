import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetLead, dbSaveLead, dbDeleteLead } from '@/lib/db';
import { scoreLead } from '@/lib/agent/lead-finder/scoring';
import { pickFields } from '@/lib/security';

// Allowlisted fields for lead updates (mass-assignment protection)
const LEAD_UPDATABLE_FIELDS = [
    'entity_name', 'entity_type', 'city', 'state', 'neighborhood',
    'website_url', 'source_url', 'contact_name', 'role',
    'email', 'phone', 'contact_form_url', 'instagram_handle',
    'facebook_page', 'preferred_contact_method',
    'music_fit_tags', 'event_types_seen', 'capacity_estimate',
    'budget_signal', 'notes', 'status',
];

// GET /api/leads/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const lead = await dbGetLead(id, userId);
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(lead);
}

// PUT /api/leads/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await dbGetLead(id, userId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const safeUpdates = pickFields(body, LEAD_UPDATABLE_FIELDS);
    const updated = { ...existing, ...safeUpdates, lead_id: id };

    const scoreFields = ['entity_type', 'email', 'phone', 'instagram_handle', 'contact_form_url',
        'music_fit_tags', 'event_types_seen', 'capacity_estimate', 'city'];
    const needsRescore = scoreFields.some(f =>
        (safeUpdates as Record<string, unknown>)[f] !== undefined &&
        JSON.stringify((safeUpdates as Record<string, unknown>)[f]) !== JSON.stringify((existing as unknown as Record<string, unknown>)[f])
    );

    if (needsRescore) {
        const scoreResult = scoreLead(updated);
        updated.lead_score = scoreResult.lead_score;
        updated.score_reason = scoreResult.score_reason;
        updated.confidence = scoreResult.confidence;
        updated.priority = scoreResult.priority;
    }

    await dbSaveLead(updated, userId);
    return NextResponse.json(updated);
}

// DELETE /api/leads/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbDeleteLead(id, userId);
    return NextResponse.json({ success: true });
}
