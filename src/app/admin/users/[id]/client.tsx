'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface AmbassadorApplication {
    artistName: string;
    role: string;
    city: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    twitter: string;
    spotify: string;
    website: string;
    whyAmbassador: string;
    monthlyGigs: string;
    communityDescription: string;
    appliedAt: string;
    status: string;
}

interface UserDetail {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        imageUrl: string;
        createdAt: number;
        lastSignInAt: number | null;
        role: string;
        publicMetadata?: Record<string, unknown>;
    };
    stats: {
        events: number;
        leads: number;
        posts: number;
        plans: number;
        mediaAssets: number;
        hasBrand: boolean;
    };
    events: Array<{ id: string; title: string; date: string; status: string; venue: string }>;
    leads: Array<{ id: string; title: string; source: string; status: string; priority: string; leadScore: number }>;
    posts: Array<{ id: string; hookText: string; platform: string; status: string; pillar: string; postType: string }>;
    brand: { djName: string; genre: string; vibe: string[] } | null;
    ambassadorApplication: AmbassadorApplication | null;
}

export default function AdminUserDetailClient({ userId }: { userId: string }) {
    const [data, setData] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [roleUpdating, setRoleUpdating] = useState(false);
    const [planUpdating, setPlanUpdating] = useState(false);
    const [ambassadorUpdating, setAmbassadorUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'events' | 'leads' | 'posts'>('events');

    useEffect(() => {
        if (userId) fetchUser(userId);
    }, [userId]);

    async function fetchUser(id: string) {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/users/${id}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setError(errData.detail || errData.error || `HTTP ${res.status}`);
                setLoading(false);
                return;
            }
            const json = await res.json();
            if (json.error || !json.user) {
                setError(json.detail || json.error || 'Unknown error');
                setData(null);
            } else {
                setData({
                    ...json,
                    events: json.events || [],
                    leads: json.leads || [],
                    posts: json.posts || [],
                    stats: json.stats || { events: 0, leads: 0, posts: 0, plans: 0, mediaAssets: 0, hasBrand: false },
                });
            }
        } catch (e) {
            console.error(e);
            setError('Network error');
        }
        setLoading(false);
    }

    async function toggleRole() {
        if (!data || !userId) return;
        const newRole = data.user.role === 'admin' ? 'user' : 'admin';
        if (!confirm(`Change role to "${newRole}"?`)) return;

        setRoleUpdating(true);
        try {
            await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            setData(prev => prev ? { ...prev, user: { ...prev.user, role: newRole } } : null);
        } catch (e) { console.error(e); }
        setRoleUpdating(false);
    }

    const planLabels: Record<string, string> = {
        free: '🆓 Free',
        pro: '⭐ Pro ($19/mo)',
        unlimited: '🚀 Unlimited ($49/mo)',
        agency: '🏢 Agency ($149/mo)',
    };

    function getCurrentPlanId(): string {
        return (data?.user?.publicMetadata?.planId as string) || 'free';
    }

    async function changePlan(newPlanId: string) {
        if (!data || !userId) return;
        const currentPlan = getCurrentPlanId();
        if (newPlanId === currentPlan) return;
        if (!confirm(`Change subscription from "${planLabels[currentPlan]}" to "${planLabels[newPlanId]}"?`)) return;

        setPlanUpdating(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: newPlanId }),
            });
            if (res.ok) {
                setData(prev => prev ? {
                    ...prev,
                    user: {
                        ...prev.user,
                        publicMetadata: { ...prev.user.publicMetadata, planId: newPlanId },
                    },
                } : null);
            }
        } catch (e) { console.error(e); }
        setPlanUpdating(false);
    }

    function isAmbassador(): boolean {
        return Boolean(data?.user?.publicMetadata?.ambassador);
    }

    function ambassadorSince(): string {
        const since = data?.user?.publicMetadata?.ambassadorSince;
        if (!since) return '';
        return new Date(since as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    async function toggleAmbassador() {
        if (!data || !userId) return;
        const newValue = !isAmbassador();
        const action = newValue ? 'add to' : 'remove from';
        if (!confirm(`${action} Ambassador Program? ${newValue ? 'This will give them a free Pro account.' : 'This will remove their free Pro access.'}`)) return;

        setAmbassadorUpdating(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ambassador: newValue }),
            });
            if (res.ok) {
                setData(prev => prev ? {
                    ...prev,
                    user: {
                        ...prev.user,
                        publicMetadata: {
                            ...prev.user.publicMetadata,
                            ambassador: newValue,
                            planId: newValue ? 'pro' : 'free',
                            ambassadorSince: newValue ? new Date().toISOString() : null,
                        },
                    },
                } : null);
            }
        } catch (e) { console.error(e); }
        setAmbassadorUpdating(false);
    }

    const formatDate = (ts: number | null | string) => {
        if (!ts) return '—';
        const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 56, height: 56, borderRadius: 12, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/admin" className="btn btn-ghost btn-sm">← Back to Admin</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : error ? (
                    <div className="empty-state">
                        <div className="empty-icon">⚠️</div>
                        <h3>Error loading user</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{error}</p>
                        <Link href="/admin" className="btn btn-primary btn-sm">← Admin Dashboard</Link>
                    </div>
                ) : !data ? (
                    <div className="empty-state">
                        <div className="empty-icon">❌</div>
                        <h3>User not found</h3>
                        <Link href="/admin" className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>← Admin Dashboard</Link>
                    </div>
                ) : (
                    <>
                        {/* User Profile Header */}
                        <div className="admin-user-header">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={data.user.imageUrl} alt="" className="admin-detail-avatar" />
                            <div className="admin-user-header-info">
                                <h2 className="section-title" style={{ marginBottom: '4px' }}>
                                    {data.user.firstName} {data.user.lastName}
                                </h2>
                                <p className="section-subtitle" style={{ marginBottom: '8px' }}>{data.user.email}</p>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span className={`badge ${data.user.role === 'admin' ? 'badge-approved' : 'badge-draft'}`}>
                                        {data.user.role}
                                    </span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        Joined {formatDate(data.user.createdAt)} • Last active {formatDate(data.user.lastSignInAt)}
                                    </span>
                                    {isAmbassador() && (
                                        <span className="badge" style={{
                                            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))',
                                            border: '1px solid rgba(251,191,36,0.3)',
                                            color: '#fbbf24', fontSize: '11px',
                                        }}>🌟 Ambassador</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button className="btn btn-ghost btn-sm" onClick={toggleRole} disabled={roleUpdating}>
                                    {data.user.role === 'admin' ? '🔓 Remove Admin' : '🛡️ Make Admin'}
                                </button>
                            </div>
                        </div>

                        {/* Subscription Management */}
                        <div className="card" style={{ marginTop: '16px', padding: '20px' }}>
                            <h3 className="card-title" style={{ marginBottom: '12px' }}>💳 Subscription</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Plan</div>
                                    <span className={`badge ${getCurrentPlanId() === 'free' ? 'badge-draft' : getCurrentPlanId() === 'pro' ? 'badge-approved' : getCurrentPlanId() === 'unlimited' ? 'badge-confirmed' : 'badge-approved'}`}
                                        style={{ fontSize: '14px', padding: '6px 12px' }}>
                                        {planLabels[getCurrentPlanId()] || getCurrentPlanId()}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Change Plan</div>
                                    <select
                                        value={getCurrentPlanId()}
                                        onChange={(e) => changePlan(e.target.value)}
                                        disabled={planUpdating}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="free">🆓 Free</option>
                                        <option value="pro">⭐ Pro ($19/mo)</option>
                                        <option value="unlimited">🚀 Unlimited ($49/mo)</option>
                                        <option value="agency">🏢 Agency ($149/mo)</option>
                                    </select>
                                    {planUpdating && <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Saving...</span>}
                                </div>
                            </div>
                        </div>

                        {/* Ambassador Program */}
                        <div className="card" style={{
                            marginTop: '16px', padding: '20px',
                            ...(isAmbassador() ? {
                                borderColor: 'rgba(251,191,36,0.3)',
                                background: 'linear-gradient(135deg, rgba(251,191,36,0.04), rgba(245,158,11,0.02))',
                            } : {}),
                        }}>
                            <h3 className="card-title" style={{ marginBottom: '12px' }}>🌟 Ambassador Program</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
                                    {isAmbassador() ? (
                                        <span className="badge" style={{
                                            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))',
                                            border: '1px solid rgba(251,191,36,0.3)',
                                            color: '#fbbf24', fontSize: '13px', padding: '6px 12px',
                                        }}>🌟 Active Ambassador</span>
                                    ) : (
                                        <span className="badge badge-draft" style={{ fontSize: '13px', padding: '6px 12px' }}>Not an Ambassador</span>
                                    )}
                                </div>
                                {isAmbassador() && ambassadorSince() && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Since</div>
                                        <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{ambassadorSince()}</span>
                                    </div>
                                )}
                                {isAmbassador() && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Benefit</div>
                                        <span style={{ fontSize: '13px', color: '#fbbf24' }}>⭐ Free Pro plan</span>
                                    </div>
                                )}
                                <div style={{ marginLeft: 'auto' }}>
                                    <button
                                        className={`btn ${isAmbassador() ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                                        onClick={toggleAmbassador}
                                        disabled={ambassadorUpdating}
                                        style={!isAmbassador() ? {
                                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                            color: '#000', fontWeight: 700,
                                        } : { color: 'var(--accent-red)' }}
                                    >
                                        {ambassadorUpdating ? '⏳ Updating...' : isAmbassador() ? '✕ Remove Ambassador' : '🌟 Add to Ambassador Program'}
                                    </button>
                                </div>
                            </div>
                            {!isAmbassador() && (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', marginBottom: 0 }}>
                                    Adding a user to the Ambassador Program gives them a free Pro account.
                                </p>
                            )}
                        </div>

                        {/* Ambassador Application Details */}
                        {data.ambassadorApplication && (
                            <div className="card" style={{
                                marginTop: '16px', padding: '20px',
                                borderColor: 'rgba(251,191,36,0.2)',
                                background: 'linear-gradient(135deg, rgba(251,191,36,0.03), rgba(245,158,11,0.01))',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 className="card-title" style={{ margin: 0 }}>📋 Ambassador Application</h3>
                                    <span className={`badge ${data.ambassadorApplication.status === 'approved' ? 'badge-approved' : data.ambassadorApplication.status === 'rejected' ? 'badge-draft' : ''}`}
                                        style={data.ambassadorApplication.status === 'pending' ? {
                                            background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
                                            color: '#fbbf24', fontSize: '11px',
                                        } : { fontSize: '11px' }}>
                                        {data.ambassadorApplication.status}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Artist Name</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{data.ambassadorApplication.artistName}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                            {data.ambassadorApplication.role === 'performer' ? '🎵 Performer' :
                                                data.ambassadorApplication.role === 'instructor' ? '📚 Instructor' :
                                                    data.ambassadorApplication.role === 'studio' ? '🎙️ Studio' :
                                                        data.ambassadorApplication.role === 'touring' ? '🚐 Touring' : '🎸 Other'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{data.ambassadorApplication.city}</div>
                                    </div>
                                </div>

                                {/* Social Links */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                    {data.ambassadorApplication.instagram && (
                                        <a href={data.ambassadorApplication.instagram.startsWith('http') ? data.ambassadorApplication.instagram : `https://instagram.com/${data.ambassadorApplication.instagram.replace('@', '')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#c4b5fd', fontSize: '12px', textDecoration: 'none' }}>
                                            📸 {data.ambassadorApplication.instagram}
                                        </a>
                                    )}
                                    {data.ambassadorApplication.tiktok && (
                                        <a href={data.ambassadorApplication.tiktok.startsWith('http') ? data.ambassadorApplication.tiktok : `https://tiktok.com/@${data.ambassadorApplication.tiktok.replace('@', '')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#c4b5fd', fontSize: '12px', textDecoration: 'none' }}>
                                            🎵 {data.ambassadorApplication.tiktok}
                                        </a>
                                    )}
                                    {data.ambassadorApplication.youtube && (
                                        <a href={data.ambassadorApplication.youtube.startsWith('http') ? data.ambassadorApplication.youtube : `https://youtube.com/${data.ambassadorApplication.youtube}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '12px', textDecoration: 'none' }}>
                                            ▶️ {data.ambassadorApplication.youtube}
                                        </a>
                                    )}
                                    {data.ambassadorApplication.twitter && (
                                        <a href={data.ambassadorApplication.twitter.startsWith('http') ? data.ambassadorApplication.twitter : `https://x.com/${data.ambassadorApplication.twitter.replace('@', '')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#7dd3fc', fontSize: '12px', textDecoration: 'none' }}>
                                            𝕏 {data.ambassadorApplication.twitter}
                                        </a>
                                    )}
                                    {data.ambassadorApplication.spotify && (
                                        <a href={data.ambassadorApplication.spotify.startsWith('http') ? data.ambassadorApplication.spotify : `https://open.spotify.com/artist/${data.ambassadorApplication.spotify}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7', fontSize: '12px', textDecoration: 'none' }}>
                                            🎧 Spotify
                                        </a>
                                    )}
                                    {data.ambassadorApplication.website && (
                                        <a href={data.ambassadorApplication.website.startsWith('http') ? data.ambassadorApplication.website : `https://${data.ambassadorApplication.website}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '12px', textDecoration: 'none' }}>
                                            🌐 Website
                                        </a>
                                    )}
                                </div>

                                {data.ambassadorApplication.monthlyGigs && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Gigs/Lessons</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{data.ambassadorApplication.monthlyGigs}</div>
                                    </div>
                                )}

                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Why they&apos;d be a great ambassador</div>
                                    <div style={{
                                        fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
                                        padding: '10px 14px', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        {data.ambassadorApplication.whyAmbassador}
                                    </div>
                                </div>

                                {data.ambassadorApplication.communityDescription && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Community</div>
                                        <div style={{
                                            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
                                            padding: '10px 14px', borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                        }}>
                                            {data.ambassadorApplication.communityDescription}
                                        </div>
                                    </div>
                                )}

                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Applied {formatDate(data.ambassadorApplication.appliedAt)}
                                </div>
                            </div>
                        )}

                        {/* Stats Row */}
                        <div className="admin-stats-grid" style={{ marginTop: '24px' }}>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{data.stats.events}</div>
                                <div className="admin-stat-label">Events</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{data.stats.leads}</div>
                                <div className="admin-stat-label">Leads</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{data.stats.posts}</div>
                                <div className="admin-stat-label">Social Posts</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{data.stats.plans}</div>
                                <div className="admin-stat-label">Content Plans</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{data.stats.mediaAssets}</div>
                                <div className="admin-stat-label">Media Files</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{data.stats.hasBrand ? '✅' : '—'}</div>
                                <div className="admin-stat-label">Brand Profile</div>
                            </div>
                        </div>

                        {/* Brand Summary */}
                        {data.brand && (
                            <div className="card" style={{ marginTop: '24px', padding: '20px' }}>
                                <h3 className="card-title" style={{ marginBottom: '12px' }}>🎨 Brand Profile</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>DJ Name</div>
                                        <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{data.brand.djName || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Genre</div>
                                        <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{data.brand.genre || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Vibe</div>
                                        <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{data.brand.vibe?.join(', ') || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Data Tabs */}
                        <div className="tabs" style={{ marginTop: '24px' }}>
                            <button className={`tab ${activeTab === 'events' ? 'active' : ''}`}
                                onClick={() => setActiveTab('events')}>
                                📅 Events ({data.events.length})
                            </button>
                            <button className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
                                onClick={() => setActiveTab('leads')}>
                                🎯 Leads ({data.leads.length})
                            </button>
                            <button className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
                                onClick={() => setActiveTab('posts')}>
                                📱 Social Posts ({data.posts.length})
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="admin-table-wrap" style={{ marginTop: '16px' }}>
                            {activeTab === 'events' && (
                                <table className="admin-table">
                                    <thead>
                                        <tr><th>Title</th><th>Venue</th><th>Date</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {data.events.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No events</td></tr>}
                                        {data.events.map(e => (
                                            <tr key={e.id}>
                                                <td style={{ fontWeight: 600 }}>{e.title}</td>
                                                <td>{e.venue || '—'}</td>
                                                <td>{formatDate(e.date)}</td>
                                                <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'leads' && (
                                <table className="admin-table">
                                    <thead>
                                        <tr><th>Title</th><th>Source</th><th>Score</th><th>Priority</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {data.leads.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leads</td></tr>}
                                        {data.leads.map(l => (
                                            <tr key={l.id}>
                                                <td style={{ fontWeight: 600 }}>{l.title}</td>
                                                <td>{l.source || '—'}</td>
                                                <td>{l.leadScore}</td>
                                                <td><span className={`badge badge-${l.priority?.toLowerCase()}`}>{l.priority}</span></td>
                                                <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'posts' && (
                                <table className="admin-table">
                                    <thead>
                                        <tr><th>Hook</th><th>Platform</th><th>Type</th><th>Pillar</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {data.posts.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No posts</td></tr>}
                                        {data.posts.map(p => (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.hookText || '—'}
                                                </td>
                                                <td>{p.platform}</td>
                                                <td>{p.postType}</td>
                                                <td>{p.pillar?.replace(/_/g, ' ')}</td>
                                                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
