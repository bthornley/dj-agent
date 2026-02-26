'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';

export default function AccountPage() {
    const { user } = useUser();
    const currentPlan = (user?.publicMetadata?.planId as string) || 'free';
    const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);
    const [stats, setStats] = useState<{ total: number; avgScore: number } | null>(null);

    useEffect(() => {
        fetch('/api/leads/auto-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quota_check: true }),
        })
            .then(r => r.json())
            .then(d => { if (d.quota) setQuota(d.quota); })
            .catch(() => { });

        fetch('/api/leads?stats=true')
            .then(r => r.json())
            .then(d => { if (d.total !== undefined) setStats(d); })
            .catch(() => { });
    }, []);

    const planNames: Record<string, string> = {
        free: '🆓 Free',
        pro: '⚡ Pro',
        unlimited: '🚀 Unlimited',
    };

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎧</div>
                    <span>GigFinder</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Account</h2>
                        <p className="section-subtitle">Manage your plan and usage</p>
                    </div>
                </div>

                <div className="stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                        <div className="stat-value">{planNames[currentPlan] || currentPlan}</div>
                        <div className="stat-label">Current Plan</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{quota ? `${quota.used}/${quota.limit}` : '—'}</div>
                        <div className="stat-label">Searches This Month</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.total ?? '—'}</div>
                        <div className="stat-label">Total Leads</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.avgScore ?? '—'}</div>
                        <div className="stat-label">Avg Lead Score</div>
                    </div>
                </div>

                {quota && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 className="card-title">Search Usage</h3>
                        <div className="quota-meter" style={{ marginTop: '12px' }}>
                            <div className="quota-header">
                                <span>Monthly Searches</span>
                                <span className={quota.remaining <= 10 ? 'quota-warn' : ''}>
                                    {quota.used} / {quota.limit} used
                                </span>
                            </div>
                            <div className="score-meter" style={{ width: '100%', height: '8px' }}>
                                <div className="score-fill" style={{
                                    width: `${(quota.used / quota.limit) * 100}%`,
                                    background: quota.remaining <= 10 ? 'var(--accent-red)'
                                        : quota.remaining <= 30 ? 'var(--accent-amber)'
                                            : 'var(--accent-green)',
                                }} />
                            </div>
                            <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                                {quota.remaining} searches remaining this month
                            </div>
                        </div>
                    </div>
                )}

                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">Profile</h3>
                    <div style={{ marginTop: '12px' }}>
                        <p><strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress || '—'}</p>
                        <p style={{ marginTop: '8px' }}><strong>Member since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {currentPlan === 'free' && (
                        <Link href="/pricing" className="btn btn-primary">⬆ Upgrade Plan</Link>
                    )}
                    {currentPlan !== 'free' && (
                        <button className="btn btn-secondary" onClick={async () => {
                            const res = await fetch('/api/checkout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ planId: currentPlan }),
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                        }}>
                            Manage Billing
                        </button>
                    )}
                </div>
            </main>
        </>
    );
}
