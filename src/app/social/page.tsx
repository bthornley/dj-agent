'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import AdminLink from '@/components/AdminLink';
import { ContentPlan, SocialPost, EngagementTask } from '@/lib/types';

export default function SocialDashboardPage() {
    const [plan, setPlan] = useState<ContentPlan | null>(null);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [tasks, setTasks] = useState<EngagementTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [genEngagement, setGenEngagement] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/social/plan').then(r => r.json()),
            fetch('/api/social/posts').then(r => r.json()),
            fetch('/api/social/engagement').then(r => r.json()),
        ]).then(([planData, postsData, tasksData]) => {
            if (planData?.plan) setPlan(planData.plan);
            if (Array.isArray(postsData)) setPosts(postsData);
            if (Array.isArray(tasksData)) setTasks(tasksData);
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
                    <span>StageScout</span>
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
                                                    <div className="queue-meta">
                                                        <span className={`badge badge-${post.postType}`}>{post.postType}</span>
                                                        <span className="badge badge-draft">{post.platform}</span>
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
