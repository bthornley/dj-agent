'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

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

interface AgentDashboardData {
    analytics: AnalyticsData | null;
    history: Array<{ date: string; mrr: number; users: number }>;
    pipeline: Record<string, number> | null;
    investors: Array<{ name: string; firm: string; fit_score: number; status: string }>;
    contentQueue: Array<{ title: string; content_type: string; platform: string; status: string }>;
    weeklyUpdate: string | null;
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
    { id: 'investor-pipeline', name: 'Investor Pipeline', emoji: '💰', schedule: 'M-F 9am', desc: 'CRM, scoring, outreach' },
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

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        try {
            const res = await fetch('/api/admin/agents');
            if (res.status === 403) { setError('Access denied — admin role required'); return; }
            const json = await res.json();
            setData(json);
        } catch (e) { console.error(e); setError('Failed to load agent data'); }
        setLoading(false);
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
    }

    if (error) {
        return (
            <>
                <header className="topbar">
                    <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                        <img src="/logo.png" alt="GigLift" style={{ width: 56, height: 56, borderRadius: 12, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                        <span>GigLift</span>
                    </Link>
                    <nav className="topbar-nav"><UserButton /></nav>
                </header>
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
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 56, height: 56, borderRadius: 12, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/admin" className="btn btn-ghost btn-sm">🛡️ Admin</Link>
                    <Link href="/admin/agents" className="btn btn-secondary btn-sm">🤖 Agents</Link>
                    <Link href="/admin/docs" className="btn btn-ghost btn-sm">📄 Docs</Link>
                    <Link href="/admin/instagram" className="btn btn-ghost btn-sm">📸 Instagram</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">🤖 Agent Control Center</h2>
                        <p className="section-subtitle">Monitor and trigger your 7 autonomous agents</p>
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

                        {/* Investor Pipeline Funnel */}
                        {data?.pipeline && (
                            <>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>💰 Investor Pipeline</h3>
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
                                    <div className="admin-table-wrap" style={{ marginBottom: '28px' }}>
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Investor</th>
                                                    <th>Firm</th>
                                                    <th>Score</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.investors.map((inv, i) => (
                                                    <tr key={i}>
                                                        <td style={{ fontWeight: 500 }}>{inv.name}</td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{inv.firm || '—'}</td>
                                                        <td>
                                                            <span style={{
                                                                color: inv.fit_score >= 70 ? '#10b981' : inv.fit_score >= 40 ? '#f97316' : 'var(--text-muted)',
                                                                fontWeight: 600,
                                                            }}>{inv.fit_score}/100</span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${inv.status === 'closed' ? 'badge-approved' : inv.status === 'replied' || inv.status === 'intro_call' ? 'badge-scheduled' : 'badge-draft'}`}>
                                                                {inv.status.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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
                            {AGENT_INFO.map(agent => (
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
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ fontSize: '12px', width: '100%', marginTop: '8px' }}
                                        onClick={() => triggerAgent(agent.id)}
                                        disabled={runningAgent === agent.id}
                                    >
                                        {runningAgent === agent.id ? '⏳ Running...' : '▶ Run Now'}
                                    </button>
                                </div>
                            ))}
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
