'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
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
    contentQueue: Array<{ title: string; content_type: string; platform: string; status: string }>;
    growthTasks: Array<{ id: string; type: string; priority: string; title: string; description: string; category: string; status: string; created_at: string }>;
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
    { id: 'qa', name: 'QA Agent', emoji: '🧪', schedule: 'Daily 4:30am', desc: 'Build validation, health checks, integration tests' },
    { id: 'cost-guardian', name: 'Cost Guardian', emoji: '🛡️', schedule: 'Daily 5am', desc: 'Infra costs, guardrails, budget alerts' },
    { id: 'analytics', name: 'Analytics', emoji: '📊', schedule: 'Daily 6am', desc: 'KPIs, revenue, anomalies' },
    { id: 'growth-ops', name: 'Growth Ops', emoji: '🚀', schedule: 'Daily 7am', desc: 'Onboarding, funnel, ambassadors' },
    { id: 'customer-success', name: 'Customer Success', emoji: '🎯', schedule: 'Daily 8am', desc: 'Health scores, churn, upgrades' },
    { id: 'investor-pipeline', name: 'Investor Outreach', emoji: '💰', schedule: 'M-F 9am', desc: 'CRM, scoring, outreach' },
    { id: 'content-marketing', name: 'Content Marketing', emoji: '📝', schedule: 'MWF 10am', desc: 'Blog, social, SEO' },
    { id: 'community', name: 'Community', emoji: '🤝', schedule: 'Daily 11am', desc: 'Feedback, power users, insights' },
    { id: 'instagram', name: 'Instagram @gigliftapp', emoji: '📸', schedule: 'Every 6h', desc: 'Brand posts, publishing, analytics' },
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


    async function fetchData() {
        try {
            const res = await fetch('/api/admin/agents');
            if (res.status === 403) { setError('Access denied — admin role required'); return; }
            const json = await res.json();
            setData(json);
        } catch (e) { console.error(e); setError('Failed to load agent data'); }
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

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
                        <p className="section-subtitle">Monitor and trigger your 9 autonomous agents</p>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
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
                                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                                                Created: {new Date(draft.created_at).toLocaleString()}
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

                        {/* Content Queue */}
                        {data?.contentQueue && data.contentQueue.length > 0 && (
                            <>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>📝 Content Queue</h3>
                                <div className="admin-table-wrap" style={{ marginBottom: '28px' }}>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Type</th>
                                                <th>Platform</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.contentQueue.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.title}
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-draft" style={{ fontSize: '11px' }}>
                                                            {item.content_type === 'twitter_thread' ? '🐦 Thread' : item.content_type === 'linkedin_post' ? '💼 LinkedIn' : item.content_type === 'blog' ? '📄 Blog' : item.content_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.platform}</td>
                                                    <td><span className={`badge ${item.status === 'published' ? 'badge-approved' : 'badge-draft'}`}>{item.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

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
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span className="badge badge-draft" style={{ fontSize: '10px' }}>
                                                        {catBadge} {task.category}
                                                    </span>
                                                    <span className="badge" style={{ fontSize: '10px', background: task.type === 'automated' ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)', color: task.type === 'automated' ? '#38bdf8' : '#c4b5fd' }}>
                                                        {typeEmoji} {task.type}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

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
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>⚡ Agent Controls</h3>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '12px', marginBottom: '28px',
                        }}>
                            {AGENT_INFO.map(agent => {
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
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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
