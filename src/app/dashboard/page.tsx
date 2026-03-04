'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import AdminLink from '@/components/AdminLink';
import ModeSwitch from '@/components/ModeSwitch';
import { Event } from '@/lib/types';
import { fetchLeadStats } from '@/lib/api-client';
import { MODE_CONFIGS } from '@/hooks/useAppMode';

type AppMode = 'performer' | 'instructor' | 'studio' | 'touring';

export default function DashboardPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMode, setActiveMode] = useState<AppMode | null>(null);
    const [leadStats, setLeadStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const [scanQuota, setScanQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);
    const [emailCount, setEmailCount] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ clientName: '', venueName: '', date: '', startTime: '', endTime: '', eventType: 'other' as string, status: 'confirmed' as string });
    const [addingSaving, setAddingSaving] = useState(false);
    const { user } = useUser();

    const isInstructor = activeMode === 'instructor';

    const cfg = MODE_CONFIGS[activeMode || 'performer'];
    const accentColor = cfg.color;
    const accentGlow = cfg.glow;

    const MODE_INFO: Record<string, { title: string; subtitle: string; leadsLabel: string; viewLabel: string; scanLabel: string; seedsLabel: string }> = {
        performer: { title: 'Performer Mode', subtitle: 'Finding venues, events, and booking opportunities', leadsLabel: 'Gig Leads', viewLabel: '🎵 View Gig Leads', scanLabel: '🔍 Scan for Venues', seedsLabel: '⚙ Query Seeds' },
        instructor: { title: 'Instructor Mode', subtitle: 'Finding music schools, studios, and instruction opportunities', leadsLabel: 'Instruction Leads', viewLabel: '📚 View Instruction Leads', scanLabel: '🔍 Scan for Schools', seedsLabel: '🏫 Instruction Seeds' },
        studio: { title: 'Studio Mode', subtitle: 'Finding recording studios, session work, and sync opportunities', leadsLabel: 'Studio Leads', viewLabel: '🎙️ View Studio Leads', scanLabel: '🔍 Scan for Studios', seedsLabel: '🎙️ Studio Seeds' },
        touring: { title: 'Touring Mode', subtitle: 'Finding tour opportunities, booking agents, and festivals', leadsLabel: 'Tour Leads', viewLabel: '🚐 View Tour Leads', scanLabel: '🔍 Scan for Tours', seedsLabel: '🚐 Touring Seeds' },
    };
    const mi = MODE_INFO[activeMode || 'performer'];

    useEffect(() => {
        fetch('/api/events')
            .then(r => r.json())
            .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));

        // Check if user has a brand profile (new user detection)
        fetch('/api/social/brand')
            .then(r => r.json())
            .then(data => {
                if (!data || !data.djName) setIsNewUser(true);
            })
            .catch(() => { });

        // Fetch scan quota
        fetch('/api/leads/auto-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quota_check: true }),
        })
            .then(r => r.json())
            .then(data => { if (data.quota) setScanQuota(data.quota); })
            .catch(() => { });

        // Fetch sent email count
        fetch('/api/emails')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setEmailCount(data.length); })
            .catch(() => { });

        // Attribute referral from ambassador link if cookie exists
        const refMatch = document.cookie.match(/giglift_ref=([^;]+)/);
        if (refMatch) {
            const ref = decodeURIComponent(refMatch[1]);
            fetch('/api/ambassador/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ref }),
            }).catch(() => { }).finally(() => {
                // Clear the cookie regardless of outcome
                document.cookie = 'giglift_ref=;path=/;max-age=0';
            });
        }
    }, []);

    const loadStats = useCallback(async () => {
        if (!activeMode) return;
        try {
            const stats = await fetchLeadStats(activeMode);
            setLeadStats(stats);
        } catch { /* ignore */ }
    }, [activeMode]);

    useEffect(() => { loadStats(); }, [activeMode, loadStats]);

    const statusConfig: Record<string, { emoji: string; label: string; color: string }> = {
        inquiry: { emoji: '📩', label: 'Inquiry', color: '#60a5fa' },
        quoting: { emoji: '💬', label: 'Quoting', color: '#fbbf24' },
        draft: { emoji: '📝', label: 'Draft', color: '#94a3b8' },
        proposed: { emoji: '📤', label: 'Proposed', color: '#fb923c' },
        confirmed: { emoji: '✅', label: 'Confirmed', color: '#34d399' },
        completed: { emoji: '🏁', label: 'Completed', color: '#a78bfa' },
        cancelled: { emoji: '❌', label: 'Cancelled', color: '#f87171' },
    };

    // Calendar helpers
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
    const calDays: (number | null)[] = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const getEventsForDay = (day: number) => {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => e.date === dateStr);
    };

    const handleAddEvent = async () => {
        if (!newEvent.clientName && !newEvent.venueName) return;
        setAddingSaving(true);
        try {
            const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...newEvent }),
            });
            if (res.ok) {
                // Refresh events
                const data = await fetch('/api/events').then(r => r.json());
                setEvents(Array.isArray(data) ? data : []);
                setShowAddModal(false);
                setNewEvent({ clientName: '', venueName: '', date: '', startTime: '', endTime: '', eventType: 'other', status: 'confirmed' });
            }
        } catch { /* ignore */ }
        setAddingSaving(false);
    };

    return (
        <>
            <header className="topbar" style={cfg.headerBg ? {
                borderBottom: cfg.headerBorder,
                background: cfg.headerBg,
            } : undefined}>
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{
                        width: 56, height: 56, borderRadius: 12,
                        filter: `drop-shadow(0 0 6px ${accentGlow})`,
                    }} />
                    <span style={activeMode !== 'performer' ? { color: accentColor } : undefined}>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/leads" className="btn btn-ghost btn-sm">🔍 Leads</Link>
                    <Link href="/leads/scan" className="btn btn-ghost btn-sm">📡 Scan</Link>
                    <Link href="/social" className="btn btn-ghost btn-sm">👥 Social Crew</Link>
                    <Link href="/pricing" className="btn btn-ghost btn-sm">💎 Plans</Link>
                    <Link href="/epk/builder" className="btn btn-ghost btn-sm">📋 EPK Builder</Link>
                    <Link href="/flyer/create" className="btn btn-ghost btn-sm">🎨 Flyer Creator</Link>
                    <Link href="/emails" className="btn btn-ghost btn-sm">📧 Emails</Link>
                    <Link href="/guide" className="btn btn-ghost btn-sm">📖 Guide</Link>
                    <Link href="/account" className="btn btn-ghost btn-sm">⚙️ Account</Link>
                    <ModeSwitch onChange={(m) => setActiveMode(m as AppMode)} />
                    <AdminLink />
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                {/* Welcome banner for new users */}
                {isNewUser && (
                    <div className="slide-up" style={{
                        padding: '24px 28px',
                        borderRadius: '16px',
                        marginBottom: '24px',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(34,211,238,0.08))',
                        border: '1px solid rgba(139,92,246,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '20px',
                        flexWrap: 'wrap',
                    }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                                👋 Welcome to GigLift!
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                                Set up your profile in 30 seconds to start finding leads.
                            </p>
                        </div>
                        <Link href="/onboarding" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                            🚀 Get Started
                        </Link>
                    </div>
                )}

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
                            background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}1a)`,
                            border: `1px solid ${cfg.borderColor}`,
                        }}>
                            {cfg.icon}
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '28px', fontWeight: 700, margin: 0,
                                color: accentColor,
                            }}>
                                {mi.title}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '4px 0 0 0' }}>
                                {mi.subtitle}
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
                                {mi.leadsLabel}
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
                        {emailCount !== null && (
                            <div style={{
                                padding: '14px 16px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}`,
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: accentColor }}>
                                    {emailCount}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Emails Sent
                                </div>
                            </div>
                        )}
                        {scanQuota && (
                            <div style={{
                                padding: '14px 16px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}`,
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: scanQuota.remaining <= 5 ? 'var(--accent-red)' : scanQuota.remaining <= 20 ? 'var(--accent-amber)' : accentColor }}>
                                    {scanQuota.used} / {scanQuota.limit}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Scans Used
                                </div>
                                <div style={{ marginTop: '6px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '2px',
                                        width: `${Math.min(100, (scanQuota.used / scanQuota.limit) * 100)}%`,
                                        background: scanQuota.remaining <= 5 ? 'var(--accent-red)' : scanQuota.remaining <= 20 ? 'var(--accent-amber)' : accentColor,
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <Link href="/leads" className="btn btn-primary btn-sm" style={{
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                            boxShadow: `0 0 16px ${cfg.glow}`,
                        }}>
                            {mi.viewLabel}
                        </Link>
                        <Link href="/leads/scan" className="btn btn-secondary btn-sm" style={{
                            background: `${accentColor}1a`,
                            borderColor: cfg.borderColor,
                            color: accentColor,
                        }}>
                            {mi.scanLabel}
                        </Link>
                        <Link href="/leads/seeds" className="btn btn-ghost btn-sm">
                            {mi.seedsLabel}
                        </Link>
                    </div>
                </div>

                {/* Mode comparison cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
                    marginBottom: '28px',
                }}>
                    {(['performer', 'instructor', 'studio', 'touring'] as const).map(m => {
                        const mc = MODE_CONFIGS[m];
                        const active = activeMode === m;
                        const bullets: Record<string, string[]> = {
                            performer: ['Find venues, clubs, and lounges', 'Discover DJ/band/artist gigs', 'Scan event platforms & marketplaces', 'Score & qualify booking opportunities'],
                            instructor: ['Find music schools & academies', 'Discover instruction positions', 'Scan for after-school programs', 'Community centers & church programs'],
                            studio: ['Find recording studios', 'Session musician opportunities', 'Sync licensing & film scoring', 'Producer collaboration leads'],
                            touring: ['Find touring band openings', 'Booking agents & promoters', 'Festival lineup submissions', 'Regional tour circuit venues'],
                        };
                        return (
                            <div key={m} style={{
                                padding: '16px', borderRadius: '14px',
                                background: active ? `linear-gradient(135deg, ${mc.color}1a, ${mc.color}0d)` : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${active ? mc.borderColor : 'rgba(255,255,255,0.06)'}`,
                                opacity: active ? 1 : 0.5,
                                transition: 'all 0.3s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>{mc.icon}</span>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: active ? mc.color : 'var(--text-muted)' }}>
                                            {mc.label} Mode
                                        </h3>
                                        {active && <span className="badge badge-confirmed" style={{ fontSize: '9px', background: `${mc.color}22`, color: mc.color, borderColor: mc.borderColor }}>ACTIVE</span>}
                                    </div>
                                </div>
                                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    {bullets[m].map(b => <li key={b}>{b}</li>)}
                                </ul>
                            </div>
                        );
                    })}
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                            <button
                                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('list')}
                                style={{ borderRadius: 0, fontSize: '12px' }}
                            >☰ List</button>
                            <button
                                className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('calendar')}
                                style={{ borderRadius: 0, fontSize: '12px' }}
                            >📅 Calendar</button>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(true)}>+ Add Booking</button>
                        <Link href="/new" className="btn btn-primary btn-sm" style={isInstructor ? {
                            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                        } : undefined}>+ New Inquiry</Link>
                    </div>
                </div>

                {loading ? (
                    <div className="event-list">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card" style={{ padding: '20px', opacity: 0.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ width: 180, height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
                                        <div style={{ width: 120, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, animation: 'pulse 1.5s infinite', animationDelay: '0.2s' }} />
                                    </div>
                                    <div style={{ width: 80, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 14, animation: 'pulse 1.5s infinite', animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">{isInstructor ? '📚' : '🎧'}</div>
                        <h3>No {isInstructor ? 'instruction assignments' : 'events'} yet</h3>
                        <p>Start by <Link href="/leads/scan" style={{ color: accentColor }}>
                            {isInstructor ? 'scanning for instruction opportunities' : 'scanning for leads'}
                        </Link> and hand them off to create {isInstructor ? 'assignments' : 'events'}.</p>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="event-list">
                        {events.map(event => {
                            const cfg2 = statusConfig[event.status] || { emoji: '📋', label: event.status, color: '#94a3b8' };
                            return (
                                <Link key={event.id} href={`/event?id=${event.id}`} className="event-row">
                                    <div className="event-col-status">
                                        <span className={`badge badge-${event.status}`}>{cfg2.emoji} {cfg2.label}</span>
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
                ) : (
                    /* Calendar View */
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                                else setCalMonth(m => m - 1);
                            }}>← Prev</button>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{monthLabel}</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                                else setCalMonth(m => m + 1);
                            }}>Next →</button>
                        </div>

                        {/* Day headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                            {calDays.map((day, i) => {
                                if (day === null) return <div key={`empty-${i}`} style={{ minHeight: '80px' }} />;
                                const dayEvents = getEventsForDay(day);
                                const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
                                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                return (
                                    <div
                                        key={day}
                                        style={{
                                            minHeight: '80px',
                                            background: isToday ? 'rgba(168,85,247,0.08)' : 'var(--surface-1)',
                                            borderRadius: '8px',
                                            padding: '4px 6px',
                                            border: isToday ? '1px solid rgba(168,85,247,0.3)' : '1px solid var(--glass-border)',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onClick={() => {
                                            setNewEvent(e => ({ ...e, date: dateStr }));
                                            setShowAddModal(true);
                                        }}
                                    >
                                        <div style={{ fontSize: '12px', fontWeight: isToday ? 700 : 400, color: isToday ? '#a855f7' : 'var(--text-primary)', marginBottom: '4px' }}>
                                            {day}
                                        </div>
                                        {dayEvents.slice(0, 3).map(ev => {
                                            const sc = statusConfig[ev.status] || { color: '#94a3b8', label: ev.status };
                                            return (
                                                <Link
                                                    key={ev.id}
                                                    href={`/event?id=${ev.id}`}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                        display: 'block',
                                                        fontSize: '10px',
                                                        padding: '2px 4px',
                                                        marginBottom: '2px',
                                                        borderRadius: '4px',
                                                        background: `${sc.color}22`,
                                                        color: sc.color,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        textDecoration: 'none',
                                                        borderLeft: `3px solid ${sc.color}`,
                                                    }}
                                                >
                                                    {ev.clientName || ev.venueName || 'Event'}
                                                </Link>
                                            );
                                        })}
                                        {dayEvents.length > 3 && (
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>+{dayEvents.length - 3} more</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                            {Object.entries(statusConfig).map(([key, sc]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color }} />
                                    {sc.label}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick-Add Booking Modal */}
                {showAddModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    }} onClick={() => !addingSaving && setShowAddModal(false)}>
                        <div className="card" style={{ maxWidth: '480px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>📅 Add Booking</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label className="form-label">Client / Event Name *</label>
                                    <input className="input" value={newEvent.clientName}
                                        onChange={e => setNewEvent(ev => ({ ...ev, clientName: e.target.value }))} placeholder="e.g. Rooftop Summer Party" />
                                </div>
                                <div>
                                    <label className="form-label">Venue</label>
                                    <input className="input" value={newEvent.venueName}
                                        onChange={e => setNewEvent(ev => ({ ...ev, venueName: e.target.value }))} placeholder="e.g. The Loft, Downtown" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label className="form-label">Date *</label>
                                        <input className="input" type="date" value={newEvent.date}
                                            onChange={e => setNewEvent(ev => ({ ...ev, date: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="form-label">Start</label>
                                        <input className="input" type="time" value={newEvent.startTime}
                                            onChange={e => setNewEvent(ev => ({ ...ev, startTime: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="form-label">End</label>
                                        <input className="input" type="time" value={newEvent.endTime}
                                            onChange={e => setNewEvent(ev => ({ ...ev, endTime: e.target.value }))} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label className="form-label">Event Type</label>
                                        <select className="input" value={newEvent.eventType}
                                            onChange={e => setNewEvent(ev => ({ ...ev, eventType: e.target.value }))}>
                                            <option value="wedding">Wedding</option>
                                            <option value="corporate">Corporate</option>
                                            <option value="birthday">Birthday</option>
                                            <option value="concert">Concert</option>
                                            <option value="festival">Festival</option>
                                            <option value="after_party">After Party</option>
                                            <option value="charity">Charity</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Status</label>
                                        <select className="input" value={newEvent.status}
                                            onChange={e => setNewEvent(ev => ({ ...ev, status: e.target.value }))}>
                                            <option value="inquiry">📩 Inquiry</option>
                                            <option value="quoting">💬 Quoting</option>
                                            <option value="confirmed">✅ Confirmed</option>
                                            <option value="completed">🏁 Completed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={addingSaving}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleAddEvent} disabled={addingSaving || (!newEvent.clientName && !newEvent.venueName)}>
                                    {addingSaving ? '⏳ Saving...' : '💾 Save Booking'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
