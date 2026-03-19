import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pricing — GigLift',
    description: 'GigLift pricing plans for musicians. Start free with 5 scans/month. Upgrade to Pro ($19.99/mo), Unlimited ($49.99/mo), or Custom Agency tiers for AI-powered lead discovery, outreach, and content tools.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
