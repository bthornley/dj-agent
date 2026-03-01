'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import AdminLink from '@/components/AdminLink';
import ModeSwitch from '@/components/ModeSwitch';

type AppMode = 'performer' | 'instructor';

const PERFORMER_SPECIALTIES = [
    'EDM', 'House', 'Deep House', 'Tech House', 'Techno', 'Trance',
    'Hip-Hop', 'R&B', 'Top 40', 'Pop', 'Latin', 'Reggaeton', 'Salsa',
    'Rock', 'Indie', 'Alternative', 'Jazz', 'Blues', 'Country', 'Folk',
    'Funk', 'Soul', 'Disco', 'Afrobeats', 'Dancehall', 'Reggae',
    'Classical', 'Acoustic', 'World Music', 'Karaoke', 'Open Format',
];

const INSTRUCTOR_SPECIALTIES = [
    'Piano', 'Guitar', 'Bass', 'Drums', 'Violin', 'Viola', 'Cello',
    'Flute', 'Clarinet', 'Saxophone', 'Trumpet', 'Trombone',
    'Voice / Vocal', 'Music Theory', 'Composition', 'Songwriting',
    'Music Production', 'Audio Engineering', 'Ear Training',
    'Music History', 'Group Classes', 'Private Lessons',
    'Early Childhood Music', 'Suzuki Method', 'Orff Method', 'Kodály Method',
    'Band Directing', 'Choir Directing', 'Orchestra',
];

const ARTIST_TYPES = [
    { value: 'dj', label: '🎧 DJ', desc: 'Clubs, lounges, events' },
    { value: 'band', label: '🎸 Band', desc: 'Live music venues, festivals' },
    { value: 'solo_artist', label: '🎤 Solo Artist', desc: 'Restaurants, private events' },
    { value: 'music_instructor', label: '🎹 Music Instructor', desc: 'Schools, community programs' },
] as const;

const US_REGIONS: Record<string, string[]> = {
    'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Orange County', 'Long Beach', 'Sacramento', 'San Jose', 'Oakland', 'Inland Empire', 'Santa Barbara'],
    'Southwest': ['Las Vegas', 'Phoenix', 'Tucson', 'Albuquerque'],
    'Pacific NW': ['Seattle', 'Portland', 'Boise'],
    'Mountain': ['Denver', 'Salt Lake City', 'Colorado Springs'],
    'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
    'Midwest': ['Chicago', 'Detroit', 'Minneapolis', 'Milwaukee', 'Indianapolis', 'Columbus', 'Cleveland', 'Kansas City', 'St. Louis', 'Cincinnati'],
    'Southeast': ['Atlanta', 'Miami', 'Tampa', 'Orlando', 'Nashville', 'Charlotte', 'Raleigh', 'Jacksonville', 'Memphis', 'New Orleans', 'Birmingham', 'Charleston', 'Savannah'],
    'Northeast': ['New York', 'Boston', 'Philadelphia', 'Washington DC', 'Baltimore', 'Pittsburgh', 'Hartford', 'Providence', 'Newark'],
    'Other': ['Honolulu', 'Anchorage'],
};

