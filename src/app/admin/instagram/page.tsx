'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/Topbar';
import Link from 'next/link';

interface IGPost {
    id: string;
    caption: string;
    hashtags: string;
    media_url: string;
    media_type: string;
    pillar: string;
    status: string;
    scheduled_for: string;
    published_at: string;
    ig_permalink: string;
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    created_at: string;
}

const PILLAR_COLORS: Record<string, string> = {
    product: '#a855f7',
    educational: '#38bdf8',
    community: '#22c55e',
    bts: '#f59e0b',
    promo: '#ef4444',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: '📝 Draft', color: '#94a3b8' },
    approved: { label: '✅ Approved', color: '#22c55e' },
    scheduled: { label: '📅 Scheduled', color: '#38bdf8' },
    published: { label: '🚀 Published', color: '#a855f7' },
    failed: { label: '❌ Failed', color: '#ef4444' },
};

export default function InstagramAdminPage() {
    const [posts, setPosts] = useState<IGPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [generating, setGenerating] = useState(false);
    const [runningAgent, setRunningAgent] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCaption, setEditCaption] = useState('');
    const [editHashtags, setEditHashtags] = useState('');

    const fetchPosts = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'queue', status: filter || undefined, limit: 50 }),
            });
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts || []);
            }
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    async function handleGenerate() {
        setGenerating(true);
        try {
            await fetch('/api/admin/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', count: 3 }),
            });
            await fetchPosts();
        } finally {
            setGenerating(false);
        }
    }

    async function handleRunAgent() {
        setRunningAgent(true);
        try {
            await fetch('/api/admin/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run' }),
            });
            await fetchPosts();
        } finally {
            setRunningAgent(false);
        }
    }

    async function handleStatusChange(id: string, newStatus: string) {
        await fetch('/api/admin/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', id, updates: { status: newStatus } }),
        });
        await fetchPosts();
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this post?')) return;
        await fetch('/api/admin/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id }),
        });
        await fetchPosts();
    }

    async function handleSaveEdit(id: string) {
        await fetch('/api/admin/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', id, updates: { caption: editCaption, hashtags: editHashtags } }),
        });
        setEditingId(null);
        await fetchPosts();
    }

    function startEdit(post: IGPost) {
        setEditingId(post.id);
        setEditCaption(post.caption);
        setEditHashtags(post.hashtags);
    }

    // Stats
    const totalReach = posts.filter(p => p.status === 'published').reduce((s, p) => s + p.reach, 0);
    const totalImpressions = posts.filter(p => p.status === 'published').reduce((s, p) => s + p.impressions, 0);
    const totalEngagement = posts.filter(p => p.status === 'published').reduce((s, p) => s + p.likes + p.comments + p.saves + p.shares, 0);
    const draftCount = posts.filter(p => p.status === 'draft').length;
    const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
    const publishedCount = posts.filter(p => p.status === 'published').length;

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">📸 @gigliftapp Instagram</h2>
                        <p className="section-subtitle">AI-powered content management for the GigLift brand account</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleGenerate} disabled={generating} className="btn btn-primary btn-sm">
                            {generating ? '⏳ Generating...' : '✨ Generate Posts'}
                        </button>
                        <button onClick={handleRunAgent} disabled={runningAgent} className="btn btn-ghost btn-sm">
                            {runningAgent ? '⏳ Running...' : '🤖 Run Agent'}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                    {[
                        { label: 'Drafts', value: draftCount, color: '#94a3b8' },
                        { label: 'Scheduled', value: scheduledCount, color: '#38bdf8' },
                        { label: 'Published', value: publishedCount, color: '#a855f7' },
                        { label: 'Total Reach', value: totalReach.toLocaleString(), color: '#22c55e' },
                        { label: 'Impressions', value: totalImpressions.toLocaleString(), color: '#f59e0b' },
                        { label: 'Engagement', value: totalEngagement.toLocaleString(), color: '#ef4444' },
                    ].map(stat => (
                        <div key={stat.label} className="admin-stat-card" style={{ borderLeft: `3px solid ${stat.color}` }}>
                            <div className="admin-stat-value" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="admin-stat-label">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {['', 'draft', 'approved', 'scheduled', 'published', 'failed'].map(s => (
                        <button
                            key={s}
                            onClick={() => { setFilter(s); setLoading(true); }}
                            className={`btn btn-sm ${filter === s ? 'btn-secondary' : 'btn-ghost'}`}
                        >
                            {s ? STATUS_LABELS[s]?.label || s : '📋 All'}
                        </button>
                    ))}
                </div>

                {/* Posts Grid */}
                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : posts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📸</div>
                        <h3>No posts yet</h3>
                        <p>Click &quot;Generate Posts&quot; to create AI-generated content</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                        {posts.map(post => (
                            <div key={post.id} style={{
                                background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px',
                                border: `1px solid ${PILLAR_COLORS[post.pillar] || 'rgba(255,255,255,0.08)'}33`,
                            }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span className="badge" style={{
                                            background: `${PILLAR_COLORS[post.pillar] || '#666'}22`,
                                            color: PILLAR_COLORS[post.pillar] || '#666',
                                            fontSize: '10px',
                                        }}>
                                            {post.pillar}
                                        </span>
                                        <span style={{
                                            fontSize: '10px',
                                            color: STATUS_LABELS[post.status]?.color || '#999',
                                        }}>
                                            {STATUS_LABELS[post.status]?.label || post.status}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Caption */}
                                {editingId === post.id ? (
                                    <div>
                                        <textarea
                                            value={editCaption}
                                            onChange={e => setEditCaption(e.target.value)}
                                            className="input"
                                            style={{ width: '100%', minHeight: '120px', fontSize: '12px', resize: 'vertical' }}
                                        />
                                        <input
                                            value={editHashtags}
                                            onChange={e => setEditHashtags(e.target.value)}
                                            placeholder="Hashtags"
                                            className="input"
                                            style={{ width: '100%', marginTop: '6px', fontSize: '11px', color: 'var(--accent)' }}
                                        />
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                            <button onClick={() => handleSaveEdit(post.id)} className="btn btn-primary btn-sm" style={{ fontSize: '11px' }}>Save</button>
                                            <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p style={{
                                            fontSize: '12px', lineHeight: '1.5', color: 'var(--text-primary)',
                                            whiteSpace: 'pre-wrap', marginBottom: '6px',
                                            maxHeight: '120px', overflow: 'hidden',
                                        }}>
                                            {post.caption}
                                        </p>
                                        {post.hashtags && (
                                            <p style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '8px' }}>
                                                {post.hashtags}
                                            </p>
                                        )}
                                    </>
                                )}

                                {/* Analytics (if published) */}
                                {post.status === 'published' && (
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px',
                                        marginTop: '8px', padding: '8px', borderRadius: '8px',
                                        background: 'rgba(168, 85, 247, 0.05)',
                                    }}>
                                        {[
                                            { label: 'Reach', value: post.reach },
                                            { label: 'Likes', value: post.likes },
                                            { label: 'Comments', value: post.comments },
                                            { label: 'Saves', value: post.saves },
                                            { label: 'Shares', value: post.shares },
                                            { label: 'Impr.', value: post.impressions },
                                        ].map(m => (
                                            <div key={m.label} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{m.value}</div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{m.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Permalink */}
                                {post.ig_permalink && (
                                    <a href={post.ig_permalink} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'block', marginTop: '6px', fontSize: '10px', color: 'var(--accent)',
                                    }}>
                                        View on Instagram →
                                    </a>
                                )}

                                {/* Actions */}
                                {editingId !== post.id && post.status !== 'published' && (
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => startEdit(post)} className="btn btn-ghost btn-sm" style={{ fontSize: '10px' }}>✏️ Edit</button>
                                        {post.status === 'draft' && (
                                            <button onClick={() => handleStatusChange(post.id, 'approved')} className="btn btn-sm"
                                                style={{ background: '#22c55e22', color: '#22c55e', border: 'none', fontSize: '10px' }}>✅ Approve</button>
                                        )}
                                        {(post.status === 'draft' || post.status === 'approved') && (
                                            <button onClick={() => handleStatusChange(post.id, 'scheduled')} className="btn btn-sm"
                                                style={{ background: '#38bdf822', color: '#38bdf8', border: 'none', fontSize: '10px' }}>📅 Schedule</button>
                                        )}
                                        <button onClick={() => handleDelete(post.id)} className="btn btn-sm"
                                            style={{ background: '#ef444422', color: '#ef4444', border: 'none', fontSize: '10px' }}>🗑</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
