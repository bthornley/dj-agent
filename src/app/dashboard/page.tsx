'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Topbar from '@/components/Topbar';
import StatCard from '@/components/StatCard';
import ModeCard from '@/components/ModeCard';
import WelcomeBanner from '@/components/WelcomeBanner';
import BookingDashboard from '@/components/BookingDashboard';
import { Event } from '@/lib/types';
import { fetchLeadStats } from '@/lib/api-client';
import { useAppMode, MODE_CONFIGS } from '@/hooks/useAppMode';

type AppMode = 'performer' | 'instructor' | 'studio' | 'touring';

export default function DashboardPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const { activeMode } = useAppMode();
    const [leadStats, setLeadStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const [scanQuota, setScanQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);
    const [emailCount, setEmailCount] = useState<number | null>(null);
    const { user } = useUser();

    const isInstructor = activeMode === 'instructor';

    const cfg = MODE_CONFIGS[activeMode || 'performer'];
    const accentColor = cfg.color;

    const MODE_INFO: Record<string, { title: string; subtitle: string; leadsLabel: string; viewLabel: string; scanLabel: string; seedsLabel: string }> = {
        performer: { title: 'Performer Mode', subtitle: 'Finding venues, events, and booking opportunities', leadsLabel: 'Gig Leads', viewLabel: '🎵 View Gig Leads', scanLabel: '🔍 Scan for Venues', seedsLabel: '⚙ Query Seeds' },
        instructor: { title: 'Instructor Mode', subtitle: 'Finding music schools, studios, and instruction opportunities', leadsLabel: 'Instruction Leads', viewLabel: '📚 View Instruction Leads', scanLabel: '🔍 Scan for Schools', seedsLabel: '🏫 Instruction Seeds' },
        studio: { title: 'Studio Mode', subtitle: 'Finding recording studios, session work, and sync opportunities', leadsLabel: 'Studio Leads', viewLabel: '🎙️ View Studio Leads', scanLabel: '🔍 Scan for Studios', seedsLabel: '🎙️ Studio Seeds' },
        touring: { title: 'Touring Mode', subtitle: 'Finding tour opportunities, booking agents, and festivals', leadsLabel: 'Tour Leads', viewLabel: '🚐 View Tour Leads', scanLabel: '🔍 Scan for Tours', seedsLabel: '🚐 Touring Seeds' },
    };
    const mi = MODE_INFO[activeMode || 'performer'];

    const fetchEvents = useCallback(() => {
        fetch('/api/events')
            .then(r => r.json())
            .then(data => { setEvents(Array.isArray(data) ? data : (data.data || [])); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchEvents();

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
        const mode = activeMode || 'performer';
        try {
            const stats = await fetchLeadStats(mode);
            setLeadStats(stats);
        } catch { /* ignore */ }
    }, [activeMode]);

    useEffect(() => { loadStats(); }, [activeMode, loadStats]);

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                {/* Welcome banner for new users */}
                {isNewUser && <WelcomeBanner />}

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
                        <StatCard value={leadStats?.total ?? '—'} label={mi.leadsLabel} accentColor={accentColor} borderColor={isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'} />
                        <StatCard value={leadStats?.byStatus?.['new'] ?? '—'} label="New Leads" accentColor={accentColor} borderColor={isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'} />
                        <StatCard value={leadStats?.byStatus?.['contacted'] ?? '—'} label="Contacted" accentColor={accentColor} borderColor={isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'} />
                        <StatCard value={events.length} label="Events" accentColor={accentColor} borderColor={isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'} />
                        {emailCount !== null && (
                            <StatCard value={emailCount} label="Emails Sent" accentColor={accentColor} borderColor={isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'} />
                        )}
                        {scanQuota && (
                            <StatCard
                                value={`${scanQuota.used} / ${scanQuota.limit}`}
                                label="Scans Used"
                                accentColor={scanQuota.remaining <= 5 ? 'var(--accent-red)' : scanQuota.remaining <= 20 ? 'var(--accent-amber)' : accentColor}
                                borderColor={isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}
                                progress={scanQuota.used / scanQuota.limit}
                                progressColor={scanQuota.remaining <= 5 ? 'var(--accent-red)' : scanQuota.remaining <= 20 ? 'var(--accent-amber)' : accentColor}
                            />
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
                        const modeBullets: Record<string, string[]> = {
                            performer: ['Find venues, clubs, and lounges', 'Discover DJ/band/artist gigs', 'Scan event platforms & marketplaces', 'Score & qualify booking opportunities'],
                            instructor: ['Find music schools & academies', 'Discover instruction positions', 'Scan for after-school programs', 'Community centers & church programs'],
                            studio: ['Find recording studios', 'Session musician opportunities', 'Sync licensing & film scoring', 'Producer collaboration leads'],
                            touring: ['Find touring band openings', 'Booking agents & promoters', 'Festival lineup submissions', 'Regional tour circuit venues'],
                        };
                        return <ModeCard key={m} mode={m} config={MODE_CONFIGS[m]} active={activeMode === m} bullets={modeBullets[m]} />;
                    })}
                </div>

                <BookingDashboard events={events} loading={loading} refreshEvents={fetchEvents} />
            </main>
        </>
    );
}
