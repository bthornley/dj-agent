'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import { SkeletonPage } from '@/components/Skeleton';
import Link from 'next/link';

interface AnalyticsData {
    date: string;
    totalUsers: number;
    newUsersToday: number;
    activeUsersLast7d: number;
    usersByMode: Record<string, number>;
    mrr: number;
    arr: number;
    paidSubscribers: number;
    planBreakdown: Record<string, number>;
    totalLeads: number;
    totalScansThisMonth: number;
    totalSeeds: number;
    avgLeadScore: number;
    trialToPaidRate: number;
    churnRate: number;
}

interface AgentRunLog {
    id: number;
    agent_id: string;
    agent_name: string;
    status: 'running' | 'success' | 'failed' | 'warning';
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    summary: string | null;
    alerts_count: number;
    actions_count: number;
    error: string | null;
}

interface AgentDashboardData {
    analytics: AnalyticsData | null;
    history: Array<{ date: string; mrr: number; users: number }>;
    pipeline: Record<string, number> | null;
    investors: Array<{ name: string; firm: string; email: string; linkedin: string; fit_score: number; status: string; last_contacted: string }>;
    outreachDrafts: Array<{ id: string; investor_name: string; investor_firm: string; investor_email: string; subject: string; body: string; status: string; created_at: string }>;
    contentQueue: Array<{ id: string; title: string; content_type: string; platform: string; status: string; body: string }>;
    growthTasks: Array<{ id: string; type: string; priority: string; title: string; description: string; category: string; status: string; created_at: string }>;
    cfoInsights: Array<{ id: string; date: string; revenue_health: string; unit_economics: string; risk_flags: string[]; recommended_actions: string[]; runway_assessment: string; summary: string; created_at: string }>;
    schoolPipeline: {
        total: number;
        byStatus: Record<string, number>;
        byTier: Record<string, number>;
        schools: Array<{ id: string; school_name: string; tier: string; contact_name: string; contact_email: string; location: string; status: string; outreach_step: number; signups: number; slug: string }>;
        recentOutreach: Array<{ id: string; school_id: string; step: number; subject: string; body: string; status: string; sent_at: string }>;
    } | null;
    weeklyUpdate: string | null;
    agentRuns: AgentRunLog[];
    agentStats: Record<string, { runs: number; lastRun: string | null; lastStatus: string }>;
}

const PIPELINE_STAGES = [
    { key: 'discovered', label: 'Discovered', emoji: '🔍' },
    { key: 'scored', label: 'Scored', emoji: '📊' },
    { key: 'outreach_sent', label: 'Outreach', emoji: '📧' },
    { key: 'replied', label: 'Replied', emoji: '💬' },
    { key: 'intro_call', label: 'Intro Call', emoji: '📞' },
    { key: 'partner_meeting', label: 'Partner', emoji: '🤝' },
    { key: 'term_sheet', label: 'Term Sheet', emoji: '📝' },
    { key: 'closed', label: 'Closed', emoji: '✅' },
];

const AGENT_INFO = [
    { id: 'code-review', name: 'Code Review Agent', emoji: '🤖', schedule: 'On PR', desc: 'Standards enforcement, security scan, diff review', group: 'DevOps' },
    { id: 'qa', name: 'QA Agent', emoji: '🔍', schedule: 'On Deploy', desc: 'Route audit, env check, build health checks, integration tests', group: 'DevOps' },
    { id: 'cost-guardian', name: 'Cost Guardian', emoji: '🛡️', schedule: 'Daily 5am', desc: 'Infra costs, guardrails, budget alerts', group: 'Business' },
    { id: 'analytics', name: 'Analytics', emoji: '📊', schedule: 'Daily 6am', desc: 'KPIs, revenue, anomalies', group: 'Business' },
    { id: 'growth-ops', name: 'Growth Ops', emoji: '🚀', schedule: 'Daily 7am', desc: 'Onboarding, funnel, ambassadors', group: 'Business' },
    { id: 'customer-success', name: 'Customer Success', emoji: '🎯', schedule: 'Daily 8am', desc: 'Health scores, churn, upgrades', group: 'Business' },
    { id: 'investor-pipeline', name: 'Investor Outreach', emoji: '💰', schedule: 'M-F 9am', desc: 'CRM, scoring, outreach', group: 'Business' },
    { id: 'content-marketing', name: 'Content Marketing', emoji: '📝', schedule: 'MWF 10am', desc: 'Blog, social, SEO', group: 'Business' },
    { id: 'community', name: 'Community', emoji: '🤝', schedule: 'Daily 11am', desc: 'Feedback, power users, insights', group: 'Business' },
    { id: 'instagram', name: 'Instagram @gigliftapp', emoji: '📸', schedule: 'Every 6h', desc: 'Brand posts, publishing, analytics', group: 'Business' },
    { id: 'education-outreach', name: 'Education Outreach', emoji: '🎓', schedule: 'MWF 8am', desc: 'Music school prospecting, outreach sequences', group: 'Business' },
];

