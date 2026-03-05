'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import { QuerySeed } from '@/lib/types';
import { fetchSeeds, createSeed, deleteSeed, deleteAllSeeds } from '@/lib/api-client';

type AppMode = 'performer' | 'instructor' | 'studio' | 'touring';

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const PERFORMER_PRESETS: Record<string, { keywords: string[]; label: string }[]> = {
    'Orange County': [
        { keywords: ['site:craigslist.org', 'gig', 'Orange County'], label: 'Craigslist — Gigs' },
        { keywords: ['site:craigslist.org', 'musician wanted', 'Orange County'], label: 'Craigslist — Musicians Wanted' },
        { keywords: ['site:facebook.com/marketplace', 'gig', 'Orange County'], label: 'FB Marketplace — Gigs' },
        { keywords: ['site:gigsalad.com', 'Orange County'], label: 'GigSalad' },
        { keywords: ['site:thumbtack.com', 'musician', 'Orange County'], label: 'Thumbtack' },
    ],
    'Long Beach': [
        { keywords: ['site:craigslist.org', 'gig', 'Long Beach'], label: 'Craigslist — Gigs' },
        { keywords: ['site:craigslist.org', 'musician wanted', 'Long Beach'], label: 'Craigslist — Musicians Wanted' },
        { keywords: ['site:facebook.com/marketplace', 'gig', 'Long Beach'], label: 'FB Marketplace — Gigs' },
        { keywords: ['site:gigsalad.com', 'Long Beach'], label: 'GigSalad' },
        { keywords: ['site:thumbtack.com', 'musician', 'Long Beach'], label: 'Thumbtack' },
    ],
};

const INSTRUCTOR_PRESETS: Record<string, { keywords: string[]; label: string }[]> = {
    'Orange County': [
        { keywords: ['music school', 'Orange County'], label: 'Music Schools' },
        { keywords: ['music academy', 'lessons', 'Orange County'], label: 'Music Academies' },
        { keywords: ['school district music program', 'Orange County'], label: 'School Districts' },
        { keywords: ['after school music program', 'Orange County'], label: 'After-School Programs' },
        { keywords: ['community center music class', 'Orange County'], label: 'Community Centers' },
        { keywords: ['preschool music class', 'Orange County'], label: 'Preschool Music' },
        { keywords: ['church music program', 'Orange County'], label: 'Church Programs' },
        { keywords: ['site:thumbtack.com', 'music instructor', 'Orange County'], label: 'Thumbtack' },
        { keywords: ['site:craigslist.org', 'music instructor wanted', 'Orange County'], label: 'Craigslist — Music Instructor' },
    ],
    'Long Beach': [
        { keywords: ['music school', 'Long Beach'], label: 'Music Schools' },
        { keywords: ['music academy', 'lessons', 'Long Beach'], label: 'Music Academies' },
        { keywords: ['school district music program', 'Long Beach'], label: 'School Districts' },
        { keywords: ['after school music program', 'Long Beach'], label: 'After-School Programs' },
        { keywords: ['community center music class', 'Long Beach'], label: 'Community Centers' },
        { keywords: ['preschool music class', 'Long Beach'], label: 'Preschool Music' },
        { keywords: ['church music program', 'Long Beach'], label: 'Church Programs' },
        { keywords: ['site:thumbtack.com', 'music instructor', 'Long Beach'], label: 'Thumbtack' },
        { keywords: ['site:craigslist.org', 'music instructor wanted', 'Long Beach'], label: 'Craigslist — Music Instructor' },
    ],
};

const STUDIO_PRESETS: Record<string, { keywords: string[]; label: string }[]> = {
    'Orange County': [
        { keywords: ['recording studio session musician', 'Orange County'], label: 'Recording Studios' },
        { keywords: ['session musician wanted', 'Orange County'], label: 'Session Work' },
        { keywords: ['music producer looking for musicians', 'Orange County'], label: 'Producer Collabs' },
        { keywords: ['sync licensing music', 'Orange County'], label: 'Sync Licensing' },
        { keywords: ['film scoring musicians', 'Orange County'], label: 'Film Scoring' },
        { keywords: ['site:soundbetter.com', 'session musician'], label: 'SoundBetter' },
        { keywords: ['site:craigslist.org', 'studio musician wanted', 'Orange County'], label: 'Craigslist — Studio' },
    ],
    'Long Beach': [
        { keywords: ['recording studio session musician', 'Long Beach'], label: 'Recording Studios' },
        { keywords: ['session musician wanted', 'Long Beach'], label: 'Session Work' },
        { keywords: ['music producer looking for musicians', 'Long Beach'], label: 'Producer Collabs' },
        { keywords: ['sync licensing music', 'Long Beach'], label: 'Sync Licensing' },
        { keywords: ['film scoring musicians', 'Long Beach'], label: 'Film Scoring' },
        { keywords: ['site:soundbetter.com', 'session musician'], label: 'SoundBetter' },
        { keywords: ['site:craigslist.org', 'studio musician wanted', 'Long Beach'], label: 'Craigslist — Studio' },
    ],
};

