'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

interface UserRow {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    createdAt: number;
    lastSignInAt: number | null;
    role: string;
    planId: string;
    ambassador: boolean;
    ambassadorPending: boolean;
    stats: {
        events: number;
        leads: number;
        posts: number;
        plans: number;
        mediaAssets: number;
        hasBrand: boolean;
    };
}

interface PlatformStats {
    totalUsers: number;
    totalEvents: number;
    totalLeads: number;
    totalPosts: number;
    totalPlans: number;
    totalMediaAssets: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
    const [error, setError] = useState('');
    const [resendingIds, setResendingIds] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    async function fetchStats() {
        try {
            const res = await fetch('/api/admin/stats');
            if (res.status === 403) { setError('Access denied — admin role required'); return; }
            const data = await res.json();
            setStats(data);
        } catch (e) { console.error(e); }
    }

    async function fetchUsers(query: string) {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`);
            if (res.status === 403) { setError('Access denied — admin role required'); setLoading(false); return; }
            const data = await res.json();
            if (data.error) {
                console.error('API error:', data.error, data.detail);
                setError(`API error: ${data.detail || data.error}`);
            } else if (data.users) {
                setUsers(data.users);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    useEffect(() => {
        fetchStats();
        fetchUsers('');
    }, []);

    function handleSearch(value: string) {
        setSearch(value);
        if (searchTimer) clearTimeout(searchTimer);
        setSearchTimer(setTimeout(() => fetchUsers(value), 400));
    }

    async function handleResendGuide(email: string, firstName: string, id: string) {
        setResendingIds(prev => ({ ...prev, [id]: true }));
        try {
            const res = await fetch('/api/admin/users/resend-guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, firstName }),
            });
            const data = await res.json();
            if (res.ok) {
                toast(`User guide sent to ${email}`, 'success');
            } else {
                toast(`Error: ${data.error}`, 'error');
            }
        } catch (e: any) {
            toast('Failed to send user guide', 'error');
        } finally {
            setResendingIds(prev => ({ ...prev, [id]: false }));
        }
    }

    const formatDate = (ts: number | null) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (error) {
        return (
            <>
            <Topbar />
                <main className="main-content fade-in">
                    <div className="empty-state">
                        <div className="empty-icon">🔒</div>
                        <h3>{error}</h3>
                        <p>Set <code>{`{ "role": "admin" }`}</code> in your Clerk user publicMetadata to access the admin panel.</p>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">🛡️ Admin Dashboard</h2>
                        <p className="section-subtitle">Manage users, view platform metrics</p>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="admin-stats-grid">
                        <div className="admin-stat-card">
                            <div className="admin-stat-value">{stats.totalUsers}</div>
                            <div className="admin-stat-label">Users</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-value">{stats.totalEvents}</div>
                            <div className="admin-stat-label">Events</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-value">{stats.totalLeads}</div>
                            <div className="admin-stat-label">Leads</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-value">{stats.totalPosts}</div>
                            <div className="admin-stat-label">Social Posts</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-value">{stats.totalPlans}</div>
                            <div className="admin-stat-label">Content Plans</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-value">{stats.totalMediaAssets}</div>
                            <div className="admin-stat-label">Media Files</div>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="admin-search-bar">
                    <input
                        type="text"
                        className="input"
                        placeholder="🔍  Search users by email or name..."
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : users.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h3>No users found</h3>
                    </div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Plan</th>
                                    <th>Role</th>
                                    <th>Signed Up</th>
                                    <th>Last Sign In</th>
                                    <th>Events</th>
                                    <th>Leads</th>
                                    <th>Posts</th>
                                    <th>Brand</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="admin-user-cell">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={user.imageUrl} alt="" className="admin-avatar" />
                                                <div>
                                                    <div className="admin-user-name">
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                    <div className="admin-user-email">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.planId === 'unlimited' ? 'badge-approved' : user.planId === 'pro' ? 'badge-scheduled' : 'badge-draft'}`}>
                                                {user.planId}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                <span className={`badge ${user.role === 'admin' ? 'badge-approved' : 'badge-draft'}`}>
                                                    {user.role}
                                                </span>
                                                {user.ambassadorPending && !user.ambassador && (
                                                    <span className="badge" style={{
                                                        background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
                                                        color: '#fbbf24', fontSize: '10px', animation: 'pulse 2s infinite',
                                                    }}>🌟 Pending</span>
                                                )}
                                                {user.ambassador && (
                                                    <span className="badge" style={{
                                                        background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))',
                                                        border: '1px solid rgba(251,191,36,0.3)',
                                                        color: '#fbbf24', fontSize: '10px',
                                                    }}>🌟 Ambassador</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{formatDate(user.createdAt)}</td>
                                        <td>{formatDate(user.lastSignInAt)}</td>
                                        <td>{user.stats.events}</td>
                                        <td>{user.stats.leads}</td>
                                        <td>{user.stats.posts}</td>
                                        <td>{user.stats.hasBrand ? '✅' : '—'}</td>
                                        <td>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                style={{ fontSize: '12px', marginRight: '6px' }}
                                                onClick={() => handleResendGuide(user.email, user.firstName, user.id)}
                                                disabled={resendingIds[user.id]}
                                            >
                                                {resendingIds[user.id] ? '⏳' : '📧 Guide'}
                                            </button>
                                            <Link href={`/admin/users/${user.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }}>
                                                View →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </>
    );
}
