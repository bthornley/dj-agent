'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import { WeeklyReport } from '@/lib/types';

export default function AnalyticsDashboardPage() {
    const [report, setReport] = useState<WeeklyReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/social/analytics')
            .then(r => r.json())
            .then(data => {
                if (data.report) setReport(data.report);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const formatNum = (num: number) => {
        if (num >= 10000) return (num / 1000).toFixed(1) + 'k';
        return num.toLocaleString();
    };

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <Link href="/social" className="back-link" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '13px', display: 'inline-block', marginBottom: '8px' }}>← Back to Social Hub</Link>
                        <h2 className="section-title">Performance Analytics</h2>
                        <p className="section-subtitle">Multi-platform insights & AI recommendations</p>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : !report ? (
                    <div className="empty-state">
                        <p>No analytics data available yet. Start posting to build your audience!</p>
                    </div>
                ) : (
                    <>
                        {/* Weekly KPI Row */}
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '28px' }}>
                            <div className="stat-card">
                                <div className="stat-value">{formatNum(report.reach)}</div>
                                <div className="stat-label">Total Reach</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{formatNum(report.impressions)}</div>
                                <div className="stat-label">Impressions</div>
                            </div>
                            <div className="stat-card" style={{ border: '1px solid var(--accent-green-dim)' }}>
                                <div className="stat-value" style={{ color: 'var(--accent-green)' }}>+{formatNum(report.followerGrowth)}</div>
                                <div className="stat-label">New Followers</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{formatNum(report.profileVisits)}</div>
                                <div className="stat-label">Profile Visits</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{formatNum(report.saves + report.shares + report.comments)}</div>
                                <div className="stat-label">Total Engagements</div>
                            </div>
                        </div>

                        <div className="social-grid">
                            {/* AI Insights */}
                            <div className="card">
                                <h3 className="card-title">💡 The Coach: AI Insights</h3>
                                <div className="engagement-list" style={{ marginTop: '16px' }}>
                                    {report.insights.map((insight, i) => (
                                        <div key={i} className="engagement-item" style={{ padding: '12px', background: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '8px' }}>
                                            {insight}
                                        </div>
                                    ))}
                                    {report.insights.length === 0 && (
                                        <p style={{ color: 'var(--text-muted)' }}>Not enough data to generate insights yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* AI Recommendations */}
                            <div className="card">
                                <h3 className="card-title" style={{ color: 'var(--accent-amber)' }}>🎯 Strategy Recommendations</h3>
                                <div className="engagement-list" style={{ marginTop: '16px' }}>
                                    {report.recommendations.map((rec, i) => (
                                        <div key={i} className="engagement-item" style={{ padding: '12px', borderLeft: '3px solid var(--accent-amber)', background: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '8px' }}>
                                            <strong>Action:</strong> {rec}
                                        </div>
                                    ))}
                                    {report.recommendations.length === 0 && (
                                        <p style={{ color: 'var(--text-muted)' }}>Keep up the great work!</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Breakdown Row */}
                        <div className="card" style={{ marginTop: '24px' }}>
                            <h3 className="card-title">📊 Engagement Breakdown</h3>
                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginTop: '16px' }}>
                                <div className="stat-card" style={{ background: 'var(--surface-raised)', border: 'none' }}>
                                    <div className="stat-value" style={{ fontSize: '20px' }}>{formatNum(report.saves)}</div>
                                    <div className="stat-label">Saves</div>
                                </div>
                                <div className="stat-card" style={{ background: 'var(--surface-raised)', border: 'none' }}>
                                    <div className="stat-value" style={{ fontSize: '20px' }}>{formatNum(report.shares)}</div>
                                    <div className="stat-label">Shares</div>
                                </div>
                                <div className="stat-card" style={{ background: 'var(--surface-raised)', border: 'none' }}>
                                    <div className="stat-value" style={{ fontSize: '20px' }}>{formatNum(report.comments)}</div>
                                    <div className="stat-label">Comments</div>
                                </div>
                                <div className="stat-card" style={{ background: 'var(--surface-raised)', border: 'none' }}>
                                    <div className="stat-value" style={{ fontSize: '20px' }}>{formatNum(report.linkClicks)}</div>
                                    <div className="stat-label">Link Clicks</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: 'var(--md-surface-container-high)', border: '1px solid var(--md-outline-variant)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '20px' }}>🔌</span>
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Connected Platforms Setup</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                                    Your Instagram, TikTok, and Facebook data streams are synchronized properly. Data updates occur nightly.
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
