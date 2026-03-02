import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { runPipeline } from '@/lib/agent/lead-finder/pipeline';
import { validateExternalUrl } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import { dbIncrementSearchQuota, dbGetSearchQuota } from '@/lib/db';
import { getPlanById, PlanId } from '@/lib/stripe';

// POST /api/leads/scan — Run pipeline on a single URL
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 10 scans per minute per user
    const rl = rateLimit(`scan:${userId}`, 10, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please wait before scanning again.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
        );
    }

    // Get user's plan and enforce monthly scan quota
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
    const quotaCheck = await dbIncrementSearchQuota(userId, 1, plan.scansPerMonth);
    if (!quotaCheck.allowed) {
        const quota = await dbGetSearchQuota(userId, plan.scansPerMonth);
        return NextResponse.json({
            error: `Monthly scan limit reached (${quota.used}/${quota.limit}). ${planId === 'free' ? 'Upgrade to Pro for 100 scans/month.' : 'Upgrade your plan for more scans.'}`,
            quota,
            upgradeUrl: '/pricing',
        }, { status: 429 });
    }

    try {
        const body = await request.json();
        if (!body.url || typeof body.url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL before passing to pipeline
        const urlCheck = validateExternalUrl(body.url.trim());
        if (!urlCheck.valid) {
            return NextResponse.json({ error: urlCheck.error }, { status: 400 });
        }

        const result = await runPipeline({
            url: body.url.trim(),
            entity_name: body.entity_name,
            city: body.city,
            state: body.state,
            entity_type: body.entity_type,
            userId,
            mode: activeMode,
        });

        return NextResponse.json({
            lead: result.lead,
            isNew: result.isNew,
            isDuplicate: result.isDuplicate,
            qcPassed: result.qcPassed,
            qcIssues: result.qcIssues,
            qcWarnings: result.qcWarnings,
        });
    } catch (error) {
        console.error('Scan failed:', error);
        return NextResponse.json({ error: 'Scan failed. Please try again.' }, { status: 500 });
    }
}
