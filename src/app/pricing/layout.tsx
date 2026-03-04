import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pricing — GigLift',
    description: 'GigLift pricing plans for musicians. Start free with 5 scans/month. Upgrade to Pro ($33/mo), Unlimited ($79/mo), or Agency ($149/mo) for AI-powered lead discovery, outreach, and content tools.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
