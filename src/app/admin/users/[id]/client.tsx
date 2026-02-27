'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

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
}

export default function AdminUserDetailClient({ userId }: { userId: string }) {
    const [data, setData] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [roleUpdating, setRoleUpdating] = useState(false);
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

    const formatDate = (ts: number | null | string) => {
        if (!ts) return '—';
        const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎧</div>
                    <span>StageScout</span>
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
                                </div>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                                <button className="btn btn-ghost btn-sm" onClick={toggleRole} disabled={roleUpdating}>
                                    {data.user.role === 'admin' ? '🔓 Remove Admin' : '🛡️ Make Admin'}
                                </button>
                            </div>
                        </div>

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
