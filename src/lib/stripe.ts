import Stripe from 'stripe';

// ============================================================
// Stripe SDK + Plan Configuration
// ============================================================

// Lazy-initialized — env vars aren't available at build time on Vercel
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    }
    return _stripe;
}

export type PlanId = 'free' | 'pro' | 'unlimited' | 'agency';

export interface PlanConfig {
    id: PlanId;
    name: string;
    price: number;
    priceId: string | null;
    scansPerMonth: number;
    maxLeads: number;
    maxRegions: number;
    features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        priceId: null,
        scansPerMonth: 10,
        maxLeads: 25,
        maxRegions: 1,
        features: [
            '10 URL scans per month',
            '25 lead storage',
            '1 region',
            'Manual scanning only',
            'Lead scoring & QC',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 19,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
        scansPerMonth: 100,
        maxLeads: -1, // unlimited
        maxRegions: 2,
        features: [
            '100 auto-scans per month',
            'Unlimited lead storage',
            '2 regions',
            'Auto-discovery from seeds',
            'Lead scoring & QC',
            'DJ Agent handoff',
            'Email templates',
        ],
    },
    unlimited: {
        id: 'unlimited',
        name: 'Unlimited',
        price: 39,
        priceId: process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID || '',
        scansPerMonth: 250,
        maxLeads: -1,
        maxRegions: -1,
        features: [
            '250 auto-scans per month',
            'Unlimited lead storage',
            'Unlimited regions',
            'Auto-discovery from seeds',
            'Lead scoring & QC',
            'DJ Agent handoff',
            'Email templates',
            'Priority support',
            'CRM features',
        ],
    },
    agency: {
        id: 'agency',
        name: 'Agency',
        price: 149,
        priceId: null, // Contact us — no self-serve checkout
        scansPerMonth: 2500, // 250 × 10 sub-accounts
        maxLeads: -1,
        maxRegions: -1,
        features: [
            '10 DJ sub-accounts',
            'Everything in Unlimited, per DJ',
            'Bulk lead distribution',
            'Shared media library',
            'Agency-wide analytics',
            'White-label EPK pages',
            'Dedicated account manager',
        ],
    },
};

export function getPlanById(id: string): PlanConfig {
    return PLANS[id as PlanId] || PLANS.free;
}
