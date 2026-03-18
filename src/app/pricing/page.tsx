'use client';

import { useState } from 'react';
import Topbar from '@/components/Topbar';
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
            '5 scans per month',
            '25 lead storage',
            '1 region',
            'Manual scanning only',
            'Lead scoring & QC',
            'Basic EPK page',
            '3 AI flyer backgrounds/mo',
            'Calendar view',
            '—',
            'Brand voice setup',
            '1 content plan per week',
            '5 post drafts per week',
            'Basic media library (50MB)',
        ],
        cta: 'Current Plan',
        highlighted: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 33,
        period: '/mo',
        description: 'Start with a 30-Day Free Trial',
        features: [
            '50 auto-scans per month',
            'Unlimited lead storage',
            '2 regions',
            'Auto-discovery from seeds',
            'Lead scoring & QC',
            'AI outreach (3 variants/lead)',
            'Email send & tracking',
            '20 AI flyer backgrounds/mo',
            'QR codes & logo overlay',
            'CSV export (leads & emails)',
            'Calendar + quick-add booking',
            '—',
            'Brand voice setup',
            'Unlimited content plans',
            'Unlimited post drafts',
            'Media library (2GB)',
            'Engagement copilot',
        ],
        cta: 'Start 30-Day Free Trial',
        highlighted: true,
    },
    {
        id: 'unlimited',
        name: 'Unlimited',
        price: 79,
        period: '/mo',
        description: 'Full power',
        features: [
            'Unlimited auto-scans',
            'Unlimited lead storage',
            'Unlimited regions',
            'Auto-discovery from seeds',
            'Priority lead scoring',
            'AI outreach (3 variants/lead)',
            'Email send, track & templates',
            'Unlimited AI flyer backgrounds',
            'Full flyer creator suite',
            'CSV export',
            '—',
            'Full Social Suite',
            'Unlimited content plans',
            'Unlimited posts + A/B variants',
            'Media library (10GB)',
            'Analytics dashboard',
            'Priority support',
        ],
        cta: 'Go Unlimited',
        highlighted: false,
    },
    {
        id: 'agency',
        name: 'Agency',
        price: 149,
        period: '/mo',
        description: 'For agencies & teams',
        features: [
            '5 artist profiles',
            'Everything in Unlimited, per artist',
            'Team dashboard',
            'Bulk outreach',
            'White-label EPK pages',
            'White-label flyers',
            'Shared media library',
            '—',
            'Full Social Suite per artist',
            'Agency-wide analytics',
            'Dedicated account manager',
            'Custom onboarding',
        ],
        cta: 'Contact Us',
        highlighted: false,
    },
];

export default function PricingPage() {
    const { user } = useUser();
    const currentPlan = user ? ((user.publicMetadata?.planId as string) || 'free') : null;
    const compSource = (user?.publicMetadata as Record<string, unknown>)?.compSource as string | undefined;
    const [loading, setLoading] = useState('');
    const [showAgencyForm, setShowAgencyForm] = useState(false);

    const handleUpgrade = async (planId: string) => {
        if (planId === currentPlan) return;
        if (planId === 'free' && user) return;
        if (planId === 'agency') {
            setShowAgencyForm(true);
            return;
        }
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

    const currentBadgeLabel = compSource === 'ambassador' ? '🌟 Ambassador Plan' : compSource === 'admin' ? '🎁 Comped' : 'Current Plan';
    const currentBtnLabel = compSource ? `✓ ${currentBadgeLabel}` : '✓ Current';

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                <div className="pricing-header">
                    <h1 className="pricing-title">Simple, Transparent Pricing</h1>
                    <p className="pricing-subtitle">Start free. Upgrade when you&apos;re ready to scale your bookings and teaching business.</p>
                </div>

                <div className="pricing-grid">
                    {plans.map(plan => (
                        <div key={plan.id} className={`pricing-card ${plan.highlighted ? 'pricing-highlighted' : ''} ${currentPlan && currentPlan === plan.id ? 'pricing-current' : ''}`}>
                            {currentPlan && currentPlan === plan.id
                                ? <div className="pricing-badge pricing-badge-current">{currentBadgeLabel}</div>
                                : plan.highlighted && <div className="pricing-badge">Most Popular</div>
                            }

                            <h3 className="pricing-plan-name">{plan.name}</h3>
                            <p className="pricing-plan-desc">{plan.description}</p>

                            <div className="pricing-price">
                                <span className="pricing-amount">${plan.price}</span>
                                {plan.period && <span className="pricing-period">{plan.period}</span>}
                            </div>

                            <ul className="pricing-features">
                                {plan.features.map((f, i) => (
                                    f === '—' ? (
                                        <li key={i} style={{
                                            listStyle: 'none', borderTop: '1px solid var(--border)',
                                            margin: '8px 0', paddingTop: '8px', fontSize: '11px',
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                            color: 'var(--text-accent)', fontWeight: 600,
                                        }}>📱 Social Hype Agent</li>
                                    ) : (
                                        <li key={i}>✓ {f}</li>
                                    )
                                ))}
                            </ul>

                            <button
                                className={`btn ${currentPlan && currentPlan === plan.id ? 'btn-secondary' : 'btn-primary'} btn-lg pricing-cta`}
                                onClick={() => plan.id === 'free' && !user ? (window.location.href = '/sign-up') : handleUpgrade(plan.id)}
                                disabled={plan.id === currentPlan || loading === plan.id}
                            >
                                {loading === plan.id ? 'Redirecting...' : currentPlan && currentPlan === plan.id ? currentBtnLabel : plan.id === 'free' && !user ? 'Get Started Free' : plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                {showAgencyForm && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--bg-card, #1c1c24)', border: '1px solid rgba(255,255,255,0.1)',
                            padding: '40px', borderRadius: '16px', maxWidth: '400px', width: '100%', position: 'relative'
                        }}>
                            <button onClick={() => setShowAgencyForm(false)} style={{
                                position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer'
                            }}>✕</button>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Agency Partnership</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '25px', fontSize: '0.95rem' }}>Tell us about your team and we'll build a custom plan for you.</p>

                            <form onSubmit={(e) => { e.preventDefault(); alert("Thanks! We'll reach out shortly."); setShowAgencyForm(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <input required type="text" placeholder="Your Name" style={{
                                    width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                                }} />
                                <input required type="email" placeholder="Work Email" style={{
                                    width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                                }} />
                                <input required type="text" placeholder="Agency Name" style={{
                                    width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                                }} />
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Submit Inquiry</button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
