import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Brand Ambassador Program — GigLift',
    description: 'Join the GigLift Ambassador Program. Share your referral link, earn 20% recurring commission, and get free Pro access by referring 3 subscribers.',
};

export default function AmbassadorLayout({ children }: { children: React.ReactNode }) {
    return children;
}
