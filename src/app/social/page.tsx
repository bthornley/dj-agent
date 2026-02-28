'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import AdminLink from '@/components/AdminLink';
import { ContentPlan, SocialPost, EngagementTask, MediaAsset } from '@/lib/types';

export default function SocialDashboardPage() {
    const [plan, setPlan] = useState<ContentPlan | null>(null);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [tasks, setTasks] = useState<EngagementTask[]>([]);
    const [media, setMedia] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [genEngagement, setGenEngagement] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [mediaProgress, setMediaProgress] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/social/plan').then(r => r.json()),
            fetch('/api/social/posts').then(r => r.json()),
            fetch('/api/social/engagement').then(r => r.json()),
            fetch('/api/social/media').then(r => r.json()),
        ]).then(([planData, postsData, tasksData, mediaData]) => {
            if (planData?.plan) setPlan(planData.plan);
            if (Array.isArray(postsData)) setPosts(postsData);
            if (Array.isArray(tasksData)) setTasks(tasksData);
            if (Array.isArray(mediaData)) setMedia(mediaData);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    async function handleGeneratePlan() {
        setGenerating(true);
        try {
            const res = await fetch('/api/social/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            const data = await res.json();
            if (data.plan) setPlan(data.plan);
            if (data.posts) setPosts(data.posts);
        } catch (e) { console.error(e); }
        setGenerating(false);
    }

    async function handleGenerateEngagement() {
        setGenEngagement(true);
        try {
            const res = await fetch('/api/social/engagement', { method: 'POST' });
            const data = await res.json();
            if (data.tasks) setTasks(data.tasks);
        } catch (e) { console.error(e); }
        setGenEngagement(false);
    }

    const draftCount = posts.filter(p => p.status === 'draft').length;
    const approvedCount = posts.filter(p => p.status === 'approved').length;
    const postedCount = posts.filter(p => p.status === 'posted').length;
    const flaggedTasks = tasks.filter(t => t.requiresApproval && t.status === 'pending');
    const pendingTasks = tasks.filter(t => !t.requiresApproval && t.status === 'pending');

    const pillarEmojis: Record<string, string> = {
        event: '🎪', proof_of_party: '📸', taste_identity: '🎵', education: '📚', credibility: '⭐',
    };

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎧</div>
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm">📋 Events</Link>
                    <Link href="/leads" className="btn btn-ghost btn-sm">🔍 Leads</Link>
                    <Link href="/social" className="btn btn-secondary btn-sm">📱 Social</Link>
                    <Link href="/social/queue" className="btn btn-ghost btn-sm">📝 Queue</Link>
                    <Link href="/social/brand" className="btn btn-ghost btn-sm">🎨 Brand</Link>
                    <Link href="/social/analytics" className="btn btn-ghost btn-sm">📊 Analytics</Link>
                    <AdminLink />
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Social Hype Dashboard</h2>
                        <p className="section-subtitle">Your 4-agent social media command center</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary btn-sm" onClick={handleGeneratePlan} disabled={generating}>
                            {generating ? '⏳ Generating...' : '🚀 Generate This Week\'s Plan'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : (
                    <>
                        {/* Stats Row */}
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '28px' }}>
                            <div className="stat-card">
                                <div className="stat-value">{draftCount}</div>
                                <div className="stat-label">Drafts Pending</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{approvedCount}</div>
                                <div className="stat-label">Approved</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{postedCount}</div>
                                <div className="stat-label">Posted</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{flaggedTasks.length}</div>
                                <div className="stat-label">Needs Approval</div>
                            </div>
                        </div>

                        <div className="social-grid">
                            {/* Weekly Plan Card */}
                            <div className="card social-plan-card">
                                <h3 className="card-title">📅 Weekly Plan</h3>
                                {plan ? (
                                    <>
                                        <div className="plan-theme">{plan.theme}</div>
                                        <p className="plan-notes">{plan.strategyNotes}</p>
                                        <div className="plan-targets">
                                            <span className="target-pill">🎬 {plan.targets.reels} Reels</span>
                                            <span className="target-pill">🖼️ {plan.targets.carousels} Carousels</span>
                                            <span className="target-pill">📖 {plan.targets.stories} Stories</span>
                                            <span className="target-pill">📘 {plan.targets.fbEvents} FB Events</span>
                                            <span className="target-pill">📱 {plan.targets.fbPosts} FB Posts</span>
                                        </div>
                                        <div className="plan-meta">
                                            <span className={`badge badge-${plan.status}`}>{plan.status}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Week of {plan.weekOf}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="plan-empty">
                                        <p>No plan yet. Hit &quot;Generate This Week&apos;s Plan&quot; to get started.</p>
                                    </div>
                                )}
                            </div>

                            {/* Content Queue Preview */}
                            <div className="card social-queue-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 className="card-title">📝 Content Queue</h3>
                                    <Link href="/social/queue" className="btn btn-ghost btn-sm">View All →</Link>
                                </div>
                                {posts.filter(p => p.status === 'draft').length > 0 ? (
                                    <div className="queue-preview">
                                        {posts.filter(p => p.status === 'draft' && p.variant === 'A').slice(0, 5).map(post => (
                                            <div key={post.id} className="queue-item">
                                                <span className="queue-pillar">{pillarEmojis[post.pillar] || '📋'}</span>
                                                <div className="queue-info">
                                                    <div className="queue-hook">{post.hookText || post.notes || 'Untitled post'}</div>
                                                    <div className="queue-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span className={`badge badge-${post.postType}`}>{post.postType}</span>
                                                        <span className="badge badge-draft">{post.platform}</span>
                                                        {post.mediaRefs && post.mediaRefs.length > 0 && post.mediaRefs.map((ref, i) => {
                                                            const isGP = ref.includes('photos.google.com') || ref.includes('photos.app.goo.gl');
                                                            const isVid = /\.(mp4|mov|webm)/i.test(ref);
                                                            if (isGP) return <span key={i} style={{ fontSize: '10px', color: '#4285F4', background: 'rgba(66,133,244,0.12)', padding: '2px 6px', borderRadius: '4px' }}>📷 Album</span>;
                                                            if (isVid) return <span key={i} style={{ fontSize: '10px', background: 'var(--md-surface-container-high)', padding: '2px 6px', borderRadius: '4px' }}>🎬 Video</span>;
                                                            return (
                                                                <div key={i} style={{ width: '24px', height: '24px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--md-outline-variant)', flexShrink: 0 }}>
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={ref} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No drafts in queue. Generate a plan to fill it up.</p>
                                )}
                            </div>
                        </div>

                        {/* Media Sources */}
                        <MediaSourcesCard
                            media={media}
                            uploading={uploadingMedia}
                            progress={mediaProgress}
                            onUploadFiles={async (files: FileList) => {
                                const mediaFiles = Array.from(files).filter(f =>
                                    f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/')
                                );
                                if (mediaFiles.length === 0) return;
                                setUploadingMedia(true);
                                setMediaProgress(`Uploading ${mediaFiles.length} files...`);
                                const batchSize = 5;
                                let uploaded = 0;
                                for (let i = 0; i < mediaFiles.length; i += batchSize) {
                                    const batch = mediaFiles.slice(i, i + batchSize);
                                    const formData = new FormData();
                                    batch.forEach(f => formData.append('files', f));
                                    setMediaProgress(`Uploading... (${Math.min(i + batchSize, mediaFiles.length)}/${mediaFiles.length})`);
                                    try {
                                        const res = await fetch('/api/social/media', { method: 'POST', body: formData });
                                        const data = await res.json();
                                        uploaded += data.uploaded || 0;
                                    } catch (e) { console.error(e); }
                                }
                                setMediaProgress(`✅ ${uploaded} files added`);
                                setTimeout(() => setMediaProgress(''), 4000);
                                setUploadingMedia(false);
                                fetch('/api/social/media').then(r => r.json()).then(d => {
                                    if (Array.isArray(d)) setMedia(d);
                                });
                            }}
                        />

                        {/* Engagement Tasks */}
                        <div className="card" style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 className="card-title">🤝 Engagement Tasks</h3>
                                <button className="btn btn-ghost btn-sm" onClick={handleGenerateEngagement} disabled={genEngagement}>
                                    {genEngagement ? '⏳...' : '✨ Generate Tasks'}
                                </button>
                            </div>

                            {flaggedTasks.length > 0 && (
                                <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                                    ⚠️ {flaggedTasks.length} task(s) flagged for your approval (booking/money inquiries)
                                </div>
                            )}

                            {tasks.length > 0 ? (
                                <div className="engagement-list">
                                    {[...flaggedTasks, ...pendingTasks].slice(0, 8).map(task => (
                                        <div key={task.id} className={`engagement-item ${task.requiresApproval ? 'engagement-flagged' : ''}`}>
                                            <div className="engagement-header">
                                                <span className="engagement-type-badge">{taskTypeLabel(task.type)}</span>
                                                <span className="engagement-target">{task.target}</span>
                                                {task.requiresApproval && <span className="badge" style={{ background: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}>🔒 Needs Approval</span>}
                                            </div>
                                            <div className="engagement-context">{task.context}</div>
                                            <div className="engagement-draft">&quot;{task.draftReply}&quot;</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No engagement tasks yet. Generate some to build your daily checklist.</p>
                            )}
                        </div>
                    </>
                )}
            </main>
        </>
    );
}

function taskTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        reply_comment: '💬 Reply',
        reply_dm: '📩 DM',
        outbound_comment: '📤 Comment',
        collab_outreach: '🤝 Collab',
        venue_tag: '📍 Tag',
        promoter_connect: '🎯 Connect',
    };
    return labels[type] || type;
}

/* ─── Media Sources Card ─────────────────────────────────── */


function MediaSourcesCard({ media, uploading, progress, onUploadFiles }: {
    media: MediaAsset[];
    uploading: boolean;
    progress: string;
    onUploadFiles: (files: FileList) => void;
}) {
    const folderRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [googleAlbumUrl, setGoogleAlbumUrl] = useState('');
    const [googleAlbumSaving, setGoogleAlbumSaving] = useState(false);
    const [googleAlbumSaved, setGoogleAlbumSaved] = useState(false);

    // Load saved Google Photos URL on mount
    useEffect(() => {
        fetch('/api/profile')
            .then(r => r.json())
            .then(d => { if (d.googlePhotosAlbumUrl) setGoogleAlbumUrl(d.googlePhotosAlbumUrl); })
            .catch(() => { });
    }, []);

    const saveGoogleAlbum = async () => {
        setGoogleAlbumSaving(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googlePhotosAlbumUrl: googleAlbumUrl }),
            });
            if (res.ok) {
                setGoogleAlbumSaved(true);
                setTimeout(() => setGoogleAlbumSaved(false), 3000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save');
            }
        } catch { alert('Failed to save'); }
        setGoogleAlbumSaving(false);
    };

    const removeGoogleAlbum = async () => {
        if (!confirm('Remove Google Photos album link?')) return;
        setGoogleAlbumSaving(true);
        try {
            await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googlePhotosAlbumUrl: '' }),
            });
            setGoogleAlbumUrl('');
        } catch { /* ignore */ }
        setGoogleAlbumSaving(false);
    };

    const images = media.filter(m => m.mediaType === 'image');
    const videos = media.filter(m => m.mediaType === 'video');
    const audio = media.filter(m => m.mediaType === 'audio');
    const recentMedia = media.filter(m => m.mediaType === 'image' || m.mediaType === 'video').slice(0, 8);

    return (
        <div className="card" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h3 className="card-title">📁 Agent Media Sources</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                        Upload folders of photos &amp; videos — the agent will reference these when creating posts
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {progress && (
                        <span style={{
                            fontSize: '13px',
                            color: progress.startsWith('✅') ? 'var(--accent-green)' : 'var(--text-muted)',
                        }}>
                            {uploading && <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />}
                            {progress}
                        </span>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => folderRef.current?.click()} disabled={uploading}>
                        📂 Import Folder
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        ⬆️ Upload Files
                    </button>
                    <Link href="/social/media" className="btn btn-ghost btn-sm">View All →</Link>
                </div>
            </div>

            {/* Hidden inputs */}
            <input ref={folderRef} type="file" multiple
                // @ts-expect-error webkitdirectory is non-standard
                webkitdirectory=""
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files) onUploadFiles(e.target.files); e.target.value = ''; }} />
            <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files) onUploadFiles(e.target.files); e.target.value = ''; }} />

            {/* Google Photos Album */}
            <div style={{
                padding: '16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--md-outline-variant)',
                background: 'var(--md-surface-container-low)',
                marginBottom: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{
                        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(66, 133, 244, 0.15)', color: '#4285F4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px',
                    }}>📷</span>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>Google Photos Album</span>
                    {googleAlbumUrl && !googleAlbumSaving && (
                        <span className="badge" style={{
                            background: 'var(--md-success-container)', color: 'var(--md-success)',
                            fontSize: '10px', padding: '2px 8px',
                        }}>✓ Connected</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        className="input"
                        value={googleAlbumUrl}
                        onChange={e => setGoogleAlbumUrl(e.target.value)}
                        placeholder="https://photos.google.com/share/..."
                        style={{ flex: 1, fontSize: '13px' }}
                    />
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={saveGoogleAlbum}
                        disabled={googleAlbumSaving || !googleAlbumUrl}
                        style={{ flexShrink: 0 }}
                    >
                        {googleAlbumSaving ? '...' : googleAlbumSaved ? '✓ Saved' : 'Save'}
                    </button>
                    {googleAlbumUrl && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={removeGoogleAlbum}
                            disabled={googleAlbumSaving}
                            style={{ flexShrink: 0, color: 'var(--md-error)' }}
                        >
                            Remove
                        </button>
                    )}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px' }}>
                    Paste a shared Google Photos album URL &mdash; the agent will reference these photos when creating posts.
                </p>
            </div>

            {media.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📂</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '14px', maxWidth: '400px', margin: '0 auto 14px' }}>
                        No media uploaded yet. Import a folder of your event photos, DJ set videos,
                        or promo graphics so the agent can attach them to your social posts.
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => folderRef.current?.click()} disabled={uploading}>
                        📂 Import Your First Folder
                    </button>
                </div>
            ) : (
                <>
                    {/* Type counts */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {images.length > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 14px', borderRadius: '8px',
                                background: 'var(--surface-raised)', fontSize: '13px',
                            }}>
                                <span>🖼️</span>
                                <span style={{ fontWeight: 600 }}>{images.length}</span>
                                <span style={{ color: 'var(--text-muted)' }}>images</span>
                            </div>
                        )}
                        {videos.length > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 14px', borderRadius: '8px',
                                background: 'var(--surface-raised)', fontSize: '13px',
                            }}>
                                <span>🎬</span>
                                <span style={{ fontWeight: 600 }}>{videos.length}</span>
                                <span style={{ color: 'var(--text-muted)' }}>videos</span>
                            </div>
                        )}
                        {audio.length > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 14px', borderRadius: '8px',
                                background: 'var(--surface-raised)', fontSize: '13px',
                            }}>
                                <span>🎵</span>
                                <span style={{ fontWeight: 600 }}>{audio.length}</span>
                                <span style={{ color: 'var(--text-muted)' }}>audio</span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '8px',
                            background: 'var(--accent-green-dim)', fontSize: '13px',
                            color: 'var(--accent-green)',
                        }}>
                            <span>✅</span>
                            <span style={{ fontWeight: 600 }}>{media.length} total</span>
                            <span>available to agent</span>
                        </div>
                    </div>

                    {/* Thumbnail strip */}
                    {recentMedia.length > 0 && (
                        <div style={{
                            display: 'flex', gap: '8px', overflowX: 'auto',
                            paddingBottom: '4px',
                        }}>
                            {recentMedia.map(asset => (
                                <div key={asset.id} style={{
                                    width: '72px', height: '72px', borderRadius: '8px',
                                    overflow: 'hidden', flexShrink: 0,
                                    border: '1px solid var(--border)',
                                }}>
                                    {asset.mediaType === 'image' ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={asset.url} alt={asset.fileName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{
                                            width: '100%', height: '100%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'var(--surface-raised)', fontSize: '20px',
                                        }}>🎬</div>
                                    )}
                                </div>
                            ))}
                            {media.length > 8 && (
                                <Link href="/social/media" style={{
                                    width: '72px', height: '72px', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--surface-raised)', border: '1px solid var(--border)',
                                    color: 'var(--text-accent)', fontSize: '13px', fontWeight: 600,
                                    textDecoration: 'none', flexShrink: 0,
                                }}>
                                    +{media.length - 8}
                                </Link>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
