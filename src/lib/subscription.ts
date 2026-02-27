import { currentUser } from '@clerk/nextjs/server';
import { PlanId, PLANS, getPlanById } from './stripe';
import { ArtistType } from './types';

// ============================================================
// Subscription — Plan checking + feature gating
// ============================================================

export interface UserPlan {
    planId: PlanId;
    plan: ReturnType<typeof getPlanById>;
    artistType: ArtistType[];
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
}

/**
 * Get the current user's plan from Clerk metadata.
 */
export async function getUserPlan(): Promise<UserPlan> {
    const user = await currentUser();

    if (!user) {
        return { planId: 'free', plan: PLANS.free, artistType: ['dj'] };
    }

    const metadata = user.publicMetadata as Record<string, unknown>;
    const planId = (metadata.planId as PlanId) || 'free';
    const artistTypes = (metadata.artistTypes as ArtistType[]) || ['dj'];
    const plan = getPlanById(planId);

    return {
        planId,
        plan,
        artistType: artistTypes,
        stripeCustomerId: metadata.stripeCustomerId as string | undefined,
        stripeSubscriptionId: metadata.stripeSubscriptionId as string | undefined,
    };
}

/**
 * Get the scan quota limits for a plan.
 */
export function getPlanLimits(planId: PlanId) {
    const plan = getPlanById(planId);
    return {
        scansPerMonth: plan.scansPerMonth,
        maxLeads: plan.maxLeads,
        maxRegions: plan.maxRegions,
    };
}

/**
 * Check if the user's plan allows a specific feature.
 */
export function checkFeatureAccess(planId: PlanId, feature: string): boolean {
    const plan = getPlanById(planId);
    switch (feature) {
        case 'auto_discovery':
            return planId !== 'free';
        case 'unlimited_leads':
            return plan.maxLeads === -1;
        case 'unlimited_regions':
            return plan.maxRegions === -1;
        case 'email_templates':
            return planId !== 'free';
        case 'crm':
            return planId === 'unlimited';
        default:
            return true;
    }
}
