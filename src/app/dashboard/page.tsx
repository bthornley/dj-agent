'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import AdminLink from '@/components/AdminLink';
import { Event } from '@/lib/types';

export default function DashboardPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/events')
            .then(r => r.json())
            .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const statusConfig: Record<string, { emoji: string; label: string }> = {
        inquiry: { emoji: '📩', label: 'Inquiry' },
        draft: { emoji: '📝', label: 'Draft' },
        proposed: { emoji: '📤', label: 'Proposed' },
        confirmed: { emoji: '✅', label: 'Confirmed' },
        completed: { emoji: '🏁', label: 'Completed' },
    };

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎧</div>
                    <span>StageScout</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/leads" className="btn btn-ghost btn-sm">🔍 Leads</Link>
                    <Link href="/leads/scan" className="btn btn-ghost btn-sm">📡 Scan</Link>
                    <Link href="/social" className="btn btn-ghost btn-sm">📱 Social</Link>
                    <Link href="/pricing" className="btn btn-ghost btn-sm">💎 Plans</Link>
                    <Link href="/account" className="btn btn-ghost btn-sm">⚙️ Account</Link>
                    <AdminLink />
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Your Events</h2>
                        <p className="section-subtitle">Gigs from your lead pipeline</p>
                    </div>
                    <Link href="/new" className="btn btn-primary btn-sm">+ New Inquiry</Link>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : events.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🎧</div>
                        <h3>No events yet</h3>
                        <p>Start by <Link href="/leads/scan" style={{ color: 'var(--accent-purple)' }}>scanning for leads</Link> and hand them off to create events.</p>
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
