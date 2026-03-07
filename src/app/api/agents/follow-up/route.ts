import { NextRequest, NextResponse } from 'next/server';
import { dbGetFollowUpCandidates, dbGetBrandProfile, dbSaveLead } from '@/lib/db';
import { generateOutreachEmails } from '@/lib/agent/outreach';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';
import { clerkClient } from '@clerk/nextjs/server';
import { ArtistType } from '@/lib/types';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runId = await logAgentStart('follow-up', 'Follow-Up Agent');
    let leadsProcessed = 0;

    try {
        // Find leads contacted > 3 days ago (status = 'contacted' or 'outreach_sent')
        const candidates = await dbGetFollowUpCandidates(3);

        if (candidates.length === 0) {
            await logAgentComplete(runId, { status: 'success', summary: 'No follow-ups needed' });
            return NextResponse.json({ success: true, message: 'No candidates' });
        }

        const userMetaCache: Record<string, { artistType: ArtistType; specialties: string[] }> = {};

        for (const { userId, lead } of candidates) {
            // Skip if it already has a drafted follow-up
            if (lead.follow_up_draft) continue;

            const brand = await dbGetBrandProfile(userId);

            if (!userMetaCache[userId]) {
                const client = await clerkClient();
                try {
                    const user = await client.users.getUser(userId);
                    const meta = user.publicMetadata as Record<string, unknown>;
                    let artistType: ArtistType = 'dj';

                    if (meta.activeMode === 'instructor') {
                        artistType = 'music_instructor';
                    } else {
                        const rawTypes = meta.artistTypes ?? meta.artistType;
                        const types: ArtistType[] = Array.isArray(rawTypes) ? rawTypes : [((rawTypes as string) || 'dj') as ArtistType];
                        artistType = types[0];
                    }
                    const specialties = Array.isArray(meta.specialties) ? meta.specialties as string[] : [];
                    userMetaCache[userId] = { artistType, specialties };
                } catch {
                    userMetaCache[userId] = { artistType: 'dj', specialties: [] };
                }
            }

            const { artistType, specialties } = userMetaCache[userId];
            const result = await generateOutreachEmails(lead, brand, artistType, specialties);
            const followUpEmail = result.emails.find(e => e.variant === 'follow_up');

            if (followUpEmail) {
                lead.follow_up_draft = {
                    subject: followUpEmail.subject,
                    body: followUpEmail.body,
                    generated_at: new Date().toISOString()
                };

                await dbSaveLead(lead, userId);
                leadsProcessed++;
            }
        }

        await logAgentComplete(runId, {
            status: 'success',
            summary: `Queued ${leadsProcessed} follow-up drafts.`,
            actionsCount: leadsProcessed
        });

        return NextResponse.json({ success: true, leadsProcessed });

    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Follow-up agent failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'follow-up', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[follow-up-cron] Failed:', error);
        return NextResponse.json({ error: 'Follow-up failed' }, { status: 500 });
    }
}
