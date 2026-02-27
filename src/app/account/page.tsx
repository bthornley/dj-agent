'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';

const ARTIST_TYPES = [
    { value: 'dj', label: '🎧 DJ', desc: 'Clubs, lounges, events' },
    { value: 'band', label: '🎸 Band', desc: 'Live music venues, festivals' },
    { value: 'solo_artist', label: '🎤 Solo Artist', desc: 'Restaurants, private events' },
    { value: 'music_teacher', label: '🎹 Music Teacher', desc: 'Schools, community programs' },
] as const;

export default function AccountPage() {
    const { user } = useUser();
    const currentPlan = (user?.publicMetadata?.planId as string) || 'free';
    const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);
    const [stats, setStats] = useState<{ total: number; avgScore: number } | null>(null);
    const [artistTypes, setArtistTypes] = useState<string[]>(['dj']);
    const [savingType, setSavingType] = useState(false);

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

        fetch('/api/profile')
            .then(r => r.json())
            .then(d => { if (d.artistTypes) setArtistTypes(d.artistTypes); })
            .catch(() => { });
    }, []);

    const handleArtistTypeToggle = async (type: string) => {
        const newTypes = artistTypes.includes(type)
            ? artistTypes.filter(t => t !== type)
            : [...artistTypes, type];
        if (newTypes.length === 0) return; // must have at least one
        setSavingType(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artistTypes: newTypes }),
            });
            if (res.ok) {
                setArtistTypes(newTypes);
            }
        } catch { /* ignore */ }
        setSavingType(false);
    };

    const planNames: Record<string, string> = {
        free: '🆓 Free',
        pro: '⚡ Pro',
        unlimited: '🚀 Unlimited',
    };

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎵</div>
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
                        <p className="section-subtitle">Manage your profile, plan, and usage</p>
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

                {/* Artist Type Selector */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">Artist Type</h3>
                    <p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 16px' }}>
                        Select all that apply — your leads and discovery seeds will be tailored accordingly.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        {ARTIST_TYPES.map(t => (
                            <button
                                key={t.value}
                                onClick={() => handleArtistTypeToggle(t.value)}
                                disabled={savingType}
                                className={`btn ${artistTypes.includes(t.value) ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '4px',
                                    textAlign: 'left',
                                    opacity: savingType ? 0.6 : 1,
                                    border: artistTypes.includes(t.value) ? '2px solid var(--accent-purple)' : '2px solid transparent',
                                }}
                            >
                                <span style={{ fontSize: '15px', fontWeight: 600 }}>{t.label}</span>
                                <span className="text-muted" style={{ fontSize: '12px' }}>{t.desc}</span>
                            </button>
                        ))}
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