export default function AdminAgentsDashboard() {
    const [data, setData] = useState<AgentDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [runningAgent, setRunningAgent] = useState<string | null>(null);
    const [agentResult, setAgentResult] = useState<string | null>(null);
    const [showUpdate, setShowUpdate] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);
    const [sentEmails, setSentEmails] = useState<Set<string>>(new Set());
    const [launchingAction, setLaunchingAction] = useState<string | null>(null);
    const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
    const [schedule, setSchedule] = useState<Array<{
        id: string; name: string; emoji: string; cron: string; cronHuman: string;
        description: string; category: string; enabled: boolean; lastRun?: string; lastStatus?: string;
    }>>([]);
    const [togglingAgent, setTogglingAgent] = useState<string | null>(null);
    const [expandedContentId, setExpandedContentId] = useState<string | null>(null);

    function mapTaskToActionId(task: { title: string; category: string; description: string }): string {
        const t = (task.title + ' ' + task.description).toLowerCase();
        if (t.includes('stall') || t.includes('onboard') || t.includes('re-engag') || t.includes('drip') || t.includes('nudge')) return 'stalled_user_drip';
        if (t.includes('upgrade') || t.includes('trial') || t.includes('convert') || t.includes('paid') || t.includes('pro')) return 'trial_upgrade_campaign';
        if (t.includes('referral') || t.includes('refer') || t.includes('invite') || t.includes('share')) return 'referral_activation';
        if (t.includes('win') || t.includes('churn') || t.includes('inactive') || t.includes('lapsed') || t.includes('re-activ')) return 'win_back_campaign';
        // Default based on category
        if (task.category === 'activation') return 'stalled_user_drip';
        if (task.category === 'monetization') return 'trial_upgrade_campaign';
        if (task.category === 'referral') return 'referral_activation';
        if (task.category === 'retention') return 'win_back_campaign';
        return 'stalled_user_drip';
    }

    async function handleLaunchAction(e: React.MouseEvent, task: { id: string; title: string; category: string; description: string }) {
        e.stopPropagation();
        e.preventDefault();
        setLaunchingAction(task.id);
        try {
            const actionId = mapTaskToActionId(task);
            console.log(`[Launch] Starting action: ${actionId} for task: ${task.title}`);
            const res = await fetch('/api/admin/growth-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionId, taskId: task.id }),
            });
            const json = await res.json();
            console.log('[Launch] Response:', json);
            if (json.success) {
                setCompletedActions(prev => new Set(prev).add(task.id));
                alert(`✅ Action completed!\n\n${json.details || json.action || 'Growth action executed successfully'}\n\n${json.metrics ? Object.entries(json.metrics).map(([k, v]) => `• ${k}: ${v}`).join('\n') : ''}`);
            } else {
                alert(`❌ Action failed: ${json.error || 'Unknown error'}\n\nAvailable actions: ${(json.available || []).join(', ')}`);
            }
        } catch (err) {
            console.error('[Launch] Error:', err);
            alert(`❌ Launch failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        setLaunchingAction(null);
    }

    async function handleSendEmail(e: React.MouseEvent, params: { type: 'investor' | 'education'; id: string; to: string; subject: string; body: string }) {
        e.stopPropagation();
        if (!params.to) { alert('No email address for this contact'); return; }
        if (!confirm(`Send email to ${params.to}?`)) return;
        setSendingEmail(params.id);
        try {
            const res = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            const json = await res.json();
            if (json.success) {
                setSentEmails(prev => new Set(prev).add(params.id));
                alert(`✅ Email sent to ${params.to}`);
            } else {
                alert(`❌ Failed: ${json.error}`);
            }
        } catch (err) {
            alert(`❌ Send failed: ${err}`);
        }
        setSendingEmail(null);
    }


    async function fetchData() {
        try {
            let res: Response | undefined;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    res = await fetch('/api/admin/agents');
                    break;
                } catch {
                    if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                }
            }
            if (!res) { setError('Network error — could not reach server'); setLoading(false); return; }
            if (res.status === 403) { setError('Access denied — admin role required'); setLoading(false); return; }
            const json = await res.json();
            setData(json);
        } catch (e) { console.error(e); setError('Failed to load agent data'); }
        setLoading(false);
    }

    useEffect(() => { fetchData(); fetchSchedule(); }, []);

    async function fetchSchedule() {
        try {
            const res = await fetch('/api/admin/schedule');
            if (res.ok) {
                const json = await res.json();
                setSchedule(json.schedule || []);
            }
        } catch { /* silent */ }
    }

    async function handleToggleAgent(agentId: string, currentEnabled: boolean) {
        setTogglingAgent(agentId);
        try {
            const res = await fetch('/api/admin/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId, enabled: !currentEnabled }),
            });
            if (res.ok) {
                setSchedule(prev => prev.map(s => s.id === agentId ? { ...s, enabled: !currentEnabled } : s));
            }
        } catch { /* silent */ }
        setTogglingAgent(null);
    }

    async function triggerAgent(agentId: string) {
        setRunningAgent(agentId);
        setAgentResult(null);
        try {
            const res = await fetch('/api/admin/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId }),
            });
            const json = await res.json();
            setAgentResult(JSON.stringify(json, null, 2));
            // Refresh dashboard data
            fetchData();
        } catch (e) {
            setAgentResult(`Error: ${e}`);
        }
        setRunningAgent(null);
        // Scroll to results area
        setTimeout(() => document.getElementById('agent-results')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }

    if (error) {
        return (
            <>
                <Topbar />
                <main className="main-content fade-in">
                    <div className="empty-state">
                        <div className="empty-icon">🔒</div>
                        <h3>{error}</h3>
                    </div>
                </main>
            </>
        );
    }

    const a = data?.analytics;

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">🤖 Agent Control Center</h2>
                        <p className="section-subtitle">
                            {runningAgent
                                ? `⏳ Running ${AGENT_INFO.find(a => a.id === runningAgent)?.emoji} ${AGENT_INFO.find(a => a.id === runningAgent)?.name}...`
                                : 'Monitor and trigger your autonomous agents'}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <SkeletonPage />
                ) : (
                    <>
                        {/* Revenue & User KPIs */}
                        {a && (
                            <>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>📊 Key Metrics {a.date && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px' }}>as of {a.date}</span>}</h3>
                                <div className="admin-stats-grid" style={{ marginBottom: '28px' }}>
                                    <div className="admin-stat-card" style={{ borderLeft: '3px solid #a855f7' }}>
                                        <div className="admin-stat-value">${a.mrr.toLocaleString()}</div>
                                        <div className="admin-stat-label">MRR</div>
                                    </div>
                                    <div className="admin-stat-card" style={{ borderLeft: '3px solid #38bdf8' }}>
                                        <div className="admin-stat-value">${a.arr.toLocaleString()}</div>
                                        <div className="admin-stat-label">ARR</div>
                                    </div>
                                    <div className="admin-stat-card" style={{ borderLeft: '3px solid #10b981' }}>
                                        <div className="admin-stat-value">{a.totalUsers}</div>
                                        <div className="admin-stat-label">Users</div>
                                    </div>
                                    <div className="admin-stat-card" style={{ borderLeft: '3px solid #f97316' }}>
                                        <div className="admin-stat-value">{a.paidSubscribers}</div>
                                        <div className="admin-stat-label">Paid</div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <div className="admin-stat-value">{a.totalLeads.toLocaleString()}</div>
                                        <div className="admin-stat-label">Leads</div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <div className="admin-stat-value">{a.totalScansThisMonth}</div>
                                        <div className="admin-stat-label">Scans/Mo</div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <div className="admin-stat-value">{a.avgLeadScore}/100</div>
                                        <div className="admin-stat-label">Avg Score</div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <div className="admin-stat-value">{a.trialToPaidRate}%</div>
                                        <div className="admin-stat-label">Trial→Paid</div>
                                    </div>
                                </div>

                                {/* Plan Breakdown */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
                                    {Object.entries(a.planBreakdown).map(([plan, count]) => (
                                        <span key={plan} className={`badge ${plan === 'unlimited' ? 'badge-approved' : plan === 'pro' ? 'badge-scheduled' : 'badge-draft'}`}
                                            style={{ fontSize: '12px' }}>
                                            {plan}: {count}
                                        </span>
                                    ))}
                                    {Object.entries(a.usersByMode).map(([mode, count]) => (
                                        <span key={mode} className="badge" style={{ fontSize: '12px', background: 'rgba(168,85,247,0.15)', color: '#c4b5fd' }}>
                                            {mode}: {count}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ---- Agent Results Display Area ---- */}
                        <div id="agent-results">

                            {/* Investor Outreach Funnel */}
                            {data?.pipeline && (
                                <>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>💰 Investor Outreach</h3>
                                    <div style={{
                                        display: 'flex', gap: '4px', marginBottom: '16px', overflowX: 'auto', padding: '4px 0',
                                    }}>
                                        {PIPELINE_STAGES.map(stage => {
                                            const count = data.pipeline?.[stage.key] || 0;
                                            return (
                                                <div key={stage.key} style={{
                                                    flex: '1', minWidth: '80px', textAlign: 'center', padding: '12px 6px',
                                                    background: count > 0 ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                                                    borderRadius: '8px', border: count > 0 ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                                }}>
                                                    <div style={{ fontSize: '20px' }}>{stage.emoji}</div>
                                                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Investor Table */}
                                    {data.investors.length > 0 && (
                                        <div className="admin-table-wrap" style={{ marginBottom: '16px' }}>
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Investor</th>
                                                        <th>Firm</th>
                                                        <th>Email</th>
                                                        <th>Score</th>
                                                        <th>Status</th>
                                                        <th>Last Contact</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.investors.map((inv, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 500 }}>
                                                                {inv.linkedin ? (
                                                                    <a href={inv.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                                        {inv.name} <span style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>🔗</span>
                                                                    </a>
                                                                ) : inv.name}
                                                            </td>
                                                            <td style={{ color: 'var(--text-muted)' }}>{inv.firm || '—'}</td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                                {inv.email ? (
                                                                    <a href={`mailto:${inv.email}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>{inv.email}</a>
                                                                ) : '—'}
                                                            </td>
                                                            <td>
                                                                <span style={{
                                                                    color: inv.fit_score >= 70 ? '#10b981' : inv.fit_score >= 40 ? '#f97316' : 'var(--text-muted)',
                                                                    fontWeight: 600,
                                                                }}>{inv.fit_score}/100</span>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${inv.status === 'closed' ? 'badge-approved' : inv.status === 'replied' || inv.status === 'intro_call' ? 'badge-scheduled' : inv.status === 'outreach_sent' ? 'badge-draft' : 'badge-draft'}`}>
                                                                    {inv.status.replace(/_/g, ' ')}
                                                                </span>
                                                            </td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                                {inv.last_contacted ? new Date(inv.last_contacted).toLocaleDateString() : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Outreach Drafts */}
                                    {data.outreachDrafts && data.outreachDrafts.length > 0 && (
                                        <>
                                            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '14px', marginTop: '16px' }}>✉️ Outreach Drafts ({data.outreachDrafts.length})</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                                                {data.outreachDrafts.map(draft => (
                                                    <div key={draft.id} style={{
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', overflow: 'hidden',
                                                    }}>
                                                        <div
                                                            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                            onClick={() => setExpandedDraft(expandedDraft === draft.id ? null : draft.id)}
                                                        >
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                                                                    {draft.investor_name} {draft.investor_firm && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>@ {draft.investor_firm}</span>}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📧 {draft.subject}</div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span className={`badge ${draft.status === 'sent' ? 'badge-scheduled' : draft.status === 'replied' ? 'badge-approved' : 'badge-draft'}`}
                                                                    style={{ fontSize: '10px' }}>
                                                                    {draft.status}
                                                                </span>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{expandedDraft === draft.id ? '▼' : '▶'}</span>
                                                            </div>
                                                        </div>
                                                        {expandedDraft === draft.id && (
                                                            <div style={{
                                                                padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
                                                            }}>
                                                                {draft.investor_email && (
                                                                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '10px', marginBottom: '6px' }}>
                                                                        To: {draft.investor_email}
                                                                    </div>
                                                                )}
                                                                <pre style={{
                                                                    fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)',
                                                                    whiteSpace: 'pre-wrap', margin: 0, padding: '10px',
                                                                    background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                                                                }}>
                                                                    {draft.body}
                                                                </pre>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                                        Created: {new Date(draft.created_at).toLocaleString()}
                                                                    </div>
                                                                    {draft.investor_email && draft.status !== 'sent' && !sentEmails.has(draft.id) && (
                                                                        <button
                                                                            onClick={(e) => handleSendEmail(e, { type: 'investor', id: draft.id, to: draft.investor_email, subject: draft.subject, body: draft.body })}
                                                                            disabled={sendingEmail === draft.id}
                                                                            style={{
                                                                                background: sendingEmail === draft.id ? 'rgba(168,85,247,0.2)' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                                                                                color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 16px',
                                                                                fontSize: '12px', fontWeight: 600, cursor: sendingEmail === draft.id ? 'wait' : 'pointer',
                                                                            }}
                                                                        >
                                                                            {sendingEmail === draft.id ? '⏳ Sending...' : '📤 Send Email'}
                                                                        </button>
                                                                    )}
                                                                    {(draft.status === 'sent' || sentEmails.has(draft.id)) && (
                                                                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>✅ Sent</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0 20px' }} />

                            {/* Content Queue */}
                            {data?.contentQueue && data.contentQueue.length > 0 && (
                                <>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>📝 Content Queue</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                                        {data.contentQueue.map((item: { id: string; title: string; content_type: string; platform: string; status: string; body: string }) => {
                                            const isExpanded = expandedContentId === item.id;
                                            const typeLabel = item.content_type === 'twitter_thread' ? '🐦 Thread' : item.content_type === 'linkedin_post' ? '💼 LinkedIn' : item.content_type === 'blog' ? '📄 Blog' : item.content_type;
                                            return (
                                                <div key={item.id} style={{
                                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
                                                    transition: 'border-color 0.15s',
                                                    borderColor: isExpanded ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)',
                                                }} onClick={() => setExpandedContentId(isExpanded ? null : item.id)}>
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '12px 16px', gap: '12px',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                            <span style={{ fontSize: '18px', flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>
                                                            <span style={{
                                                                fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            }}>{item.title}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                            <span className="badge badge-draft" style={{ fontSize: '11px' }}>{typeLabel}</span>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.platform}</span>
                                                            <span className={`badge ${item.status === 'published' ? 'badge-approved' : 'badge-draft'}`}>{item.status}</span>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div style={{
                                                            padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                                                        }} onClick={e => e.stopPropagation()}>
                                                            <div style={{
                                                                background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '16px',
                                                                marginTop: '12px', fontSize: '13px', lineHeight: '1.7',
                                                                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                                                                maxHeight: '400px', overflowY: 'auto',
                                                            }}>
                                                                {item.body}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }}
                                                                    onClick={() => { navigator.clipboard.writeText(item.body); }}>
                                                                    📋 Copy to Clipboard
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0 20px' }} />

                            {/* Growth Recommendations */}
                            {data?.growthTasks && data.growthTasks.length > 0 && (
                                <>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                                        🚀 Growth Recommendations
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                                            ({data.growthTasks.filter(t => t.type === 'manual').length} manual · {data.growthTasks.filter(t => t.type === 'automated').length} automated)
                                        </span>
                                    </h3>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                        gap: '10px', marginBottom: '28px',
                                    }}>
                                        {data.growthTasks.map(task => {
                                            const priorityColor = task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f97316' : '#6b7280';
                                            const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
                                            const typeEmoji = task.type === 'automated' ? '⚙️' : '✋';
                                            const catBadge = task.category === 'acquisition' ? '🎯' : task.category === 'activation' ? '⚡' : task.category === 'retention' ? '🔄' : task.category === 'referral' ? '📣' : task.category === 'monetization' ? '💰' : '📌';
                                            return (
                                                <div key={task.id} style={{
                                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '10px', padding: '14px 16px',
                                                    borderLeft: `3px solid ${priorityColor}`,
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                                            {typeEmoji} {task.title}
                                                        </div>
                                                        <span style={{ fontSize: '10px', color: priorityColor, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                                            {priorityEmoji} {task.priority}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 8px' }}>
                                                        {task.description}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span className="badge badge-draft" style={{ fontSize: '10px' }}>
                                                            {catBadge} {task.category}
                                                        </span>
                                                        <span className="badge" style={{ fontSize: '10px', background: task.type === 'automated' ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)', color: task.type === 'automated' ? '#38bdf8' : '#c4b5fd' }}>
                                                            {typeEmoji} {task.type}
                                                        </span>
                                                        <div style={{ flex: 1 }} />
                                                        {task.type === 'automated' && task.status !== 'completed' && !completedActions.has(task.id) && (
                                                            <button
                                                                onClick={(e) => handleLaunchAction(e, task)}
                                                                disabled={launchingAction === task.id}
                                                                style={{
                                                                    background: launchingAction === task.id ? 'rgba(56,189,248,0.2)' : 'linear-gradient(135deg, #38bdf8, #6366f1)',
                                                                    color: '#fff', border: 'none', borderRadius: '8px', padding: '5px 14px',
                                                                    fontSize: '11px', fontWeight: 600, cursor: launchingAction === task.id ? 'wait' : 'pointer',
                                                                }}
                                                            >
                                                                {launchingAction === task.id ? '⏳ Running...' : '🚀 Launch'}
                                                            </button>
                                                        )}
                                                        {(task.status === 'completed' || completedActions.has(task.id)) && (
                                                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>✅ Done</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0 20px' }} />

                            {/* CFO Insights */}
                            {data?.cfoInsights && data.cfoInsights.length > 0 && (
                                <>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                                        📊 CFO Insights
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                                            as of {data.cfoInsights[0].date}
                                        </span>
                                    </h3>
                                    {(() => {
                                        const insight = data.cfoInsights[0];
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                                                {/* Summary banner */}
                                                <div style={{
                                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(56,189,248,0.1))',
                                                    border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '16px',
                                                }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>🎯 Executive Summary</div>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{insight.summary}</p>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                                                    {/* Revenue Health */}
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', padding: '14px 16px', borderLeft: '3px solid #10b981',
                                                    }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>💵 Revenue Health</div>
                                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{insight.revenue_health}</p>
                                                    </div>

                                                    {/* Unit Economics */}
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', padding: '14px 16px', borderLeft: '3px solid #38bdf8',
                                                    }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>📈 Unit Economics</div>
                                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{insight.unit_economics}</p>
                                                    </div>

                                                    {/* Risk Flags */}
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', padding: '14px 16px', borderLeft: '3px solid #ef4444',
                                                    }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>⚠️ Risk Flags</div>
                                                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                                            {insight.risk_flags.map((flag: string, i: number) => <li key={i}>{flag}</li>)}
                                                        </ul>
                                                    </div>

                                                    {/* Recommended Actions */}
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', padding: '14px 16px', borderLeft: '3px solid #a855f7',
                                                    }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>✅ Recommended Actions</div>
                                                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                                            {insight.recommended_actions.map((action: string, i: number) => <li key={i}>{action}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>

                                                {/* Runway */}
                                                <div style={{
                                                    background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                                                    borderRadius: '10px', padding: '12px 16px',
                                                }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#f97316' }}>⏱️ Runway: </span>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{insight.runway_assessment}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0 20px' }} />

                            {/* Education Outreach */}
                            {data?.schoolPipeline && data.schoolPipeline.total > 0 && (
                                <>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                                        🎓 Education Outreach
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                                            {data.schoolPipeline.total} schools in pipeline
                                        </span>
                                    </h3>

                                    {/* Pipeline funnel badges */}
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                        {Object.entries(data.schoolPipeline.byStatus).map(([status, count]) => {
                                            const colors: Record<string, string> = {
                                                prospected: '#6b7280', contacted: '#f97316', responded: '#3b82f6',
                                                partnered: '#10b981', active: '#a855f7',
                                            };
                                            return (
                                                <span key={status} className="badge" style={{
                                                    fontSize: '11px', background: `${colors[status] || '#6b7280'}22`,
                                                    color: colors[status] || '#6b7280', border: `1px solid ${colors[status] || '#6b7280'}44`,
                                                }}>
                                                    {status}: {count as number}
                                                </span>
                                            );
                                        })}
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 0' }}>|</span>
                                        {Object.entries(data.schoolPipeline.byTier).map(([tier, count]) => (
                                            <span key={tier} className="badge badge-draft" style={{ fontSize: '11px' }}>
                                                {tier === 'conservatory' ? '🏛️' : tier === 'university' ? '🎓' : '🏫'} {tier}: {count as number}
                                            </span>
                                        ))}
                                    </div>

                                    {/* School list table */}
                                    <div className="admin-table-wrap" style={{ marginBottom: '16px' }}>
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>School</th>
                                                    <th>Tier</th>
                                                    <th>Location</th>
                                                    <th>Status</th>
                                                    <th>Step</th>
                                                    <th>Signups</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.schoolPipeline.schools.slice(0, 15).map(school => {
                                                    const statusColor: Record<string, string> = {
                                                        prospected: '#6b7280', contacted: '#f97316', responded: '#3b82f6',
                                                        partnered: '#10b981', active: '#a855f7',
                                                    };
                                                    return (
                                                        <tr key={school.id}>
                                                            <td style={{ fontWeight: 500 }}>{school.school_name}</td>
                                                            <td><span className="badge badge-draft" style={{ fontSize: '10px' }}>
                                                                {school.tier === 'conservatory' ? '🏛️' : '🎓'} {school.tier}
                                                            </span></td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{school.location}</td>
                                                            <td><span className="badge" style={{ fontSize: '10px', color: statusColor[school.status] || '#6b7280', background: `${statusColor[school.status] || '#6b7280'}22` }}>
                                                                {school.status}
                                                            </span></td>
                                                            <td style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                {school.outreach_step}/4
                                                            </td>
                                                            <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: school.signups > 0 ? 600 : 400, color: school.signups > 0 ? '#10b981' : 'var(--text-muted)' }}>
                                                                {school.signups}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Recent outreach emails */}
                                    {data.schoolPipeline.recentOutreach.length > 0 && (
                                        <div style={{ marginBottom: '28px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>✉️ Recent Outreach Drafts</div>
                                            {data.schoolPipeline.recentOutreach.slice(0, 5).map(email => (
                                                <div key={email.id} style={{
                                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '8px', padding: '10px 14px', marginBottom: '6px',
                                                    cursor: 'pointer',
                                                }}
                                                    onClick={() => setExpandedDraft(expandedDraft === email.id ? null : email.id)}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                            Step {email.step}/4: {email.subject}
                                                        </span>
                                                        <span className="badge badge-draft" style={{ fontSize: '10px' }}>{email.status}</span>
                                                    </div>
                                                    {expandedDraft === email.id && (
                                                        <div>
                                                            <pre style={{
                                                                fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                                                marginTop: '8px', lineHeight: '1.5', background: 'rgba(0,0,0,0.2)',
                                                                padding: '10px', borderRadius: '6px',
                                                            }}>
                                                                {email.body}
                                                            </pre>
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                                                {email.status !== 'sent' && !sentEmails.has(email.id) ? (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const school = data?.schoolPipeline?.schools.find(s => data?.schoolPipeline?.recentOutreach.find(o => o.id === email.id && o.school_id === s.id));
                                                                            handleSendEmail(e, { type: 'education', id: email.id, to: school?.contact_email || '', subject: email.subject, body: email.body });
                                                                        }}
                                                                        disabled={sendingEmail === email.id}
                                                                        style={{
                                                                            background: sendingEmail === email.id ? 'rgba(168,85,247,0.2)' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                                                                            color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 16px',
                                                                            fontSize: '12px', fontWeight: 600, cursor: sendingEmail === email.id ? 'wait' : 'pointer',
                                                                        }}
                                                                    >
                                                                        {sendingEmail === email.id ? '⏳ Sending...' : '📤 Send Email'}
                                                                    </button>
                                                                ) : (
                                                                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>✅ Sent</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                        </div>{/* end agent-results */}

                        {/* Weekly Investor Update */}
                        {data?.weeklyUpdate && (
                            <>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px', cursor: 'pointer' }}
                                    onClick={() => setShowUpdate(!showUpdate)}>
                                    📨 Weekly Investor Update {showUpdate ? '▼' : '▶'}
                                </h3>
                                {showUpdate && (
                                    <pre style={{
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px', padding: '20px', fontSize: '13px', lineHeight: '1.6',
                                        color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '28px',
                                        maxHeight: '400px', overflowY: 'auto',
                                    }}>
                                        {data.weeklyUpdate}
                                    </pre>
                                )}
                            </>
                        )}

                        {/* Agent Status Grid */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>⚡ Agent Controls</h3>
                        </div>

                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👨‍💻 DevOps & CI/CD</h4>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '12px', marginBottom: '24px',
                        }}>
                            {AGENT_INFO.filter(a => a.group === 'DevOps').map(agent => {
                                const stats = data?.agentStats?.[agent.id];
                                const statusColor = stats?.lastStatus === 'success' ? '#10b981' : stats?.lastStatus === 'warning' ? '#f97316' : stats?.lastStatus === 'failed' ? '#ef4444' : 'var(--text-muted)';
                                return (
                                    <div key={agent.id} style={{
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px', padding: '16px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {agent.emoji} {agent.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{agent.desc}</div>
                                            </div>
                                            <span className="badge badge-draft" style={{ fontSize: '10px', flexShrink: 0 }}>{agent.schedule}</span>
                                        </div>
                                        {stats && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', fontSize: '11px' }}>
                                                <span style={{ color: statusColor, fontWeight: 600 }}>● {stats.lastStatus}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>{stats.runs} runs (7d)</span>
                                                {stats.lastRun && <span style={{ color: 'var(--text-muted)' }}>Last: {new Date(stats.lastRun + 'Z').toLocaleDateString()}</span>}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: '12px', flex: 1 }}
                                                onClick={() => triggerAgent(agent.id)}
                                                disabled={runningAgent === agent.id}
                                            >
                                                {runningAgent === agent.id ? '⏳ Running...' : '▶ Run Now'}
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: '12px', flex: 1, color: 'var(--accent-cyan)' }}
                                                onClick={() => {
                                                    setSelectedAgent(selectedAgent === agent.id ? null : agent.id);
                                                    document.getElementById('activity-log')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                            >
                                                📜 View Logs
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💼 Business Operations</h4>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '12px', marginBottom: '28px',
                        }}>
                            {AGENT_INFO.filter(a => a.group === 'Business').map(agent => {
                                const stats = data?.agentStats?.[agent.id];
                                const statusColor = stats?.lastStatus === 'success' ? '#10b981' : stats?.lastStatus === 'warning' ? '#f97316' : stats?.lastStatus === 'failed' ? '#ef4444' : 'var(--text-muted)';
                                return (
                                    <div key={agent.id} style={{
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px', padding: '16px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {agent.emoji} {agent.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{agent.desc}</div>
                                            </div>
                                            <span className="badge badge-draft" style={{ fontSize: '10px', flexShrink: 0 }}>{agent.schedule}</span>
                                        </div>
                                        {stats && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', fontSize: '11px' }}>
                                                <span style={{ color: statusColor, fontWeight: 600 }}>● {stats.lastStatus}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>{stats.runs} runs (7d)</span>
                                                {stats.lastRun && <span style={{ color: 'var(--text-muted)' }}>Last: {new Date(stats.lastRun + 'Z').toLocaleDateString()}</span>}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: '12px', flex: 1 }}
                                                onClick={() => triggerAgent(agent.id)}
                                                disabled={runningAgent === agent.id}
                                            >
                                                {runningAgent === agent.id ? '⏳ Running...' : '▶ Run Now'}
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: '12px', flex: 1, color: 'var(--accent-cyan)' }}
                                                onClick={() => {
                                                    setSelectedAgent(selectedAgent === agent.id ? null : agent.id);
                                                    document.getElementById('activity-log')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                            >
                                                📜 View Logs
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Agent Result Output */}
                        {agentResult && (
                            <>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>📋 Last Run Output</h3>
                                <pre style={{
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px', padding: '20px', fontSize: '12px', lineHeight: '1.5',
                                    color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '28px',
                                    maxHeight: '500px', overflowY: 'auto',
                                }}>
                                    {agentResult}
                                </pre>
                            </>
                        )}

                        {/* ── Agent Schedule ── */}
                        {schedule.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>
                                    ⏰ Agent Schedule
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                                        {schedule.filter(s => s.enabled).length}/{schedule.length} active
                                    </span>
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                                    {schedule.map(agent => (
                                        <div key={agent.id} style={{
                                            background: agent.enabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                                            border: `1px solid ${agent.enabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                                            borderRadius: '10px', padding: '14px 16px',
                                            opacity: agent.enabled ? 1 : 0.5,
                                            transition: 'all 0.2s ease',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '18px' }}>{agent.emoji}</span>
                                                    <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{agent.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleAgent(agent.id, agent.enabled)}
                                                    disabled={togglingAgent === agent.id}
                                                    style={{
                                                        width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                                                        background: agent.enabled ? '#10b981' : 'rgba(255,255,255,0.1)',
                                                        position: 'relative', transition: 'background 0.2s ease',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                                                        position: 'absolute', top: '3px',
                                                        left: agent.enabled ? '21px' : '3px',
                                                        transition: 'left 0.2s ease',
                                                    }} />
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{agent.description}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>{agent.cronHuman}</span>
                                                {agent.lastRun && (
                                                    <span className={`badge ${agent.lastStatus === 'success' ? 'badge-approved' : agent.lastStatus === 'failed' ? 'badge-rejected' : 'badge-warning'}`}
                                                        style={{ fontSize: '10px' }}>
                                                        {agent.lastStatus === 'success' ? '✅' : agent.lastStatus === 'failed' ? '❌' : '⚠️'} {new Date(agent.lastRun).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Agent Activity Log — always visible */}
                        <div id="activity-log" style={{ paddingTop: '8px' }}>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                                📜 Agent Activity Log
                                {selectedAgent && (
                                    <span style={{ fontSize: '13px', color: 'var(--accent-cyan)', marginLeft: '8px', fontWeight: 400 }}>
                                        — {AGENT_INFO.find(a => a.id === selectedAgent)?.emoji} {AGENT_INFO.find(a => a.id === selectedAgent)?.name}
                                        <button
                                            onClick={() => setSelectedAgent(null)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', marginLeft: '6px' }}
                                        >✕ clear</button>
                                    </span>
                                )}
                            </h3>
                            {/* Filter pills */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                <button
                                    className={`badge ${!selectedAgent ? 'badge-approved' : 'badge-draft'}`}
                                    style={{ cursor: 'pointer', border: 'none', fontSize: '11px' }}
                                    onClick={() => setSelectedAgent(null)}
                                >All Agents</button>
                                {AGENT_INFO.map(a => (
                                    <button
                                        key={a.id}
                                        className={`badge ${selectedAgent === a.id ? 'badge-scheduled' : 'badge-draft'}`}
                                        style={{ cursor: 'pointer', border: 'none', fontSize: '11px' }}
                                        onClick={() => setSelectedAgent(selectedAgent === a.id ? null : a.id)}
                                    >{a.emoji} {a.name}</button>
                                ))}
                            </div>

                            {data?.agentRuns && data.agentRuns.filter(run => !selectedAgent || run.agent_id === selectedAgent).length > 0 ? (
                                <div className="admin-table-wrap" style={{ marginBottom: '28px' }}>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Agent</th>
                                                <th>Status</th>
                                                <th>Summary</th>
                                                <th>Alerts</th>
                                                <th>Duration</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.agentRuns
                                                .filter(run => !selectedAgent || run.agent_id === selectedAgent)
                                                .map((run) => {
                                                    const statusEmoji = run.status === 'success' ? '🟢' : run.status === 'warning' ? '🟡' : run.status === 'failed' ? '🔴' : '⏳';
                                                    const statusColor = run.status === 'success' ? '#10b981' : run.status === 'warning' ? '#f97316' : run.status === 'failed' ? '#ef4444' : '#6b7280';
                                                    return (
                                                        <tr key={run.id}>
                                                            <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                                {run.agent_name}
                                                            </td>
                                                            <td>
                                                                <span style={{ color: statusColor, fontWeight: 600, fontSize: '12px' }}>
                                                                    {statusEmoji} {run.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                                {run.error || run.summary || '—'}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {run.alerts_count > 0 ? (
                                                                    <span className="badge" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', fontSize: '11px' }}>
                                                                        {run.alerts_count} ⚠️
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                                                )}
                                                            </td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                                {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '...'}
                                                            </td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                                {run.started_at ? new Date(run.started_at + 'Z').toLocaleString() : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px', padding: '32px', textAlign: 'center', marginBottom: '28px',
                                }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📜</div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                                        {selectedAgent
                                            ? `No activity logs for ${AGENT_INFO.find(a => a.id === selectedAgent)?.name || selectedAgent} yet. Click "▶ Run Now" above to trigger a run.`
                                            : 'No agent activity logs yet. Run an agent above to generate your first log entry.'}
                                    </p>
                                </div>
                            )}
                        </div>
                        {/* No data state */}
                        {!a && !data?.pipeline && data?.contentQueue?.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">🤖</div>
                                <h3>No agent data yet</h3>
                                <p>Run an agent above to generate your first metrics snapshot.</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
