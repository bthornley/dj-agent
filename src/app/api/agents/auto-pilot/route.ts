import { NextRequest, NextResponse } from 'next/server';
import { dbGetAllActiveUserSeeds, dbGetSearchQuota, dbIncrementSearchQuota } from '@/lib/db';
import { discoverFromSeeds } from '@/lib/agent/lead-finder/discovery';
import { logAgentStart, logAgentComplete } from '@/lib/agents/run-logger';
import { logAgentError } from '@/lib/agents/error-log';

export const maxDuration = 300; // Allow max duration for scanning multiple users

// GET /api/agents/auto-pilot — Background scanner cron job
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runId = await logAgentStart('auto-pilot', 'Auto-Pilot Scanner');
    let usersProcessed = 0;
    let totalLeadsFound = 0;

    try {
        const usersWithSeeds = await dbGetAllActiveUserSeeds();
        if (usersWithSeeds.length === 0) {
            await logAgentComplete(runId, { status: 'success', summary: 'No active seeds found' });
            return NextResponse.json({ success: true, message: 'No active seeds to process.' });
        }

        // Process sequentially to respect rate limits of discovery API
        for (const { userId, seeds } of usersWithSeeds) {
            if (!seeds.length) continue;

            const quota = await dbGetSearchQuota(userId, 50); // Default to free limit check
            // For simplicity, we limit auto-pilot to max 2 seeds per run per user to avoid hitting limits too hard
            const maxSeeds = Math.min(2, quota.remaining);
            if (maxSeeds <= 0) continue;

            const seedsToProcess = seeds.slice(0, maxSeeds);
            usersProcessed++;

            // Every user is grouped into one scan (assuming 'performer' mode default if mode is missing)
            // Realistically we should process by seed mode, but we will pass 'performer' as fallback
            const results = await discoverFromSeeds(seedsToProcess, userId, seedsToProcess[0].mode || 'performer');

            const leadsCreated = results.reduce((sum, r) => sum + r.leadsCreated, 0);
            totalLeadsFound += leadsCreated;

            // Increment quota usage
            await dbIncrementSearchQuota(userId, seedsToProcess.length);
        }

        await logAgentComplete(runId, {
            status: 'success',
            summary: `Processed ${usersProcessed} users. Found ${totalLeadsFound} new leads.`,
            actionsCount: usersProcessed
        });

        return NextResponse.json({ success: true, usersProcessed, totalLeadsFound });

    } catch (error) {
        await logAgentComplete(runId, { status: 'failed', summary: 'Auto-pilot failed', error: error instanceof Error ? error.message : String(error) });
        await logAgentError({ agentName: 'auto-pilot', error: error instanceof Error ? error : String(error), context: 'Vercel Cron' });
        console.error('[auto-pilot-cron] Failed:', error);
        return NextResponse.json({ error: 'Auto-pilot failed' }, { status: 500 });
    }
}