const TOURING_PRESETS: Record<string, { keywords: string[]; label: string }[]> = {
    'Orange County': [
        { keywords: ['touring musician needed', 'Orange County'], label: 'Touring Gigs' },
        { keywords: ['booking agent musicians', 'Orange County'], label: 'Booking Agents' },
        { keywords: ['concert promoter', 'Orange County'], label: 'Concert Promoters' },
        { keywords: ['festival lineup submissions', 'Orange County'], label: 'Festival Submissions' },
        { keywords: ['touring band hiring', 'Orange County'], label: 'Bands Hiring' },
        { keywords: ['site:sonicbids.com', 'touring'], label: 'Sonicbids' },
        { keywords: ['site:craigslist.org', 'touring musician', 'Orange County'], label: 'Craigslist — Touring' },
    ],
    'Long Beach': [
        { keywords: ['touring musician needed', 'Long Beach'], label: 'Touring Gigs' },
        { keywords: ['booking agent musicians', 'Long Beach'], label: 'Booking Agents' },
        { keywords: ['concert promoter', 'Long Beach'], label: 'Concert Promoters' },
        { keywords: ['festival lineup submissions', 'Long Beach'], label: 'Festival Submissions' },
        { keywords: ['touring band hiring', 'Long Beach'], label: 'Bands Hiring' },
        { keywords: ['site:sonicbids.com', 'touring'], label: 'Sonicbids' },
        { keywords: ['site:craigslist.org', 'touring musician', 'Long Beach'], label: 'Craigslist — Touring' },
    ],
};

