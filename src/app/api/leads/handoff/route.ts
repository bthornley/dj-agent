import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetLead, dbSaveLead, dbGetHandoffQueue, dbSaveEvent } from '@/lib/db';
import { generateHandoff, validateHandoffReady, leadToEvent } from '@/lib/agent/lead-finder/handoff';

// GET /api/leads/handoff — Get handoff queue
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const queue = dbGetHandoffQueue(userId);
        const handoffs = queue.map(lead => generateHandoff(lead));
        return NextResponse.json(handoffs);
    } catch (error) {
        console.error('Failed to fetch handoff queue:', error);
        return NextResponse.json({ error: 'Failed to fetch handoff queue' }, { status: 500 });
    }
}

// POST /api/leads/handoff — Queue leads for DJ Agent (creates events)
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const leadIds: string[] = body.lead_ids || [];

        if (leadIds.length === 0) {
            return NextResponse.json({ error: 'At least one lead_id is required' }, { status: 400 });
        }

        const results: {
            lead_id: string; success: boolean; error?: string;
            event_id?: string; handoff?: ReturnType<typeof generateHandoff>;
        }[] = [];

        for (const id of leadIds) {
            const lead = dbGetLead(id, userId);
            if (!lead) {
                results.push({ lead_id: id, success: false, error: 'Lead not found' });
                continue;
            }

            const validation = validateHandoffReady(lead);
            if (!validation.ready) {
                results.push({ lead_id: id, success: false, error: `Missing: ${validation.missing.join(', ')}` });
                continue;
            }

            const handoff = generateHandoff(lead);
            const event = leadToEvent(lead, handoff);
            dbSaveEvent(event, userId);

            lead.status = 'queued_for_dj_agent';
            lead.agent_trace = [lead.agent_trace, `[Handoff ${new Date().toISOString()}] Created event ${event.id}`].filter(Boolean).join('\n');
            dbSaveLead(lead, userId);

            results.push({ lead_id: id, success: true, event_id: event.id, handoff });
        }

        return NextResponse.json({
            success: true,
            queued: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        });
    } catch (error) {
        console.error('Handoff failed:', error);
        return NextResponse.json({ error: 'Handoff failed' }, { status: 500 });
    }
}