export default function AccountPage() {
    const { user } = useUser();
    const currentPlan = (user?.publicMetadata?.planId as string) || 'free';
    const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);
    const [stats, setStats] = useState<{ total: number; avgScore: number } | null>(null);
    const [artistTypes, setArtistTypes] = useState<string[]>(['dj']);
    const [regions, setRegions] = useState<string[]>(['Orange County', 'Long Beach']);
    const [savingType, setSavingType] = useState(false);
    const [savingRegion, setSavingRegion] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [savingSpecialty, setSavingSpecialty] = useState(false);
    const [activeMode, setActiveMode] = useState<AppMode | null>(null);

    const isInstructor = activeMode === 'instructor';

    useEffect(() => {
        if (user?.imageUrl) setAvatarUrl(user.imageUrl);
    }, [user?.imageUrl]);

    useEffect(() => {
        fetch('/api/leads/auto-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quota_check: true }),
        })
            .then(r => r.json())
            .then(d => { if (d.quota) setQuota(d.quota); })
            .catch(() => { });

        fetch('/api/leads?stats=true')
            .then(r => r.json())
            .then(d => { if (d.total !== undefined) setStats(d); })
            .catch(() => { });

        fetch('/api/profile')
            .then(r => r.json())
            .then(d => {
                if (d.artistTypes) setArtistTypes(d.artistTypes);
                if (d.regions) setRegions(d.regions);
                if (d.specialties) setSpecialties(d.specialties);
            })
            .catch(() => { });
    }, []);

    const handleArtistTypeToggle = async (type: string) => {
        const newTypes = artistTypes.includes(type)
            ? artistTypes.filter(t => t !== type)
            : [...artistTypes, type];
        if (newTypes.length === 0) return; // must have at least one
        setSavingType(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artistTypes: newTypes }),
            });
            if (res.ok) {
                setArtistTypes(newTypes);
            }
        } catch { /* ignore */ }
        setSavingType(false);
    };

    const handleRegionToggle = async (region: string) => {
        const newRegions = regions.includes(region)
            ? regions.filter(r => r !== region)
            : [...regions, region];
        if (newRegions.length === 0) return;
        setSavingRegion(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regions: newRegions }),
            });
            if (res.ok) {
                setRegions(newRegions);
            }
        } catch { /* ignore */ }
        setSavingRegion(false);
    };

    const handleSpecialtyToggle = async (specialty: string) => {
        const newSpecialties = specialties.includes(specialty)
            ? specialties.filter(s => s !== specialty)
            : [...specialties, specialty];
        setSavingSpecialty(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ specialties: newSpecialties }),
            });
            if (res.ok) {
                setSpecialties(newSpecialties);
            }
        } catch { /* ignore */ }
        setSavingSpecialty(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.imageUrl) {
                setAvatarUrl(data.imageUrl);
            } else if (data.error) {
                alert(data.error);
            }
        } catch {
            alert('Failed to upload avatar');
        }
        setAvatarUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAvatarRemove = async () => {
        if (!confirm('Remove your profile photo?')) return;
        setAvatarUploading(true);
        try {
            const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
            const data = await res.json();
            if (data.imageUrl) {
                setAvatarUrl(data.imageUrl);
            }
        } catch {
            alert('Failed to remove avatar');
        }
        setAvatarUploading(false);
    };

    const planNames: Record<string, string> = {
        free: '🆓 Free',
        pro: '⚡ Pro',
        unlimited: '🚀 Unlimited',
    };

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎵</div>
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
                    <ModeSwitch onChange={(m) => setActiveMode(m as AppMode)} />
                    <AdminLink />
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Account</h2>
                        <p className="section-subtitle">Manage your profile, plan, and usage</p>
                    </div>
                </div>

                <div className="stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                        <div className="stat-value">{planNames[currentPlan] || currentPlan}</div>
                        <div className="stat-label">Current Plan</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{quota ? `${quota.used}/${quota.limit}` : '—'}</div>
                        <div className="stat-label">Searches This Month</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.total ?? '—'}</div>
                        <div className="stat-label">Total Leads</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.avgScore ?? '—'}</div>
                        <div className="stat-label">Avg Lead Score</div>
                    </div>
                </div>

                {/* Artist Type Selector */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">Artist Type</h3>
                    <p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 16px' }}>
                        Select all that apply — your leads and discovery seeds will be tailored accordingly.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        {ARTIST_TYPES.map(t => (
                            <button
                                key={t.value}
                                onClick={() => handleArtistTypeToggle(t.value)}
                                disabled={savingType}
                                className={`btn ${artistTypes.includes(t.value) ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '4px',
                                    textAlign: 'left',
                                    opacity: savingType ? 0.6 : 1,
                                    border: artistTypes.includes(t.value) ? '2px solid var(--accent-purple)' : '2px solid transparent',
                                }}
                            >
                                <span style={{ fontSize: '15px', fontWeight: 600 }}>{t.label}</span>
                                <span className="text-muted" style={{ fontSize: '12px' }}>{t.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Specialties Selector */}
                <div className="card" style={{
                    marginBottom: '24px',
                    ...(isInstructor ? { borderColor: 'rgba(56,189,248,0.2)' } : {}),
                }}>
                    <h3 className="card-title" style={isInstructor ? { color: '#38bdf8' } : undefined}>
                        {isInstructor ? '📚 Teaching Specialties' : '🎵 Genre & Style Specialties'}
                    </h3>
                    <p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 16px' }}>
                        {isInstructor
                            ? 'Select instruments, methods, and teaching areas. These appear in your outreach emails and proposals.'
                            : 'Select your genres and styles. These appear in your outreach emails and marketing materials.'}
                    </p>
                    {specialties.length > 0 && (
                        <div style={{
                            padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
                            fontSize: '13px', color: 'var(--text-muted)',
                            background: isInstructor
                                ? 'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(34,211,238,0.03))'
                                : 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(139,92,246,0.03))',
                            border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.15)' : 'rgba(168,85,247,0.15)'}`,
                        }}>
                            <strong style={{ color: isInstructor ? '#38bdf8' : '#a855f7' }}>Selected ({specialties.length}):</strong>{' '}
                            {specialties.join(', ')}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(isInstructor ? INSTRUCTOR_SPECIALTIES : PERFORMER_SPECIALTIES).map(s => (
                            <button
                                key={s}
                                onClick={() => handleSpecialtyToggle(s)}
                                disabled={savingSpecialty}
                                className={`btn btn-sm ${specialties.includes(s) ? 'btn-primary' : 'btn-ghost'}`}
                                style={{
                                    opacity: savingSpecialty ? 0.6 : 1,
                                    fontSize: '12px', padding: '4px 10px',
                                    border: specialties.includes(s)
                                        ? `1px solid ${isInstructor ? 'rgba(56,189,248,0.5)' : 'var(--accent-purple)'}`
                                        : '1px solid var(--border)',
                                    ...(specialties.includes(s) && isInstructor ? {
                                        background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(34,211,238,0.1))',
                                        color: '#38bdf8',
                                    } : {}),
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Region Selector */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">Regions</h3>
                    <p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 16px' }}>
                        Select the regions where you want to find gigs. Seeds will be generated for each selected region.
                    </p>
                    {Object.entries(US_REGIONS).map(([area, cities]) => (
                        <div key={area} style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-accent)', marginBottom: '6px' }}>
                                {area}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {cities.map(city => (
                                    <button
                                        key={city}
                                        onClick={() => handleRegionToggle(city)}
                                        disabled={savingRegion}
                                        className={`btn btn-sm ${regions.includes(city) ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{
                                            opacity: savingRegion ? 0.6 : 1,
                                            fontSize: '12px',
                                            padding: '4px 10px',
                                            border: regions.includes(city) ? '1px solid var(--accent-purple)' : '1px solid var(--border)',
                                        }}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <p className="text-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
                        {regions.length} region{regions.length !== 1 ? 's' : ''} selected
                    </p>
                </div>
                {quota && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 className="card-title">Search Usage</h3>
                        <div className="quota-meter" style={{ marginTop: '12px' }}>
                            <div className="quota-header">
                                <span>Monthly Searches</span>
                                <span className={quota.remaining <= 10 ? 'quota-warn' : ''}>
                                    {quota.used} / {quota.limit} used
                                </span>
                            </div>
                            <div className="score-meter" style={{ width: '100%', height: '8px' }}>
                                <div className="score-fill" style={{
                                    width: `${(quota.used / quota.limit) * 100}%`,
                                    background: quota.remaining <= 10 ? 'var(--accent-red)'
                                        : quota.remaining <= 30 ? 'var(--accent-amber)'
                                            : 'var(--accent-green)',
                                }} />
                            </div>
                            <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                                {quota.remaining} searches remaining this month
                            </div>
                        </div>
                    </div>
                )}

                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">Profile</h3>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                        {/* Avatar Upload */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={avatarUrl || user?.imageUrl || ''}
                                alt="Profile"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '3px solid var(--border)',
                                    cursor: 'pointer',
                                    opacity: avatarUploading ? 0.5 : 1,
                                    transition: 'opacity 0.2s, border-color 0.2s',
                                }}
                                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent-purple)')}
                                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    right: '0',
                                    background: 'var(--accent-purple)',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    border: '2px solid var(--bg-card)',
                                }}
                            >
                                📷
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleAvatarUpload}
                                style={{ display: 'none' }}
                            />
                            {avatarUploading && (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <div className="spinner" />
                                </div>
                            )}
                        </div>
                        {/* Profile Info */}
                        <div style={{ flex: 1 }}>
                            <p><strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress || '—'}</p>
                            <p style={{ marginTop: '8px' }}><strong>Member since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarUploading}
                                >
                                    📷 Change Photo
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={handleAvatarRemove}
                                    disabled={avatarUploading}
                                    style={{ color: 'var(--accent-red)' }}
                                >
                                    🗑️ Remove Photo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing Management */}
                <div className="card" style={{ marginTop: '20px', padding: '20px' }}>
                    <h3 style={{ marginBottom: '12px' }}>💳 Billing</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Current plan: <span className="badge badge-confirmed" style={{ marginLeft: '6px' }}>
                            {currentPlan === 'free' ? 'Free' : currentPlan === 'pro' ? 'Pro — $19/mo' : currentPlan === 'unlimited' ? 'Unlimited — $39/mo' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                        </span>
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {currentPlan === 'free' && (
                            <Link href="/pricing" className="btn btn-primary">⬆ Upgrade Plan</Link>
                        )}
                        {currentPlan !== 'free' && (
                            <>
                                <button className="btn btn-secondary" onClick={async () => {
                                    try {
                                        const res = await fetch('/api/billing-portal', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ action: 'portal' }),
                                        });
                                        const data = await res.json();
                                        if (data.url) {
                                            window.location.href = data.url;
                                        } else if (data.fallback) {
                                            alert(`Your ${currentPlan.toUpperCase()} plan is active. Stripe billing portal is not configured — contact support to manage your subscription.\n\nTo change plans, visit the Pricing page.`);
                                        } else if (data.error) {
                                            alert(data.error);
                                        }
                                    } catch {
                                        alert('Failed to open billing portal. Please try again.');
                                    }
                                }}>
                                    💳 Manage Billing
                                </button>
                                <Link href="/pricing" className="btn btn-ghost btn-sm">Change Plan</Link>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={async () => {
                                    if (!confirm('Are you sure you want to downgrade to the Free plan? You will lose access to premium features.')) return;
                                    try {
                                        const res = await fetch('/api/billing-portal', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ action: 'downgrade' }),
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert('Plan downgraded to Free. Refreshing...');
                                            window.location.reload();
                                        } else {
                                            alert(data.error || 'Failed to downgrade.');
                                        }
                                    } catch {
                                        alert('Failed to downgrade. Please try again.');
                                    }
                                }}>
                                    Cancel Subscription
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
