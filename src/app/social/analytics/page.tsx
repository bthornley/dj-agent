'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { WeeklyReport } from '@/lib/types';

export default function AnalyticsPage() {
    const [weekOf, setWeekOf] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0];
    });
    const [reach, setReach] = useState('');
    const [impressions, setImpressions] = useState('');
    const [saves, setSaves] = useState('');
    const [shares, setShares] = useState('');
    const [comments, setComments] = useState('');
    const [followerGrowth, setFollowerGrowth] = useState('');
    const [profileVisits, setProfileVisits] = useState('');
    const [linkClicks, setLinkClicks] = useState('');
    const [report, setReport] = useState<WeeklyReport | null>(null);
    const [generating, setGenerating] = useState(false);

    async function handleGenerate() {
        setGenerating(true);
        try {
            const res = await fetch('/api/social/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekOf,
                    stats: {
                        reach: Number(reach) || 0,
                        impressions: Number(impressions) || 0,
                        saves: Number(saves) || 0,
                        shares: Number(shares) || 0,
                        comments: Number(comments) || 0,
                        followerGrowth: Number(followerGrowth) || 0,
                        profileVisits: Number(profileVisits) || 0,
                        linkClicks: Number(linkClicks) || 0,
                    },
                }),
            });
            const data = await res.json();
            if (data.report) setReport(data.report);
        } catch (e) { console.error(e); }
        setGenerating(false);
    }

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/social" className="btn btn-ghost btn-sm">📱 Social</Link>
                    <Link href="/social/queue" className="btn btn-ghost btn-sm">📝 Queue</Link>
                    <Link href="/social/brand" className="btn btn-ghost btn-sm">🎨 Brand</Link>
                    <Link href="/social/analytics" className="btn btn-secondary btn-sm">📊 Analytics</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Weekly Analytics</h2>
                        <p className="section-subtitle">Enter your stats from Meta Insights — the Analytics Agent generates your report</p>
                    </div>
                </div>

                <div className="analytics-layout">
                    {/* Stats Input */}
                    <div className="card analytics-input-card">
                        <h3 className="card-title">📊 Enter Weekly Stats</h3>
                        <div className="form-group">
                            <label className="form-label">Week Of</label>
                            <input className="input" type="date" value={weekOf}
                                onChange={e => setWeekOf(e.target.value)} />
                        </div>
                        <div className="stats-input-grid">
                            <div className="form-group">
                                <label className="form-label">Reach</label>
                                <input className="input" type="number" value={reach}
                                    onChange={e => setReach(e.target.value)} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Impressions</label>
                                <input className="input" type="number" value={impressions}
                                    onChange={e => setImpressions(e.target.value)} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Saves</label>
                                <input className="input" type="number" value={saves}
                                    onChange={e => setSaves(e.target.value)} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Shares</label>
                                <input className="input" type="number" value={shares}
                                    onChange={e => setShares(e.target.value)} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Comments</label>
                                <input className="input" type="number" value={comments}
                                    onChange={e => setComments(e.target.value)} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Follower Growth</label>
                                <input className="input" type="number" value={followerGrowth}
                                    onChange={e => setFollowerGrowth(e.target.value)} placeholder="+0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Profile Visits</label>
                                <input className="input" type="number" value={profileVisits}
                                    onChange={e => setProfileVisits(e.target.value)} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Link Clicks</label>
                                <input className="input" type="number" value={linkClicks}
                                    onChange={e => setLinkClicks(e.target.value)} placeholder="0" />
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}
                            style={{ width: '100%', marginTop: '12px' }}>
                            {generating ? '⏳ Generating Report...' : '🧠 Generate Weekly Report'}
                        </button>
                    </div>

                    {/* Report Output */}
                    {report && (
                        <div className="card analytics-report-card slide-up">
                            <h3 className="card-title">📋 Weekly Report — {report.weekOf}</h3>

                            <div className="report-stats-row">
                                <div className="report-stat">
                                    <div className="report-stat-value">{report.reach.toLocaleString()}</div>
                                    <div className="report-stat-label">Reach</div>
                                </div>
                                <div className="report-stat">
                                    <div className="report-stat-value">{(report.saves + report.shares + report.comments).toLocaleString()}</div>
                                    <div className="report-stat-label">Total Engagement</div>
                                </div>
                                <div className="report-stat">
                                    <div className="report-stat-value">+{report.followerGrowth}</div>
                                    <div className="report-stat-label">Followers</div>
                                </div>
                                <div className="report-stat">
                                    <div className="report-stat-value">{report.linkClicks}</div>
                                    <div className="report-stat-label">Link Clicks</div>
                                </div>
                            </div>

                            <div className="report-section">
                                <h4>💡 Insights</h4>
                                <ul className="report-list">
                                    {report.insights.map((insight, i) => (
                                        <li key={i} className="report-insight">{insight}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="report-section">
                                <h4>🎯 Recommendations</h4>
                                <ul className="report-list">
                                    {report.recommendations.map((rec, i) => (
                                        <li key={i} className="report-recommendation">{rec}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="report-breakdown">
                                <div className="report-breakdown-item">
                                    <span className="report-breakdown-label">Saves</span>
                                    <span className="report-breakdown-value">{report.saves}</span>
                                </div>
                                <div className="report-breakdown-item">
                                    <span className="report-breakdown-label">Shares</span>
                                    <span className="report-breakdown-value">{report.shares}</span>
                                </div>
                                <div className="report-breakdown-item">
                                    <span className="report-breakdown-label">Comments</span>
                                    <span className="report-breakdown-value">{report.comments}</span>
                                </div>
                                <div className="report-breakdown-item">
                                    <span className="report-breakdown-label">Profile Visits</span>
                                    <span className="report-breakdown-value">{report.profileVisits}</span>
                                </div>
                                <div className="report-breakdown-item">
                                    <span className="report-breakdown-label">Impressions</span>
                                    <span className="report-breakdown-value">{report.impressions.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
