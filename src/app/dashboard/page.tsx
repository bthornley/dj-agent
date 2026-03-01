'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import AdminLink from '@/components/AdminLink';
import ModeSwitch from '@/components/ModeSwitch';
import { Event } from '@/lib/types';
import { fetchLeadStats } from '@/lib/api-client';

type AppMode = 'performer' | 'instructor';

export default function DashboardPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMode, setActiveMode] = useState<AppMode | null>(null);
    const [leadStats, setLeadStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);
    const { user } = useUser();

    const isInstructor = activeMode === 'instructor';

    useEffect(() => {
        fetch('/api/events')
            .then(r => r.json())
            .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const loadStats = useCallback(async () => {
        if (!activeMode) return;
        try {
            const stats = await fetchLeadStats(activeMode);
            setLeadStats(stats);
        } catch { /* ignore */ }
    }, [activeMode]);

    useEffect(() => { loadStats(); }, [activeMode, loadStats]);

    const statusConfig: Record<string, { emoji: string; label: string }> = {
        inquiry: { emoji: '📩', label: 'Inquiry' },
        draft: { emoji: '📝', label: 'Draft' },
        proposed: { emoji: '📤', label: 'Proposed' },
        confirmed: { emoji: '✅', label: 'Confirmed' },
        completed: { emoji: '🏁', label: 'Completed' },
    };

    const accentColor = isInstructor ? '#38bdf8' : '#a855f7';
    const accentGlow = isInstructor ? 'rgba(56,189,248,0.4)' : 'rgba(168,85,247,0.4)';

    return (
        <>
            <header className="topbar" style={isInstructor ? {
                borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                background: 'linear-gradient(135deg, rgba(15,15,35,0.98), rgba(10,30,50,0.98))',
            } : undefined}>
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{
                        width: 48, height: 48, borderRadius: 10,
                        filter: `drop-shadow(0 0 6px ${accentGlow})`,
                    }} />
                    <span style={isInstructor ? { color: '#38bdf8' } : undefined}>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/leads" className="btn btn-ghost btn-sm">🔍 Leads</Link>
                    <Link href="/leads/scan" className="btn btn-ghost btn-sm">📡 Scan</Link>
                    <Link href="/social" className="btn btn-ghost btn-sm">�� Social Crew</Link>
                    <Link href="/pricing" className="btn btn-ghost btn-sm">💎 Plans</Link>
                    <Link href="/epk/builder" className="btn btn-ghost btn-sm">📋 EPK Builder</Link>
                    <Link href="/account" className="btn btn-ghost btn-sm">⚙️ Account</Link>
                    <ModeSwitch onChange={(m) => setActiveMode(m as AppMode)} />
                    <AdminLink />
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                {/* Hero Mode Section */}
                <div style={{
                    padding: '32px',
                    borderRadius: '16px',
                    marginBottom: '28px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: isInstructor
                        ? 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(34,211,238,0.06), rgba(15,15,35,0.95))'
                        : 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.06), rgba(15,15,35,0.95))',
                    border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.25)' : 'rgba(168,85,247,0.25)'}`,
                    boxShadow: `0 0 40px ${isInstructor ? 'rgba(56,189,248,0.08)' : 'rgba(168,85,247,0.08)'}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                        <div style={{
                            fontSize: '48px',
                            width: 72, height: 72,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '16px',
                            background: isInstructor
                                ? 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(34,211,238,0.1))'
                                : 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))',
                            border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.3)' : 'rgba(168,85,247,0.3)'}`,
                        }}>
                            {isInstructor ? '📚' : '🎵'}
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '28px', fontWeight: 700, margin: 0,
                                color: accentColor,
                            }}>
                                {isInstructor ? 'Instructor Mode' : 'Performer Mode'}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '4px 0 0 0' }}>
                                {isInstructor
                                    ? 'Finding music schools, studios, and instruction opportunities'
                                    : 'Finding venues, events, and booking opportunities'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        <div style={{
                            padding: '14px 16px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}`,
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: accentColor }}>
                                {leadStats?.total ?? '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {isInstructor ? 'Instruction Leads' : 'Gig Leads'}
                            </div>
                        </div>
                        <div style={{
                            padding: '14px 16px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}`,
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: accentColor }}>
                                {leadStats?.byStatus?.['new'] ?? '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                New Leads
                            </div>
                        </div>
                        <div style={{
                            padding: '14px 16px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}`,
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: accentColor }}>
                                {leadStats?.byStatus?.['contacted'] ?? '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Contacted
                            </div>
                        </div>
                        <div style={{
                            padding: '14px 16px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}`,
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: accentColor }}>
                                {events.length}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Events
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <Link href="/leads" className="btn btn-primary btn-sm" style={isInstructor ? {
                            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                            boxShadow: '0 0 16px rgba(56,189,248,0.2)',
                        } : undefined}>
                            {isInstructor ? '📚 View Instruction Leads' : '🎵 View Gig Leads'}
                        </Link>
                        <Link href="/leads/scan" className="btn btn-secondary btn-sm" style={isInstructor ? {
                            background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(34,211,238,0.08))',
                            borderColor: 'rgba(56,189,248,0.3)',
                            color: '#38bdf8',
                        } : undefined}>
                            {isInstructor ? '🔍 Scan for Schools' : '🔍 Scan for Venues'}
                        </Link>
                        <Link href="/leads/seeds" className="btn btn-ghost btn-sm">
                            {isInstructor ? '🏫 Instruction Seeds' : '⚙ Query Seeds'}
                        </Link>
                    </div>
                </div>

                {/* Mode comparison cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
                    marginBottom: '28px',
                }}>
                    {/* Performer Card */}
                    <div style={{
                        padding: '20px', borderRadius: '14px',
                        background: !isInstructor
                            ? 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.05))'
                            : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${!isInstructor ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        opacity: isInstructor ? 0.5 : 1,
                        transition: 'all 0.3s ease',
                        cursor: isInstructor ? 'default' : 'default',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🎵</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: !isInstructor ? '#a855f7' : 'var(--text-muted)' }}>
                                    Performer Mode
                                </h3>
                                {!isInstructor && <span className="badge badge-confirmed" style={{ fontSize: '10px' }}>ACTIVE</span>}
                            </div>
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                            <li>Find venues, clubs, and lounges</li>
                            <li>Discover DJ/band/artist gigs</li>
                            <li>Scan event platforms & marketplaces</li>
                            <li>Score & qualify booking opportunities</li>
                        </ul>
                    </div>

                    {/* Instructor Card */}
                    <div style={{
                        padding: '20px', borderRadius: '14px',
                        background: isInstructor
                            ? 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(34,211,238,0.05))'
                            : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        opacity: !isInstructor ? 0.5 : 1,
                        transition: 'all 0.3s ease',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px' }}>📚</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: isInstructor ? '#38bdf8' : 'var(--text-muted)' }}>
                                    Instructor Mode
                                </h3>
                                {isInstructor && <span className="badge badge-confirmed" style={{ fontSize: '10px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}>ACTIVE</span>}
                            </div>
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                            <li>Find music schools & academies</li>
                            <li>Discover instruction positions</li>
                            <li>Scan for after-school programs</li>
                            <li>Community centers & church programs</li>
                        </ul>
                    </div>
                </div>

                {/* Events Section */}
                <div className="section-header">
                    <div>
                        <h2 className="section-title" style={isInstructor ? { color: '#38bdf8' } : undefined}>
                            {isInstructor ? '📅 Instruction Assignments' : '🎧 Your Events'}
                        </h2>
                        <p className="section-subtitle">
                            {isInstructor ? 'Instruction gigs from your lead pipeline' : 'Gigs from your lead pipeline'}
                        </p>
                    </div>
                    <Link href="/new" className="btn btn-primary btn-sm" style={isInstructor ? {
                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    } : undefined}>+ New Inquiry</Link>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : events.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">{isInstructor ? '📚' : '🎧'}</div>
                        <h3>No {isInstructor ? 'instruction assignments' : 'events'} yet</h3>
                        <p>Start by <Link href="/leads/scan" style={{ color: accentColor }}>
                            {isInstructor ? 'scanning for instruction opportunities' : 'scanning for leads'}
                        </Link> and hand them off to create {isInstructor ? 'assignments' : 'events'}.</p>
                    </div>
                ) : (
                    <div className="event-list">
                        {events.map(event => {
                            const cfg = statusConfig[event.status] || { emoji: '📋', label: event.status };
                            return (
                                <Link key={event.id} href={`/event?id=${event.id}`} className="event-row">
                                    <div className="event-col-status">
                                        <span className={`badge badge-${event.status}`}>{cfg.emoji} {cfg.label}</span>
                                    </div>
                                    <div className="event-col-name">
                                        <span className="event-name-link">{event.clientName || 'Unnamed Event'}</span>
                                        <div className="event-sub">{event.venueName || 'No venue'}</div>
                                    </div>
                                    <div className="event-col-date">
                                        {event.date ? new Date(event.date).toLocaleDateString() : '—'}
                                    </div>
                                    <div className="event-col-genre">
                                        <span className="badge badge-draft">{event.eventType || '—'}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </>
    );
}
