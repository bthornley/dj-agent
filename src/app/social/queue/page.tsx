'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { SocialPost, MediaAsset } from '@/lib/types';

type FilterStatus = 'all' | 'draft' | 'approved' | 'scheduled' | 'posted' | 'rejected';

export default function ContentQueuePage() {
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [pushResult, setPushResult] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ hookText: string; caption: string; cta: string; hashtags: string; mediaRefs: string[] }>({ hookText: '', caption: '', cta: '', hashtags: '', mediaRefs: [] });
    const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    async function fetchPosts() {
        setLoading(true);
        const res = await fetch('/api/social/posts');
        const data = await res.json();
        if (Array.isArray(data)) setPosts(data);
        setLoading(false);
    }

    async function handleAction(postId: string, status: 'approved' | 'rejected' | 'posted') {
        setActionLoading(postId);
        try {
            const res = await fetch('/api/social/posts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: postId, status }),
            });
            const data = await res.json();
            if (data.success) {
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p));
            } else if (data.blockers) {
                alert(`Guardrail blocked:\n${data.blockers.join('\n')}`);
            }
        } catch (e) { console.error(e); }
        setActionLoading(null);
    }

    async function handleBulkApprove() {
        const draftPosts = filteredPosts.filter(p => p.status === 'draft');
        for (const post of draftPosts) {
            await handleAction(post.id, 'approved');
        }
    }

    async function handleDelete(postId: string) {
        if (!confirm('Delete this draft? This cannot be undone.')) return;
        setActionLoading(postId);
        try {
            const res = await fetch(`/api/social/posts?id=${postId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setPosts(prev => prev.filter(p => p.id !== postId));
                if (expandedId === postId) setExpandedId(null);
                if (editingId === postId) setEditingId(null);
            }
        } catch (e) { console.error(e); }
        setActionLoading(null);
    }

    function startEditing(post: SocialPost) {
        setEditingId(post.id);
        setEditForm({
            hookText: post.hookText || '',
            caption: post.caption || '',
            cta: post.cta || '',
            hashtags: (post.hashtags || []).join(', '),
            mediaRefs: [...(post.mediaRefs || [])],
        });
        setExpandedId(post.id);
        setShowMediaPicker(false);
        // Fetch media library if not loaded
        if (mediaLibrary.length === 0) {
            fetch('/api/social/media')
                .then(r => r.json())
                .then(data => { if (Array.isArray(data)) setMediaLibrary(data); })
                .catch(() => { });
        }
    }

    function cancelEditing() {
        setEditingId(null);
        setShowMediaPicker(false);
    }

    async function saveEdit(postId: string) {
        setActionLoading(postId);
        try {
            const res = await fetch('/api/social/posts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: postId,
                    hookText: editForm.hookText,
                    caption: editForm.caption,
                    cta: editForm.cta,
                    hashtags: editForm.hashtags.split(',').map(h => h.trim()).filter(Boolean),
                    mediaRefs: editForm.mediaRefs,
                }),
            });
            const data = await res.json();
            if (data.success && data.post) {
                setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
                setEditingId(null);
                setShowMediaPicker(false);
            }
        } catch (e) { console.error(e); }
        setActionLoading(null);
    }

    function selectMedia(url: string) {
        setEditForm(prev => ({ ...prev, mediaRefs: [url] }));
        setShowMediaPicker(false);
    }

    function removeMedia() {
        setEditForm(prev => ({ ...prev, mediaRefs: [] }));
    }

    async function handlePushDraft(postId: string) {
        setActionLoading(postId);
        setPushResult(prev => ({ ...prev, [postId]: '' }));
        try {
            const res = await fetch('/api/social/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId }),
            });
            const data = await res.json();
            if (data.success) {
                const platforms = data.results.filter((r: { success: boolean }) => r.success).map((r: { platform: string }) => r.platform).join(', ');
                setPushResult(prev => ({ ...prev, [postId]: `✅ Draft pushed to ${platforms}` }));
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'scheduled' } : p));
            } else {
                const msg = data.error || data.results?.map((r: { message: string }) => r.message).join(', ') || 'Failed';
                setPushResult(prev => ({ ...prev, [postId]: `❌ ${msg}` }));
            }
        } catch (e) {
            setPushResult(prev => ({ ...prev, [postId]: '❌ Network error' }));
            console.error(e);
        }
        setActionLoading(null);
    }

    const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.status === filter);

    const pillarEmojis: Record<string, string> = {
        event: '🎪', proof_of_party: '📸', taste_identity: '🎵', education: '📚', credibility: '⭐',
    };
    const typeEmojis: Record<string, string> = {
        reel: '🎬', carousel: '🖼️', story: '📖', fb_event: '📘', fb_post: '📱', live: '🔴',
    };

    const statusFilters: { key: FilterStatus; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'draft', label: `Drafts (${posts.filter(p => p.status === 'draft').length})` },
        { key: 'approved', label: `Approved (${posts.filter(p => p.status === 'approved').length})` },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'posted', label: 'Posted' },
        { key: 'rejected', label: 'Rejected' },
    ];

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/social" className="btn btn-ghost btn-sm">�� Social Crew</Link>
                    <Link href="/social/queue" className="btn btn-secondary btn-sm">📝 Queue</Link>
                    <Link href="/social/brand" className="btn btn-ghost btn-sm">🎨 Brand</Link>
                    <Link href="/social/analytics" className="btn btn-ghost btn-sm">📊 Analytics</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Content Queue</h2>
                        <p className="section-subtitle">Review, approve, and manage your post drafts</p>
                    </div>
                    {filter === 'all' || filter === 'draft' ? (
                        <button className="btn btn-success btn-sm" onClick={handleBulkApprove}
                            disabled={posts.filter(p => p.status === 'draft').length === 0}>
                            ✅ Approve All Drafts
                        </button>
                    ) : null}
                </div>

                {/* Filter Tabs */}
                <div className="tabs" style={{ marginBottom: '24px' }}>
                    {statusFilters.map(sf => (
                        <button key={sf.key}
                            className={`tab ${filter === sf.key ? 'active' : ''}`}
                            onClick={() => setFilter(sf.key)}>
                            {sf.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : filteredPosts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>No posts {filter !== 'all' ? `with status "${filter}"` : 'yet'}</h3>
                        <p>Generate a weekly plan from the <Link href="/social" style={{ color: 'var(--accent-purple)' }}>Social Dashboard</Link> to fill your queue.</p>
                    </div>
                ) : (
                    <div className="queue-grid">
                        {filteredPosts.map(post => (
                            <div key={post.id}
                                className={`post-card post-card-${post.status} ${expandedId === post.id ? 'post-card-expanded' : ''}`}
                                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}>
                                <div className="post-card-header">
                                    <div className="post-card-badges">
                                        <span className="post-pillar-badge">{pillarEmojis[post.pillar] || '📋'} {post.pillar.replace(/_/g, ' ')}</span>
                                        <span className="post-type-badge">{typeEmojis[post.postType] || '📋'} {post.postType}</span>
                                        <span className={`badge badge-${post.status}`}>{post.status}</span>
                                        {post.variant === 'B' && <span className="badge badge-draft">B variant</span>}
                                    </div>
                                    <span className="post-platform">{post.platform}</span>
                                </div>

                                <div className="post-card-hook">{post.hookText || 'No hook yet'}</div>

                                {/* Media thumbnail — always visible */}
                                {post.mediaRefs && post.mediaRefs.length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {post.mediaRefs.map((ref, i) => {
                                            const isGooglePhotos = ref.includes('photos.google.com') || ref.includes('photos.app.goo.gl');
                                            const isVideo = /\.(mp4|mov|webm)/i.test(ref);

                                            if (isGooglePhotos) {
                                                return (
                                                    <a key={i} href={ref} target="_blank" rel="noreferrer"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                            padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                                                            background: 'rgba(66, 133, 244, 0.12)', color: '#4285F4',
                                                            fontSize: '11px', fontWeight: 500, textDecoration: 'none',
                                                        }}
                                                        onClick={e => e.stopPropagation()}>
                                                        📷 Google Photos
                                                    </a>
                                                );
                                            }
                                            if (isVideo) {
                                                return (
                                                    <div key={i} style={{
                                                        width: '48px', height: '48px', borderRadius: 'var(--radius-sm)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: 'var(--md-surface-container-high)',
                                                        border: '1px solid var(--md-outline-variant)',
                                                        fontSize: '18px', flexShrink: 0,
                                                    }}>🎬</div>
                                                );
                                            }
                                            return (
                                                <div key={i} style={{
                                                    width: '48px', height: '48px', borderRadius: 'var(--radius-sm)',
                                                    overflow: 'hidden', border: '1px solid var(--md-outline-variant)',
                                                    flexShrink: 0,
                                                }}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={ref} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {expandedId === post.id && (
                                    <div className="post-card-details slide-up">
                                        {editingId === post.id ? (
                                            /* ---- EDIT MODE ---- */
                                            <div onClick={e => e.stopPropagation()}>
                                                <div className="post-detail-section">
                                                    <label>Hook Text</label>
                                                    <textarea
                                                        value={editForm.hookText}
                                                        onChange={e => setEditForm(prev => ({ ...prev, hookText: e.target.value }))}
                                                        rows={2}
                                                        style={{
                                                            width: '100%', padding: '10px', borderRadius: '8px',
                                                            border: '1px solid var(--md-outline-variant)',
                                                            background: 'var(--md-surface-container-high)',
                                                            color: 'var(--text-primary)', fontSize: '14px',
                                                            resize: 'vertical', fontFamily: 'inherit',
                                                        }}
                                                    />
                                                </div>
                                                <div className="post-detail-section">
                                                    <label>Caption</label>
                                                    <textarea
                                                        value={editForm.caption}
                                                        onChange={e => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                                                        rows={5}
                                                        style={{
                                                            width: '100%', padding: '10px', borderRadius: '8px',
                                                            border: '1px solid var(--md-outline-variant)',
                                                            background: 'var(--md-surface-container-high)',
                                                            color: 'var(--text-primary)', fontSize: '13px',
                                                            resize: 'vertical', fontFamily: 'inherit',
                                                        }}
                                                    />
                                                </div>
                                                <div className="post-detail-section">
                                                    <label>CTA</label>
                                                    <input
                                                        value={editForm.cta}
                                                        onChange={e => setEditForm(prev => ({ ...prev, cta: e.target.value }))}
                                                        style={{
                                                            width: '100%', padding: '10px', borderRadius: '8px',
                                                            border: '1px solid var(--md-outline-variant)',
                                                            background: 'var(--md-surface-container-high)',
                                                            color: 'var(--text-primary)', fontSize: '13px',
                                                        }}
                                                    />
                                                </div>
                                                <div className="post-detail-section">
                                                    <label>Hashtags (comma-separated)</label>
                                                    <input
                                                        value={editForm.hashtags}
                                                        onChange={e => setEditForm(prev => ({ ...prev, hashtags: e.target.value }))}
                                                        placeholder="#djlife, #nightlife, #livemusic"
                                                        style={{
                                                            width: '100%', padding: '10px', borderRadius: '8px',
                                                            border: '1px solid var(--md-outline-variant)',
                                                            background: 'var(--md-surface-container-high)',
                                                            color: 'var(--text-primary)', fontSize: '13px',
                                                        }}
                                                    />
                                                </div>
                                                <div className="post-detail-section">
                                                    <label>Media</label>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                                                        {editForm.mediaRefs.length > 0 ? (
                                                            editForm.mediaRefs.map((ref, i) => {
                                                                const isGP = ref.includes('photos.google.com') || ref.includes('photos.app.goo.gl');
                                                                return (
                                                                    <div key={i} style={{ position: 'relative' }}>
                                                                        {isGP ? (
                                                                            <div style={{
                                                                                width: '64px', height: '64px', borderRadius: '8px',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                background: 'rgba(66, 133, 244, 0.12)', border: '1px solid rgba(66, 133, 244, 0.3)',
                                                                                fontSize: '10px', color: '#4285F4', textAlign: 'center', padding: '4px',
                                                                            }}>📷 Google Photos</div>
                                                                        ) : (
                                                                            <div style={{
                                                                                width: '64px', height: '64px', borderRadius: '8px',
                                                                                overflow: 'hidden', border: '2px solid var(--accent-purple)',
                                                                            }}>
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img src={ref} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            </div>
                                                                        )}
                                                                        <button onClick={removeMedia} style={{
                                                                            position: 'absolute', top: '-6px', right: '-6px',
                                                                            width: '20px', height: '20px', borderRadius: '50%',
                                                                            background: 'var(--accent-red)', color: 'white',
                                                                            border: 'none', fontSize: '11px', cursor: 'pointer',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        }}>✕</button>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No media attached</span>
                                                        )}
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ fontSize: '12px' }}
                                                            onClick={() => setShowMediaPicker(!showMediaPicker)}
                                                        >
                                                            {showMediaPicker ? '▲ Close' : '📷 Change Media'}
                                                        </button>
                                                    </div>
                                                    {showMediaPicker && (
                                                        <div style={{
                                                            marginTop: '10px', padding: '12px', borderRadius: '10px',
                                                            background: 'var(--md-surface-container)', border: '1px solid var(--md-outline-variant)',
                                                            maxHeight: '200px', overflowY: 'auto',
                                                        }}>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Select from your media library:</div>
                                                            {mediaLibrary.length === 0 ? (
                                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>No media in library. Upload media from the Media page.</p>
                                                            ) : (
                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                    {mediaLibrary.filter(a => a.mediaType === 'image' || a.mediaType === 'video').map(asset => (
                                                                        <div
                                                                            key={asset.id}
                                                                            onClick={() => selectMedia(asset.url)}
                                                                            style={{
                                                                                width: '56px', height: '56px', borderRadius: '6px',
                                                                                overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                                                                                border: editForm.mediaRefs.includes(asset.url)
                                                                                    ? '2px solid var(--accent-purple)'
                                                                                    : '1px solid var(--md-outline-variant)',
                                                                                opacity: editForm.mediaRefs.includes(asset.url) ? 1 : 0.7,
                                                                                transition: 'all 0.15s',
                                                                            }}
                                                                            title={asset.url.split('/').pop()}
                                                                        >
                                                                            {asset.mediaType === 'video' ? (
                                                                                <div style={{
                                                                                    width: '100%', height: '100%',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    background: 'var(--md-surface-container-high)', fontSize: '18px',
                                                                                }}>🎬</div>
                                                                            ) : (
                                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                                <img src={asset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="post-card-actions" style={{ marginTop: '12px' }}>
                                                    <button className="btn btn-primary btn-sm"
                                                        disabled={actionLoading === post.id}
                                                        onClick={() => saveEdit(post.id)}>
                                                        {actionLoading === post.id ? '⏳ Saving...' : '💾 Save Changes'}
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* ---- READ MODE ---- */
                                            <>
                                                <div className="post-detail-section">
                                                    <label>Full Caption</label>
                                                    <div className="post-caption-preview">{post.caption || 'No caption yet'}</div>
                                                </div>
                                                {post.hashtags.length > 0 && (
                                                    <div className="post-detail-section">
                                                        <label>Hashtags</label>
                                                        <div className="post-hashtags">{post.hashtags.join(' ')}</div>
                                                    </div>
                                                )}
                                                {post.cta && (
                                                    <div className="post-detail-section">
                                                        <label>CTA</label>
                                                        <div className="post-cta">{post.cta}</div>
                                                    </div>
                                                )}
                                                {post.mediaRefs && post.mediaRefs.length > 0 && (
                                                    <div className="post-detail-section">
                                                        <label>Media</label>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                                            {post.mediaRefs.map((ref, i) => {
                                                                const isGooglePhotos = ref.includes('photos.google.com') || ref.includes('photos.app.goo.gl');
                                                                const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(ref);
                                                                const isVideo = /\.(mp4|mov|webm)/i.test(ref);

                                                                if (isGooglePhotos) {
                                                                    return (
                                                                        <a key={i} href={ref} target="_blank" rel="noreferrer"
                                                                            style={{
                                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                                padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                                                                                background: 'rgba(66, 133, 244, 0.12)', color: '#4285F4',
                                                                                fontSize: '12px', fontWeight: 500, textDecoration: 'none',
                                                                            }}
                                                                            onClick={e => e.stopPropagation()}>
                                                                            📷 Google Photos Album →
                                                                        </a>
                                                                    );
                                                                }
                                                                if (isImage || ref.startsWith('http')) {
                                                                    return (
                                                                        <div key={i} style={{
                                                                            width: '64px', height: '64px', borderRadius: 'var(--radius-sm)',
                                                                            overflow: 'hidden', border: '1px solid var(--md-outline-variant)',
                                                                            flexShrink: 0,
                                                                        }}>
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img src={ref} alt={`media-${i}`}
                                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                        </div>
                                                                    );
                                                                }
                                                                if (isVideo) {
                                                                    return (
                                                                        <div key={i} style={{
                                                                            width: '64px', height: '64px', borderRadius: 'var(--radius-sm)',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            background: 'var(--md-surface-container-high)',
                                                                            border: '1px solid var(--md-outline-variant)',
                                                                            fontSize: '20px', flexShrink: 0,
                                                                        }}>🎬</div>
                                                                    );
                                                                }
                                                                return (
                                                                    <span key={i} style={{
                                                                        fontSize: '12px', color: 'var(--text-muted)',
                                                                        padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                                                                        background: 'var(--md-surface-container-high)',
                                                                    }}>📎 {ref.split('/').pop()}</span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="post-card-actions" onClick={e => e.stopPropagation()}>
                                                    {post.status === 'draft' && (
                                                        <>
                                                            <button className="btn btn-success btn-sm"
                                                                disabled={actionLoading === post.id}
                                                                onClick={() => handleAction(post.id, 'approved')}>
                                                                ✅ Approve
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm"
                                                                style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                                                disabled={actionLoading === post.id}
                                                                onClick={() => handleAction(post.id, 'rejected')}>
                                                                ❌ Reject
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm"
                                                                style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                                                                disabled={actionLoading === post.id}
                                                                onClick={() => handleDelete(post.id)}>
                                                                🗑️ Delete
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm"
                                                                style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
                                                                disabled={actionLoading === post.id}
                                                                onClick={() => startEditing(post)}>
                                                                ✏️ Edit
                                                            </button>
                                                        </>
                                                    )}
                                                    {post.status === 'approved' && (
                                                        <>
                                                            <button className="btn btn-primary btn-sm"
                                                                disabled={actionLoading === post.id}
                                                                onClick={() => handlePushDraft(post.id)}>
                                                                🚀 Push Draft to Platform
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm"
                                                                disabled={actionLoading === post.id}
                                                                onClick={() => handleAction(post.id, 'posted')}>
                                                                📤 Mark as Posted
                                                            </button>
                                                        </>
                                                    )}
                                                    {pushResult[post.id] && (
                                                        <span style={{ fontSize: '12px', color: pushResult[post.id].startsWith('✅') ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                            {pushResult[post.id]}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
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
