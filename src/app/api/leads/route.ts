import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { dbGetAllLeads, dbSaveLead, dbGetLeadStats, dbDeleteAllLeads } from '@/lib/db';
import { computeDedupeKey } from '@/lib/agent/lead-finder/dedup';
import { scoreLead } from '@/lib/agent/lead-finder/scoring';
import { Lead } from '@/lib/types';
import { v4 as uuid } from 'uuid';

// GET /api/leads — List user's leads with filters
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const mode = searchParams.get('mode') || undefined;

    if (statsOnly) {
        const stats = await dbGetLeadStats(userId, mode);
        return NextResponse.json(stats);
    }

    const filters = {
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
        minScore: searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined,
        search: searchParams.get('search') || undefined,
        mode,
    };

    const leads = await dbGetAllLeads(userId, filters);
    return NextResponse.json(leads);
}

// POST /api/leads — Create a lead manually
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const now = new Date().toISOString();

        // Get user's active mode
        let activeMode = 'performer';
        try {
            const client = await clerkClient();
            const user = await client.users.getUser(userId);
            const meta = user.publicMetadata as Record<string, unknown>;
            activeMode = (meta.activeMode as string) || 'performer';
        } catch { /* default to performer */ }

        const lead: Lead = {
            lead_id: uuid(),
            entity_name: body.entity_name || 'Unknown',
            entity_type: body.entity_type || 'other',
            city: body.city || '',
            state: body.state || 'CA',
            neighborhood: body.neighborhood || '',
            website_url: body.website_url || '',
            source: 'manual',
            source_url: body.source_url || body.website_url || '',
            found_at: now,
            contact_name: body.contact_name || '',
            role: body.role || '',
            email: body.email || '',
            phone: body.phone || '',
            contact_form_url: body.contact_form_url || '',
            instagram_handle: body.instagram_handle || '',
            facebook_page: body.facebook_page || '',
            preferred_contact_method: body.preferred_contact_method || '',
            music_fit_tags: body.music_fit_tags || [],
            event_types_seen: body.event_types_seen || [],
            capacity_estimate: body.capacity_estimate || null,
            budget_signal: body.budget_signal || 'unknown',
            notes: body.notes || '',
            lead_score: 0,
            score_reason: '',
            confidence: 'low',
            priority: 'P3',
            status: 'new',
            dedupe_key: '',
            raw_snippet: '',
            agent_trace: `[Created ${now}] Manual entry`,
        };

        lead.dedupe_key = computeDedupeKey(lead);

        if (!body.lead_score) {
            const scoreResult = scoreLead(lead);
            lead.lead_score = scoreResult.lead_score;
            lead.score_reason = scoreResult.score_reason;
            lead.confidence = scoreResult.confidence;
            lead.priority = scoreResult.priority;
        }

        await dbSaveLead(lead, userId, activeMode);
        return NextResponse.json({ success: true, lead }, { status: 201 });
    } catch (error) {
        console.error('Failed to create lead:', error);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }
}

// DELETE /api/leads — Delete all leads (optionally by mode)
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    if (searchParams.get('all') !== 'true') {
        return NextResponse.json({ error: 'Use ?all=true to confirm bulk deletion' }, { status: 400 });
    }

    const mode = searchParams.get('mode') || undefined;
    const deleted = await dbDeleteAllLeads(userId, mode);
    return NextResponse.json({ success: true, deleted });
}
