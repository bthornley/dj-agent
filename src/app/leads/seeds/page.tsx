'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QuerySeed } from '@/lib/types';
import { fetchSeeds, createSeed, deleteSeed } from '@/lib/api-client';

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const MARKETPLACE_PRESETS: Record<string, { keywords: string[]; label: string }[]> = {
    'Orange County': [
        { keywords: ['site:craigslist.org', 'gig', 'Orange County'], label: 'Craigslist — Gigs' },
        { keywords: ['site:craigslist.org', 'musician wanted', 'Orange County'], label: 'Craigslist — Musicians Wanted' },
        { keywords: ['site:facebook.com/marketplace', 'gig', 'Orange County'], label: 'FB Marketplace — Gigs' },
        { keywords: ['site:facebook.com/marketplace', 'musician', 'Orange County'], label: 'FB Marketplace — Musicians' },
        { keywords: ['site:gigsalad.com', 'Orange County'], label: 'GigSalad' },
        { keywords: ['site:thumbtack.com', 'musician', 'Orange County'], label: 'Thumbtack' },
        { keywords: ['site:bark.com', 'musician', 'Orange County'], label: 'Bark' },
    ],
    'Long Beach': [
        { keywords: ['site:craigslist.org', 'gig', 'Long Beach'], label: 'Craigslist — Gigs' },
        { keywords: ['site:craigslist.org', 'musician wanted', 'Long Beach'], label: 'Craigslist — Musicians Wanted' },
        { keywords: ['site:facebook.com/marketplace', 'gig', 'Long Beach'], label: 'FB Marketplace — Gigs' },
        { keywords: ['site:facebook.com/marketplace', 'musician', 'Long Beach'], label: 'FB Marketplace — Musicians' },
        { keywords: ['site:gigsalad.com', 'Long Beach'], label: 'GigSalad' },
        { keywords: ['site:thumbtack.com', 'musician', 'Long Beach'], label: 'Thumbtack' },
        { keywords: ['site:bark.com', 'musician', 'Long Beach'], label: 'Bark' },
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

    const loadSeeds = async () => {
        try {
            const data = await fetchSeeds();
            setSeeds(data);
        } catch (err) {
            console.error('Failed to load seeds:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadSeeds(); }, []);

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

    const handleAddMarketplacePresets = async () => {
        setAddingPresets(true);
        try {
            const existingKeywords = new Set(seeds.map(s => s.keywords.join('|')));
            let added = 0;
            for (const [reg, presets] of Object.entries(MARKETPLACE_PRESETS)) {
                for (const preset of presets) {
                    const key = preset.keywords.join('|');
                    if (!existingKeywords.has(key)) {
                        await createSeed({
                            id: generateId(),
                            region: reg,
                            keywords: preset.keywords,
                            source: 'marketplace',
                            active: true,
                            created_at: new Date().toISOString(),
                        });
                        added++;
                    }
                }
            }
            await loadSeeds();
            setMessage(added > 0 ? `✅ Added ${added} marketplace seeds` : 'All marketplace seeds already added');
            setTimeout(() => setMessage(''), 4000);
        } catch {
            setMessage('Failed to add marketplace seeds');
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

    // Group seeds by region
    const grouped = seeds.reduce((acc, seed) => {
        const key = seed.region || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(seed);
        return acc;
    }, {} as Record<string, QuerySeed[]>);

    const isMarketplaceSeed = (seed: QuerySeed) =>
        seed.keywords.some(k => k.startsWith('site:'));

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">⚙</div>
                    <span>Query Seeds</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px' }}>
                    <Link href="/leads" className="btn btn-ghost btn-sm">← Leads</Link>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddMarketplacePresets}
                        disabled={addingPresets}
                        style={{ opacity: addingPresets ? 0.6 : 1 }}
                    >
                        {addingPresets ? '⏳ Adding...' : '🏪 Add Marketplace Seeds'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                        + Add Seed
                    </button>
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Search Seeds</h2>
                        <p className="section-subtitle">Configure what the Lead Finder searches for</p>
                    </div>
                </div>

                {message && <div className="alert alert-success">{message}</div>}

                {/* Add Form */}
                {showForm && (
                    <div className="card slide-up" style={{ marginBottom: '24px' }}>
                        <h3 className="card-title">Add New Seed</h3>
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
                                placeholder="e.g. site:craigslist.org, DJ gig, Orange County"
                                value={keywords}
                                onChange={e => setKeywords(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                            <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                                Tip: Use <code>site:craigslist.org</code> or <code>site:facebook.com/marketplace</code> to target specific platforms
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary" onClick={handleAdd}>Add Seed</button>
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* Seeds by Region */}
                {loading ? (
                    <div className="loading-overlay"><div className="spinner" /><span>Loading seeds...</span></div>
                ) : (
                    Object.entries(grouped).map(([regionName, regionSeeds]) => (
                        <div key={regionName} style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-accent)' }}>
                                📍 {regionName}
                                <span className="text-muted" style={{ fontSize: '13px', fontWeight: 400, marginLeft: '8px' }}>
                                    {regionSeeds.length} seeds
                                </span>
                            </h3>
                            <div className="seeds-grid">
                                {regionSeeds.map(seed => (
                                    <div key={seed.id} className="seed-card">
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
