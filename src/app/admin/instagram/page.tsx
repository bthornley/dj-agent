'use client';

import { useState, useEffect, useCallback } from 'react';
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

    const cronSecret = typeof window !== 'undefined' ? '' : '';

    const fetchPosts = useCallback(async () => {
        try {
            const res = await fetch('/api/agents/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
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
            await fetch('/api/agents/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
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
            await fetch('/api/agents/instagram', {
                headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
            });
            await fetchPosts();
        } finally {
            setRunningAgent(false);
        }
    }

    async function handleStatusChange(id: string, newStatus: string) {
        await fetch('/api/agents/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
            body: JSON.stringify({ action: 'update', id, updates: { status: newStatus } }),
        });
        await fetchPosts();
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this post?')) return;
        await fetch('/api/agents/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
            body: JSON.stringify({ action: 'delete', id }),
        });
        await fetchPosts();
    }

    async function handleSaveEdit(id: string) {
        await fetch('/api/agents/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
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
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        📸 @gigliftapp Instagram
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        AI-powered content management for the GigLift brand account
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/admin" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>
                        ← Admin
                    </Link>
                    <button onClick={handleGenerate} disabled={generating} style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: generating ? '#555' : 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px',
                    }}>
                        {generating ? 'Generating...' : '✨ Generate Posts'}
                    </button>
                    <button onClick={handleRunAgent} disabled={runningAgent} style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--accent)', cursor: 'pointer',
                        background: 'transparent', color: 'var(--accent)', fontWeight: 600, fontSize: '13px',
                    }}>
                        {runningAgent ? 'Running...' : '🤖 Run Agent'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Drafts', value: draftCount, color: '#94a3b8' },
                    { label: 'Scheduled', value: scheduledCount, color: '#38bdf8' },
                    { label: 'Published', value: publishedCount, color: '#a855f7' },
                    { label: 'Total Reach', value: totalReach.toLocaleString(), color: '#22c55e' },
                    { label: 'Impressions', value: totalImpressions.toLocaleString(), color: '#f59e0b' },
                    { label: 'Engagement', value: totalEngagement.toLocaleString(), color: '#ef4444' },
                ].map(stat => (
                    <div key={stat.label} style={{
                        background: 'var(--card-bg)', borderRadius: '12px', padding: '16px',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {['', 'draft', 'approved', 'scheduled', 'published', 'failed'].map(s => (
                    <button
                        key={s}
                        onClick={() => { setFilter(s); setLoading(true); }}
                        style={{
                            padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                            background: filter === s ? 'var(--accent)' : 'var(--card-bg)',
                            color: filter === s ? '#fff' : 'var(--text-muted)',
                            fontSize: '12px', fontWeight: 600,
                        }}
                    >
                        {s ? STATUS_LABELS[s]?.label || s : '📋 All'}
                    </button>
                ))}
            </div>

            {/* Posts Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading posts...</div>
            ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '18px' }}>No posts yet</p>
                    <p>Click &quot;Generate Posts&quot; to create AI-generated content</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                    {posts.map(post => (
                        <div key={post.id} style={{
                            background: 'var(--card-bg)', borderRadius: '12px', padding: '16px',
                            border: `1px solid ${PILLAR_COLORS[post.pillar] || 'var(--border-color)'}33`,
                        }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                                        background: `${PILLAR_COLORS[post.pillar] || '#666'}22`,
                                        color: PILLAR_COLORS[post.pillar] || '#666',
                                    }}>
                                        {post.pillar}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '10px',
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
                                        style={{
                                            width: '100%', minHeight: '120px', padding: '8px', borderRadius: '8px',
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical',
                                        }}
                                    />
                                    <input
                                        value={editHashtags}
                                        onChange={e => setEditHashtags(e.target.value)}
                                        placeholder="Hashtags"
                                        style={{
                                            width: '100%', padding: '6px 8px', borderRadius: '6px', marginTop: '6px',
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            color: 'var(--accent)', fontSize: '11px',
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                        <button onClick={() => handleSaveEdit(post.id)} style={{
                                            padding: '4px 12px', borderRadius: '6px', border: 'none',
                                            background: 'var(--accent)', color: '#fff', fontSize: '11px', cursor: 'pointer',
                                        }}>Save</button>
                                        <button onClick={() => setEditingId(null)} style={{
                                            padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                                            background: 'transparent', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                                        }}>Cancel</button>
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
                                    <button onClick={() => startEdit(post)} style={{
                                        padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)',
                                        background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer',
                                    }}>✏️ Edit</button>
                                    {post.status === 'draft' && (
                                        <button onClick={() => handleStatusChange(post.id, 'approved')} style={{
                                            padding: '4px 10px', borderRadius: '6px', border: 'none',
                                            background: '#22c55e22', color: '#22c55e', fontSize: '10px', cursor: 'pointer',
                                        }}>✅ Approve</button>
                                    )}
                                    {(post.status === 'draft' || post.status === 'approved') && (
                                        <button onClick={() => handleStatusChange(post.id, 'scheduled')} style={{
                                            padding: '4px 10px', borderRadius: '6px', border: 'none',
                                            background: '#38bdf822', color: '#38bdf8', fontSize: '10px', cursor: 'pointer',
                                        }}>📅 Schedule</button>
                                    )}
                                    <button onClick={() => handleDelete(post.id)} style={{
                                        padding: '4px 10px', borderRadius: '6px', border: 'none',
                                        background: '#ef444422', color: '#ef4444', fontSize: '10px', cursor: 'pointer',
                                    }}>🗑</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
