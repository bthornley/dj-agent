import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { dbGetAllSeeds, dbGetSearchQuota, dbIncrementSearchQuota } from '@/lib/db';
import { discoverFromSeeds, batchScanUrls, BatchScanResult } from '@/lib/agent/lead-finder/discovery';
import { rateLimit } from '@/lib/rate-limit';
import { getPlanById, PlanId } from '@/lib/stripe';

const TRIAL_AUTO_SCANS = 5; // Free users get 5 lifetime auto-discovery trial scans

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

        // Get user's plan + mode
        let planId: PlanId = 'free';
        let activeMode = 'performer';
        try {
            const client = await clerkClient();
            const user = await client.users.getUser(userId);
            const meta = user.publicMetadata as Record<string, unknown>;
            planId = (meta.planId as PlanId) || 'free';
            activeMode = (meta.activeMode as string) || 'performer';
        } catch { /* default to free/performer */ }

        const plan = getPlanById(planId);

        // Auto-discovery: free users get a trial of 5 lifetime auto-scans
        if (body.auto && planId === 'free') {
            const trialQuota = await dbGetSearchQuota(userId, TRIAL_AUTO_SCANS, `trial_auto:${userId}`);
            if (trialQuota.remaining <= 0) {
                return NextResponse.json({
                    error: `You've used all ${TRIAL_AUTO_SCANS} free trial auto-discoveries. Upgrade to Pro for 100 auto-scans/month.`,
                    trialUsed: trialQuota.used,
                    trialLimit: TRIAL_AUTO_SCANS,
                    upgradeUrl: '/pricing',
                }, { status: 403 });
            }
        }

        const quota = await dbGetSearchQuota(userId, plan.scansPerMonth);

        // Mode 0: Quota check
        if (body.quota_check) {
            return NextResponse.json({ quota });
        }

        // Mode 1: Batch URL scan
        if (body.urls && Array.isArray(body.urls)) {
            const result: BatchScanResult = await batchScanUrls(body.urls, userId, activeMode);
            return NextResponse.json({ mode: 'batch', ...result });
        }

        // Mode 2: Auto-discover from seeds (filtered by active mode)
        if (body.auto) {
            if (quota.remaining <= 0) {
                return NextResponse.json({
                    error: `Monthly limit reached (${quota.used}/${quota.limit}). ${planId === 'pro' ? 'Upgrade to Unlimited for 250 scans/month.' : 'Resets next month.'}`,
                    quota,
                    upgradeUrl: '/pricing',
                }, { status: 429 });
            }

            const seeds = await dbGetAllSeeds(userId, activeMode);
            const activeSeeds = seeds.filter(s => s.active);

            if (activeSeeds.length === 0) {
                return NextResponse.json({ error: `No active ${activeMode} seeds. Add seeds at /leads/seeds first.` }, { status: 400 });
            }

            const filteredSeeds = body.region
                ? activeSeeds.filter(s => s.region.toLowerCase().includes(body.region.toLowerCase()))
                : activeSeeds;

            let effectiveRemaining = quota.remaining;
            // For free trial users, also cap by trial remaining
            if (planId === 'free') {
                const trialQuota = await dbGetSearchQuota(userId, TRIAL_AUTO_SCANS, `trial_auto:${userId}`);
                effectiveRemaining = Math.min(effectiveRemaining, trialQuota.remaining);
            }
            const maxSeeds = Math.min(body.limit || 5, filteredSeeds.length, effectiveRemaining);
            const seedsToProcess = filteredSeeds.slice(0, maxSeeds);

            const results = await discoverFromSeeds(seedsToProcess, userId, activeMode);

            const totalUrls = results.reduce((s, r) => s + r.urlsFound, 0);
            const totalCreated = results.reduce((s, r) => s + r.leadsCreated, 0);
            const totalFiltered = results.reduce((s, r) => s + r.leadsFiltered, 0);

            // Increment trial counter for free users
            if (planId === 'free') {
                await dbIncrementSearchQuota(userId, seedsToProcess.length, `trial_auto:${userId}`);
            }

            const updatedQuota = await dbGetSearchQuota(userId, plan.scansPerMonth);
            const trialInfo = planId === 'free'
                ? await dbGetSearchQuota(userId, TRIAL_AUTO_SCANS, `trial_auto:${userId}`)
                : null;

            return NextResponse.json({
                mode: 'auto',
                quota: updatedQuota,
                ...(trialInfo ? { trial: { used: trialInfo.used, limit: TRIAL_AUTO_SCANS, remaining: trialInfo.remaining } } : {}),
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
