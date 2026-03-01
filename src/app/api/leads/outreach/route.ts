import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { dbGetLead, dbGetBrandProfile } from '@/lib/db';
import { generateOutreachEmails } from '@/lib/agent/outreach';
import { ArtistType } from '@/lib/types';

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

        // Get active mode + artist type from user profile
        let artistType: ArtistType = 'dj';
        try {
            const client = await clerkClient();
            const user = await client.users.getUser(userId);
            const meta = user.publicMetadata as Record<string, unknown>;
            const activeMode = (meta.activeMode as string) || 'performer';

            if (activeMode === 'teacher') {
                artistType = 'music_teacher';
            } else {
                const rawTypes = meta.artistTypes ?? meta.artistType;
                const types: ArtistType[] = Array.isArray(rawTypes) ? rawTypes : [((rawTypes as string) || 'dj') as ArtistType];
                artistType = types[0];
            }
        } catch { /* fallback to dj */ }

        const result = generateOutreachEmails(lead, brand, artistType);
        return NextResponse.json(result);
    } catch (err) {
        console.error('Outreach generation error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Failed: ${message}` }, { status: 500 });
    }
}