export default function SeedsPage() {
    const [seeds, setSeeds] = useState<QuerySeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [region, setRegion] = useState('Orange County');
    const [keywords, setKeywords] = useState('');
    const [source, setSource] = useState('web_search');
    const [message, setMessage] = useState('');
    const [addingPresets, setAddingPresets] = useState(false);
    const [activeMode, setActiveMode] = useState<AppMode | null>(null);
    const [deleting, setDeleting] = useState(false);

    const isInstructor = activeMode === 'instructor';

    const loadSeeds = useCallback(async () => {
        if (!activeMode) return; // Don't load until mode is known
        try {
            const data = await fetchSeeds(activeMode);
            setSeeds(data);
        } catch (err) {
            console.error('Failed to load seeds:', err);
        } finally {
            setLoading(false);
        }
    }, [activeMode]);

    useEffect(() => {
        if (!activeMode) return; // Wait for ModeSwitch to provide the real mode
        setLoading(true);
        loadSeeds();
    }, [activeMode, loadSeeds]);

    const handleAdd = async () => {
        if (!keywords.trim()) {
            setMessage('Enter at least one keyword');
            return;
        }
        try {
            await createSeed({
                id: generateId(),
                region,
                keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
                source,
                active: true,
                mode: activeMode || undefined,
                created_at: new Date().toISOString(),
            });
            setKeywords('');
            setShowForm(false);
            loadSeeds();
            setMessage('Seed added');
            setTimeout(() => setMessage(''), 3000);
        } catch {
            setMessage('Failed to add seed');
        }
    };

    const handleAddPresets = async () => {
        setAddingPresets(true);
        try {
            const PRESETS_MAP: Record<string, typeof PERFORMER_PRESETS> = {
                performer: PERFORMER_PRESETS, instructor: INSTRUCTOR_PRESETS,
                studio: STUDIO_PRESETS, touring: TOURING_PRESETS,
            };
            const presets = PRESETS_MAP[activeMode || 'performer'] || PERFORMER_PRESETS;
            const existingKeywords = new Set(seeds.map(s => s.keywords.join('|')));
            let added = 0;
            for (const [reg, regionPresets] of Object.entries(presets)) {
                for (const preset of regionPresets) {
                    const key = preset.keywords.join('|');
                    if (!existingKeywords.has(key)) {
                        await createSeed({
                            id: generateId(),
                            region: reg,
                            keywords: preset.keywords,
                            source: preset.keywords.some(k => k.startsWith('site:')) ? 'marketplace' : 'web_search',
                            active: true,
                            mode: activeMode || undefined,
                            created_at: new Date().toISOString(),
                        });
                        added++;
                    }
                }
            }
            await loadSeeds();
            setMessage(added > 0 ? `✅ Added ${added} ${activeMode || 'performer'} seeds` : `All ${activeMode || 'performer'} seeds already added`);
            setTimeout(() => setMessage(''), 4000);
        } catch {
            setMessage('Failed to add preset seeds');
        }
        setAddingPresets(false);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteSeed(id);
            loadSeeds();
        } catch (err) {
            console.error('Failed to delete seed:', err);
        }
    };

    const handleDeleteAll = async () => {
        const modeLabel = activeMode || 'performer';
        if (!confirm(`Delete all ${seeds.length} ${modeLabel} seeds? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            const result = await deleteAllSeeds(activeMode || undefined);
            setMessage(`🗑 Deleted ${result.deleted} ${modeLabel} seeds`);
            setTimeout(() => setMessage(''), 4000);
            loadSeeds();
        } catch {
            setMessage('Failed to delete seeds');
        }
        setDeleting(false);
    };

    // Group seeds by region
    const grouped = seeds.reduce((acc, seed) => {
        const key = seed.region || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(seed);
        return acc;
    }, {} as Record<string, QuerySeed[]>);

    const isMarketplaceSeed = (seed: QuerySeed) =>
        seed.keywords.some(k => k.startsWith('site:'));

    const accentColor = isInstructor ? '#38bdf8' : '#a855f7';
    const accentBg = isInstructor
        ? 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(34,211,238,0.04))'
        : 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04))';
    const accentBorder = isInstructor ? 'rgba(56,189,248,0.2)' : 'rgba(168,85,247,0.2)';

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                {/* Mode indicator banner */}
                <div style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: accentBg,
                    border: `1px solid ${accentBorder}`,
                    color: accentColor,
                }}>
                    <span style={{ fontSize: '18px' }}>{isInstructor ? '📚' : '🎵'}</span>
                    {isInstructor
                        ? 'Instructor Mode — Seeds for finding music schools, studios, and teaching opportunities'
                        : 'Performer Mode — Seeds for finding venues, events, and booking opportunities'}
                </div>

                <div className="section-header">
                    <div>
                        <h2 className="section-title" style={isInstructor ? { color: '#38bdf8' } : undefined}>
                            {isInstructor ? '📚 Teaching Seeds' : '🔍 Search Seeds'}
                        </h2>
                        <p className="section-subtitle">
                            {isInstructor
                                ? 'Configure what the Lead Finder searches for when finding teaching opportunities'
                                : 'Configure what the Lead Finder searches for when finding gigs and venues'}
                        </p>
                    </div>
                    <div className="badge" style={{
                        background: accentBg,
                        border: `1px solid ${accentBorder}`,
                        color: accentColor,
                    }}>
                        {seeds.length} {isInstructor ? 'teaching' : 'performer'} seeds
                    </div>
                </div>

                {message && <div className="alert alert-success">{message}</div>}

                {/* Add Form */}
                {showForm && (
                    <div className="card slide-up" style={{
                        marginBottom: '24px',
                        ...(isInstructor ? { borderColor: 'rgba(56,189,248,0.2)' } : {}),
                    }}>
                        <h3 className="card-title">Add New {isInstructor ? 'Teaching' : ''} Seed</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Region</label>
                                <select className="input" value={region} onChange={e => setRegion(e.target.value)}>
                                    <optgroup label="California">
                                        <option>Los Angeles</option><option>San Francisco</option><option>San Diego</option>
                                        <option>Orange County</option><option>Long Beach</option><option>Sacramento</option>
                                        <option>San Jose</option><option>Oakland</option><option>Inland Empire</option><option>Santa Barbara</option>
                                    </optgroup>
                                    <optgroup label="Southwest">
                                        <option>Las Vegas</option><option>Phoenix</option><option>Tucson</option><option>Albuquerque</option>
                                    </optgroup>
                                    <optgroup label="Pacific NW">
                                        <option>Seattle</option><option>Portland</option><option>Boise</option>
                                    </optgroup>
                                    <optgroup label="Mountain">
                                        <option>Denver</option><option>Salt Lake City</option><option>Colorado Springs</option>
                                    </optgroup>
                                    <optgroup label="Texas">
                                        <option>Houston</option><option>Dallas</option><option>Austin</option>
                                        <option>San Antonio</option><option>Fort Worth</option><option>El Paso</option>
                                    </optgroup>
                                    <optgroup label="Midwest">
                                        <option>Chicago</option><option>Detroit</option><option>Minneapolis</option>
                                        <option>Milwaukee</option><option>Indianapolis</option><option>Columbus</option>
                                        <option>Cleveland</option><option>Kansas City</option><option>St. Louis</option><option>Cincinnati</option>
                                    </optgroup>
                                    <optgroup label="Southeast">
                                        <option>Atlanta</option><option>Miami</option><option>Tampa</option><option>Orlando</option>
                                        <option>Nashville</option><option>Charlotte</option><option>Raleigh</option><option>Jacksonville</option>
                                        <option>Memphis</option><option>New Orleans</option><option>Birmingham</option>
                                        <option>Charleston</option><option>Savannah</option>
                                    </optgroup>
                                    <optgroup label="Northeast">
                                        <option>New York</option><option>Boston</option><option>Philadelphia</option>
                                        <option>Washington DC</option><option>Baltimore</option><option>Pittsburgh</option>
                                        <option>Hartford</option><option>Providence</option><option>Newark</option>
                                    </optgroup>
                                    <optgroup label="Other">
                                        <option>Honolulu</option><option>Anchorage</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Source</label>
                                <select className="input" value={source} onChange={e => setSource(e.target.value)}>
                                    <option value="web_search">Web Search</option>
                                    <option value="marketplace">Marketplace</option>
                                    <option value="google_maps">Google Maps</option>
                                    <option value="event_platform">Event Platform</option>
                                    <option value="instagram">Instagram</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Keywords (comma-separated)</label>
                            <input
                                className="input"
                                placeholder={isInstructor
                                    ? 'e.g. music school, after school program, Orange County'
                                    : 'e.g. site:craigslist.org, DJ gig, Orange County'}
                                value={keywords}
                                onChange={e => setKeywords(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                            <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                                {isInstructor
                                    ? 'Search for schools, studios, community centers, and programs that need music instructors'
                                    : <>Tip: Use <code>site:craigslist.org</code> or <code>site:facebook.com/marketplace</code> to target specific platforms</>}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary" onClick={handleAdd} style={isInstructor ? {
                                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                            } : undefined}>Add Seed</button>
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* Seeds by Region */}
                {loading ? (
                    <div className="loading-overlay"><div className="spinner" /><span>Loading seeds...</span></div>
                ) : seeds.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isInstructor ? '📚' : '🔍'}</div>
                        <h3 style={{ marginBottom: '8px' }}>No {isInstructor ? 'teaching' : 'performer'} seeds yet</h3>
                        <p className="text-muted" style={{ marginBottom: '16px' }}>
                            {isInstructor
                                ? 'Add seeds to start discovering music schools, studios, and teaching opportunities.'
                                : 'Add seeds to start discovering venues, events, and booking opportunities.'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => setShowForm(true)} style={isInstructor ? {
                                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                            } : undefined}>
                                + Add Custom Seed
                            </button>
                            <button className="btn btn-secondary" onClick={handleAddPresets} style={isInstructor ? {
                                background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(34,211,238,0.08))',
                                borderColor: 'rgba(56,189,248,0.3)',
                                color: '#38bdf8',
                            } : undefined}>
                                {isInstructor ? '🏫 Add Teaching Presets' : '🏪 Add Marketplace Presets'}
                            </button>
                        </div>
                    </div>
                ) : (
                    Object.entries(grouped).map(([regionName, regionSeeds]) => (
                        <div key={regionName} style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: accentColor }}>
                                📍 {regionName}
                                <span className="text-muted" style={{ fontSize: '13px', fontWeight: 400, marginLeft: '8px' }}>
                                    {regionSeeds.length} seeds
                                </span>
                            </h3>
                            <div className="seeds-grid">
                                {regionSeeds.map(seed => (
                                    <div key={seed.id} className="seed-card" style={isInstructor ? {
                                        borderColor: 'rgba(56,189,248,0.15)',
                                    } : undefined}>
                                        <div className="seed-keywords">
                                            {seed.keywords.map((kw, i) => (
                                                <span key={i} className={`badge ${kw.startsWith('site:') ? 'badge-confirmed' : 'badge-draft'}`}>
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="seed-meta">
                                            <span className={`badge ${isMarketplaceSeed(seed) ? 'badge-proposed' : 'badge-inquiry'}`}>
                                                {isMarketplaceSeed(seed) ? '🏪 marketplace' : seed.source.replace(/_/g, ' ')}
                                            </span>
                                            <span className={`badge ${seed.active ? 'badge-confirmed' : ''}`}>
                                                {seed.active ? '● Active' : '○ Inactive'}
                                            </span>
                                            <span className="badge" style={{
                                                background: accentBg,
                                                border: `1px solid ${accentBorder}`,
                                                color: accentColor,
                                                fontSize: '11px',
                                            }}>
                                                {isInstructor ? '📚 instructor' : '🎵 performer'}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleDelete(seed.id)}
                                            style={{ marginTop: '8px' }}
                                        >
                                            🗑 Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </>
    );
}
