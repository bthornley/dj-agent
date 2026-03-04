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
        scansPerMonth: 5,
        maxLeads: 25,
        maxRegions: 1,
        features: [
            '5 scans per month',
            '25 lead storage',
            '1 region',
            'Basic EPK page',
            '3 AI flyer backgrounds/mo',
            'Calendar view',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 33,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
        scansPerMonth: 50,
        maxLeads: -1, // unlimited
        maxRegions: 2,
        features: [
            '50 auto-scans per month',
            'Unlimited lead storage',
            '2 regions',
            'Auto-discovery from seeds',
            'AI outreach (3 variants/lead)',
            'Email send & tracking',
            '20 AI flyer backgrounds/mo',
            'QR codes & logo overlay',
            'CSV export',
            'Calendar + quick-add booking',
        ],
    },
    unlimited: {
        id: 'unlimited',
        name: 'Unlimited',
        price: 79,
        priceId: process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID || '',
        scansPerMonth: -1, // unlimited
        maxLeads: -1,
        maxRegions: -1,
        features: [
            'Unlimited auto-scans',
            'Unlimited lead storage',
            'Unlimited regions',
            'Priority lead scoring',
            'AI outreach (3 variants/lead)',
            'Email send, track & templates',
            'Unlimited AI flyer backgrounds',
            'Full flyer creator suite',
            'Full Social Suite',
            'Analytics dashboard',
            'Priority support',
        ],
    },
    agency: {
        id: 'agency',
        name: 'Agency',
        price: 149,
        priceId: null, // Contact us — no self-serve checkout
        scansPerMonth: -1, // unlimited per artist
        maxLeads: -1,
        maxRegions: -1,
        features: [
            '5 artist profiles',
            'Everything in Unlimited, per artist',
            'Team dashboard',
            'Bulk outreach',
            'White-label EPK pages',
            'White-label flyers',
            'Agency-wide analytics',
            'Dedicated account manager',
        ],
    },
};

export function getPlanById(id: string): PlanConfig {
    return PLANS[id as PlanId] || PLANS.free;
}
