import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetLead, dbGetBrandProfile } from '@/lib/db';
import { generateOutreachEmails } from '@/lib/agent/outreach';

// POST /api/leads/outreach — Generate outreach emails for a lead
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { leadId } = await request.json();
        if (!leadId) return NextResponse.json({ error: 'leadId is required' }, { status: 400 });

        const lead = await dbGetLead(leadId, userId);
        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

        const brand = await dbGetBrandProfile(userId);

        const result = generateOutreachEmails(lead, brand);
        return NextResponse.json(result);
    } catch (err) {
        console.error('Outreach generation error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Failed: ${message}` }, { status: 500 });
    }
}
