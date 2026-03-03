'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';

interface Referral {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    planId: string;
    referredAt: string;
    createdAt: number;
}

interface ReferralData {
    referralLink: string;
    stats: {
        totalReferrals: number;
        paidReferrals: number;
        conversionRate: number;
        planBreakdown: Record<string, number>;
    };
    referrals: Referral[];
}

export default function AmbassadorDashboardPage() {
    const { user, isLoaded } = useUser();
    const [data, setData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isLoaded || !user) return;
        fetch('/api/ambassador/referrals')
            .then(res => res.json())
            .then(json => {
                if (json.error) setError(json.error);
                else setData(json);
            })
            .catch(() => setError('Failed to load'))
            .finally(() => setLoading(false));
    }, [isLoaded, user]);

    const isAmbassador = user && (user.publicMetadata as Record<string, unknown>)?.ambassador;

    function copyLink() {
        if (!data) return;
        navigator.clipboard.writeText(data.referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const formatDate = (ts: number | string) => {
        const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const planBadge = (plan: string) => {
        const styles: Record<string, { bg: string; color: string; label: string }> = {
            free: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: '🆓 Free' },
            pro: { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', label: '⭐ Pro' },
            unlimited: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: '🚀 Unlimited' },
            agency: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: '🏢 Agency' },
        };
        const s = styles[plan] || styles.free;
        return (
            <span style={{
                padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                background: s.bg, color: s.color, border: `1px solid ${s.color}22`,
            }}>
                {s.label}
            </span>
        );
    };

    if (!isLoaded) return <div className="empty-state"><div className="spinner" /></div>;

    if (!isAmbassador) {
        return (
            <>
                <header className="topbar">
                    <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                        <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                        <span>GigLift</span>
                    </Link>
                </header>
                <main className="main-content fade-in" style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
                    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌟</div>
                        <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Ambassador Dashboard</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            This dashboard is for approved brand ambassadors only.
                        </p>
                        <Link href="/ambassador" className="btn btn-primary">Apply to Be an Ambassador</Link>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontSize: '28px', fontWeight: 800, marginBottom: '4px',
                    }}>
                        🌟 Ambassador Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Share your link, track signups, and grow the GigLift community.
                    </p>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : error ? (
                    <div className="empty-state">
                        <div className="empty-icon">⚠️</div>
                        <h3>{error}</h3>
                    </div>
                ) : data && (
                    <>
                        {/* Referral Link Card */}
                        <div className="card" style={{
                            padding: '24px', marginBottom: '20px',
                            background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(245,158,11,0.02))',
                            border: '1px solid rgba(251,191,36,0.2)',
                        }}>
                            <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginBottom: '12px' }}>
                                🔗 Your Unique Referral Link
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input readOnly value={data.referralLink} style={{
                                    flex: 1, padding: '10px 14px', borderRadius: '10px',
                                    border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(0,0,0,0.3)',
                                    color: '#fbbf24', fontSize: '14px', fontFamily: 'monospace',
                                }} />
                                <button onClick={copyLink} className="btn" style={{
                                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                    color: '#1a1a2e', fontWeight: 700, fontSize: '13px',
                                    whiteSpace: 'nowrap', flexShrink: 0,
                                }}>
                                    {copied ? '✅ Copied!' : '📋 Copy Link'}
                                </button>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
                                Share this link with musicians. Anyone who signs up through it will be tracked as your referral.
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                            <div className="admin-stat-card" style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
                                <div className="admin-stat-value" style={{ color: '#fbbf24' }}>{data.stats.totalReferrals}</div>
                                <div className="admin-stat-label">Total Referrals</div>
                            </div>
                            <div className="admin-stat-card" style={{ borderColor: 'rgba(167,139,250,0.2)' }}>
                                <div className="admin-stat-value" style={{ color: '#a78bfa' }}>{data.stats.paidReferrals}</div>
                                <div className="admin-stat-label">Paid Subscribers</div>
                            </div>
                            <div className="admin-stat-card" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                                <div className="admin-stat-value" style={{ color: '#10b981' }}>{data.stats.conversionRate}%</div>
                                <div className="admin-stat-label">Conversion Rate</div>
                            </div>
                            {Object.entries(data.stats.planBreakdown).map(([plan, count]) => (
                                <div key={plan} className="admin-stat-card">
                                    <div className="admin-stat-value">{count}</div>
                                    <div className="admin-stat-label">{plan.charAt(0).toUpperCase() + plan.slice(1)} Users</div>
                                </div>
                            ))}
                        </div>

                        {/* Referrals Table */}
                        <div className="card" style={{ padding: '20px' }}>
                            <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginBottom: '16px' }}>
                                👥 Your Referrals ({data.referrals.length})
                            </h3>
                            {data.referrals.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: '40px 20px',
                                    color: 'var(--text-muted)',
                                }}>
                                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎯</div>
                                    <p style={{ fontSize: '14px', marginBottom: '4px' }}>No referrals yet</p>
                                    <p style={{ fontSize: '12px' }}>Share your link to start tracking signups!</p>
                                </div>
                            ) : (
                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Plan</th>
                                                <th>Signed Up</th>
                                                <th>Referred</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.referrals.map(r => (
                                                <tr key={r.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={r.imageUrl} alt=""
                                                                style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '13px' }}>
                                                                    {r.firstName} {r.lastName}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                    {r.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{planBadge(r.planId)}</td>
                                                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        {formatDate(r.createdAt)}
                                                    </td>
                                                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        {r.referredAt ? formatDate(r.referredAt) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
