import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { dbGetAllSeeds, dbGetSearchQuota } from '@/lib/db';
import { discoverFromSeeds, batchScanUrls, BatchScanResult } from '@/lib/agent/lead-finder/discovery';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/leads/auto-scan — Automated discovery or batch scan
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 5 auto-scans per minute per user
    const rl = rateLimit(`auto-scan:${userId}`, 5, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please wait before scanning again.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
        );
    }

    try {
        const body = await request.json();
        const quota = await dbGetSearchQuota(userId);

        // Mode 0: Quota check
        if (body.quota_check) {
            return NextResponse.json({ quota });
        }

        // Mode 1: Batch URL scan
        if (body.urls && Array.isArray(body.urls)) {
            // Get user's active mode
            let activeMode = 'performer';
            try {
                const client = await clerkClient();
                const user = await client.users.getUser(userId);
                const meta = user.publicMetadata as Record<string, unknown>;
                activeMode = (meta.activeMode as string) || 'performer';
            } catch { /* default */ }
            const result: BatchScanResult = await batchScanUrls(body.urls, userId, activeMode);
            return NextResponse.json({ mode: 'batch', ...result });
        }

        // Mode 2: Auto-discover from seeds
        if (body.auto) {
            if (quota.remaining <= 0) {
                return NextResponse.json({
                    error: `Monthly limit reached (${quota.used}/${quota.limit}). Resets next month.`,
                    quota,
                }, { status: 429 });
            }

            const seeds = await dbGetAllSeeds(userId);
            const activeSeeds = seeds.filter(s => s.active);

            if (activeSeeds.length === 0) {
                return NextResponse.json({ error: 'No active seeds. Add seeds at /leads/seeds first.' }, { status: 400 });
            }

            const filteredSeeds = body.region
                ? activeSeeds.filter(s => s.region.toLowerCase().includes(body.region.toLowerCase()))
                : activeSeeds;

            const maxSeeds = Math.min(body.limit || 5, filteredSeeds.length, quota.remaining);
            const seedsToProcess = filteredSeeds.slice(0, maxSeeds);

            // Get user's active mode
            let activeMode = 'performer';
            try {
                const client = await clerkClient();
                const user = await client.users.getUser(userId);
                const meta = user.publicMetadata as Record<string, unknown>;
                activeMode = (meta.activeMode as string) || 'performer';
            } catch { /* default */ }

            const results = await discoverFromSeeds(seedsToProcess, userId, activeMode);

            const totalUrls = results.reduce((s, r) => s + r.urlsFound, 0);
            const totalCreated = results.reduce((s, r) => s + r.leadsCreated, 0);
            const totalFiltered = results.reduce((s, r) => s + r.leadsFiltered, 0);

            return NextResponse.json({
                mode: 'auto',
                quota: await dbGetSearchQuota(userId),
                seedsProcessed: seedsToProcess.length,
                totalUrls,
                highValueLeads: totalCreated,
                filteredOut: totalFiltered,
                errors: results.flatMap(r => r.errors),
                results: results.map(r => ({
                    region: r.seed.region,
                    keywords: r.seed.keywords,
                    urlsFound: r.urlsFound,
                    leadsCreated: r.leadsCreated,
                    leadsFiltered: r.leadsFiltered,
                    leads: r.results.map(pr => ({
                        lead_id: pr.lead.lead_id,
                        entity_name: pr.lead.entity_name,
                        entity_type: pr.lead.entity_type,
                        city: pr.lead.city,
                        lead_score: pr.lead.lead_score,
                        priority: pr.lead.priority,
                        email: pr.lead.email,
                    })),
                    errors: r.errors,
                })),
            });
        }

        return NextResponse.json({ error: 'Provide { auto: true } or { urls: [...] }' }, { status: 400 });
    } catch (error) {
        console.error('Auto-scan failed:', error);
        return NextResponse.json({ error: 'Auto-scan failed. Please try again.' }, { status: 500 });
    }
}
