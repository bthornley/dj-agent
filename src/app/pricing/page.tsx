'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

const plans = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: '',
        description: 'Try it out',
        features: [
            '10 URL scans per month',
            '25 lead storage',
            '1 region',
            'Manual scanning only',
            'Lead scoring & QC',
        ],
        cta: 'Current Plan',
        highlighted: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 19,
        period: '/mo',
        description: 'For working DJs',
        features: [
            '100 auto-scans per month',
            'Unlimited lead storage',
            '2 regions',
            'Auto-discovery from seeds',
            'Lead scoring & QC',
            'DJ Agent handoff',
            'Email templates',
        ],
        cta: 'Upgrade to Pro',
        highlighted: true,
    },
    {
        id: 'unlimited',
        name: 'Unlimited',
        price: 39,
        period: '/mo',
        description: 'Full power',
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
        cta: 'Go Unlimited',
        highlighted: false,
    },
];

export default function PricingPage() {
    const { user } = useUser();
    const currentPlan = (user?.publicMetadata?.planId as string) || 'free';
    const [loading, setLoading] = useState('');

    const handleUpgrade = async (planId: string) => {
        if (planId === 'free' || planId === currentPlan) return;
        if (!user) {
            window.location.href = `/sign-up?redirect_url=${encodeURIComponent('/pricing')}`;
            return;
        }
        setLoading(planId);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });
            if (!res.ok) {
                console.error('Checkout failed:', res.status);
                setLoading('');
                return;
            }
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Checkout error:', err);
        } finally {
            setLoading('');
        }
    };

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎧</div>
                    <span>GigFinder</span>
                </Link>
                <nav className="topbar-nav">
                    {user ? (
                        <Link href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
                    ) : (
                        <>
                            <Link href="/sign-in" className="btn btn-ghost btn-sm">Sign In</Link>
                            <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started</Link>
                        </>
                    )}
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="pricing-header">
                    <h1 className="pricing-title">Simple, Transparent Pricing</h1>
                    <p className="pricing-subtitle">Start free. Upgrade when you&apos;re ready to scale your bookings.</p>
                </div>

                <div className="pricing-grid">
                    {plans.map(plan => (
                        <div key={plan.id} className={`pricing-card ${plan.highlighted ? 'pricing-highlighted' : ''} ${currentPlan === plan.id ? 'pricing-current' : ''}`}>
                            {plan.highlighted && <div className="pricing-badge">Most Popular</div>}
                            {currentPlan === plan.id && <div className="pricing-badge pricing-badge-current">Current Plan</div>}

                            <h3 className="pricing-plan-name">{plan.name}</h3>
                            <p className="pricing-plan-desc">{plan.description}</p>

                            <div className="pricing-price">
                                <span className="pricing-amount">${plan.price}</span>
                                {plan.period && <span className="pricing-period">{plan.period}</span>}
                            </div>

                            <ul className="pricing-features">
                                {plan.features.map((f, i) => (
                                    <li key={i}>✓ {f}</li>
                                ))}
                            </ul>

                            <button
                                className={`btn ${currentPlan === plan.id ? 'btn-secondary' : 'btn-primary'} btn-lg pricing-cta`}
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={plan.id === currentPlan || loading === plan.id || (plan.id === 'free' && !user)}
                            >
                                {loading === plan.id ? 'Redirecting...' : currentPlan === plan.id ? '✓ Current' : plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
}
