'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lead } from '@/lib/types';
import { scanUrl, autoScan, batchScanUrls } from '@/lib/api-client';

type ScanMode = 'single' | 'batch' | 'auto';

export default function ScanPage() {
    const [mode, setMode] = useState<ScanMode>('batch');

    // Single scan state
    const [url, setUrl] = useState('');
    const [entityName, setEntityName] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('CA');

    // Batch scan state
    const [batchUrls, setBatchUrls] = useState('');

    // Auto scan state
    const [autoRegion, setAutoRegion] = useState('');
    const [autoLimit, setAutoLimit] = useState(5);
    const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);
    const [regions, setRegions] = useState<string[]>([]);

    // Fetch quota + regions on mount
    useEffect(() => {
        fetch('/api/leads/auto-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quota_check: true }),
        })
            .then(r => r.json())
            .then(data => { if (data.quota) setQuota(data.quota); })
            .catch(() => { });

        // Fetch regions from brand profile + seeds
        const regionSet = new Set<string>();
        Promise.all([
            fetch('/api/social/brand').then(r => r.json()).catch(() => null),
            fetch('/api/leads/seeds').then(r => r.json()).catch(() => []),
        ]).then(([brand, seeds]) => {
            // Brand profile locations
            if (brand?.locations) {
                for (const loc of brand.locations) regionSet.add(loc);
            }
            // Unique regions from seeds
            if (Array.isArray(seeds)) {
                for (const seed of seeds) {
                    if (seed.region) regionSet.add(seed.region);
                }
            }
            setRegions(Array.from(regionSet).sort());
        });
    }, []);

    // Shared state
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [singleResult, setSingleResult] = useState<{
        lead: Lead; isNew: boolean; isDuplicate: boolean;
        qcPassed: boolean; qcIssues: string[]; qcWarnings: string[];
    } | null>(null);
    const [batchResult, setBatchResult] = useState<{
        totalUrls: number; processed: number; highValue: number;
        filtered: number; errors: string[];
        results: { lead: Lead; isNew: boolean; qcPassed: boolean }[];
    } | null>(null);
    const [autoResult, setAutoResult] = useState<{
        seedsProcessed: number; totalUrls: number;
        highValueLeads: number; filteredOut: number;
        errors: string[];
        results: {
            region: string; keywords: string[];
            urlsFound: number; leadsCreated: number; leadsFiltered: number;
            leads: { lead_id: string; entity_name: string; lead_score: number; priority: string }[];
            errors: string[];
        }[];
    } | null>(null);

    const clearResults = () => {
        setSingleResult(null);
        setBatchResult(null);
        setAutoResult(null);
        setError('');
    };

    const handleSingleScan = async () => {
        if (!url.trim()) { setError('Enter a URL'); return; }
        setScanning(true); clearResults();
        try {
            const res = await scanUrl({
                url: url.trim(), entity_name: entityName.trim() || undefined,
                city: city.trim() || undefined, state: state.trim() || undefined,
            });
            setSingleResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Scan failed');
        } finally { setScanning(false); }
    };

    const handleBatchScan = async () => {
        const urls = batchUrls.split('\n').map(l => l.trim()).filter(Boolean);
        if (urls.length === 0) { setError('Paste at least one URL'); return; }
        setScanning(true); clearResults();
        try {
            const res = await batchScanUrls(urls.map(u => ({ url: u })));
            setBatchResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Batch scan failed');
        } finally { setScanning(false); }
    };

    const handleAutoScan = async () => {
        setScanning(true); clearResults();
        try {
            const res = await autoScan({
                auto: true,
                region: autoRegion || undefined,
                limit: autoLimit,
            });
            setAutoResult(res);
            if ((res as unknown as { quota?: typeof quota }).quota) {
                setQuota((res as unknown as { quota: typeof quota }).quota);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Auto-scan failed');
        } finally { setScanning(false); }
    };

    const scoreColor = (s: number) =>
        s >= 70 ? 'var(--accent-green)' : s >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)';

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🔍</div>
                    <span>Lead Scanner</span>
                </Link>
                <nav className="topbar-nav">
                    <Link href="/leads" className="btn btn-ghost btn-sm">← Leads</Link>
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Scan for Leads</h2>
                        <p className="section-subtitle">Find venues automatically — only high-value leads (P1/P2) are kept</p>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="scan-tabs">
                    <button className={`scan-tab ${mode === 'auto' ? 'active' : ''}`} onClick={() => { setMode('auto'); clearResults(); }}>
                        🤖 Auto-Discover
                    </button>
                    <button className={`scan-tab ${mode === 'batch' ? 'active' : ''}`} onClick={() => { setMode('batch'); clearResults(); }}>
                        📋 Batch URLs
                    </button>
                    <button className={`scan-tab ${mode === 'single' ? 'active' : ''}`} onClick={() => { setMode('single'); clearResults(); }}>
                        🔗 Single URL
                    </button>
                </div>

                {/* Auto-Discover */}
                {mode === 'auto' && (
                    <div className="card scan-form slide-up">
                        <h3 className="card-title">🤖 Auto-Discover from Seeds</h3>
                        <p className="text-muted" style={{ marginBottom: '16px' }}>
                            Uses your configured search seeds to find venues via web search.
                            Only leads scoring ≥ 40 (P1/P2) are saved.
                            Requires <code>SERPAPI_KEY</code> environment variable.
                        </p>

                        {/* Quota Meter */}
                        {quota && (
                            <div className="quota-meter" style={{ marginBottom: '20px' }}>
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
                                    {quota.remaining} searches remaining this month (free tier)
                                </div>
                            </div>
                        )}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Region (optional)</label>
                                <select className="input" value={autoRegion} onChange={e => setAutoRegion(e.target.value)}>
                                    <option value="">All Regions</option>
                                    {regions.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Seeds to Process</label>
                                <input className="input" type="number" min={1} max={20} value={autoLimit}
                                    onChange={e => setAutoLimit(parseInt(e.target.value) || 5)} style={{ maxWidth: '120px' }} />
                            </div>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handleAutoScan} disabled={scanning}>
                            {scanning ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Searching...</> : '🚀 Run Auto-Discovery'}
                        </button>
                    </div>
                )}

                {/* Batch URLs */}
                {mode === 'batch' && (
                    <div className="card scan-form slide-up">
                        <h3 className="card-title">📋 Batch URL Scanner</h3>
                        <p className="text-muted" style={{ marginBottom: '16px' }}>
                            Paste one URL per line. All will be scanned and only high-value leads (score ≥ 40) are kept.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Venue URLs (one per line)</label>
                            <textarea
                                className="textarea"
                                rows={8}
                                placeholder={"https://example-venue.com\nhttps://another-club.com\nhttps://cool-lounge.com"}
                                value={batchUrls}
                                onChange={e => setBatchUrls(e.target.value)}
                                disabled={scanning}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button className="btn btn-primary btn-lg" onClick={handleBatchScan} disabled={scanning}>
                                {scanning ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Scanning...</> : '🔍 Scan All'}
                            </button>
                            <span className="text-muted">
                                {batchUrls.split('\n').filter(l => l.trim()).length} URLs queued
                            </span>
                        </div>
                    </div>
                )}

                {/* Single URL */}
                {mode === 'single' && (
                    <div className="card scan-form slide-up">
                        <h3 className="card-title">🔗 Single URL Scanner</h3>
                        <div className="form-group">
                            <label className="form-label">Venue URL *</label>
                            <input className="input" placeholder="https://example-venue.com" value={url}
                                onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSingleScan()} disabled={scanning} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Entity Name (optional)</label>
                                <input className="input" placeholder="e.g. The Loft Lounge" value={entityName}
                                    onChange={e => setEntityName(e.target.value)} disabled={scanning} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">City (optional)</label>
                                <input className="input" placeholder="e.g. Costa Mesa" value={city}
                                    onChange={e => setCity(e.target.value)} disabled={scanning} />
                            </div>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handleSingleScan} disabled={scanning}>
                            {scanning ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Scanning...</> : '🔍 Scan & Extract'}
                        </button>
                    </div>
                )}

                {error && <div className="alert alert-error" style={{ marginTop: '16px' }}>⚠ {error}</div>}

                {/* ---- Auto-Discover Results ---- */}
                {autoResult && (
                    <div className="scan-results slide-up">
                        <div className="alert alert-success">
                            🤖 Auto-discovery complete — {autoResult.highValueLeads} high-value leads found,
                            {autoResult.filteredOut} low-value filtered out
                        </div>

                        <div className="stats-grid" style={{ marginTop: '16px' }}>
                            <div className="stat-card"><div className="stat-value">{autoResult.seedsProcessed}</div><div className="stat-label">Seeds Processed</div></div>
                            <div className="stat-card"><div className="stat-value">{autoResult.totalUrls}</div><div className="stat-label">URLs Found</div></div>
                            <div className="stat-card"><div className="stat-value">{autoResult.highValueLeads}</div><div className="stat-label">🔥 High-Value</div></div>
                            <div className="stat-card"><div className="stat-value">{autoResult.filteredOut}</div><div className="stat-label">Filtered Out</div></div>
                        </div>

                        {autoResult.results.map((seedResult, i) => (
                            <div key={i} className="card" style={{ marginTop: '16px' }}>
                                <h3 className="card-title">📍 {seedResult.region} — {seedResult.keywords.join(', ')}</h3>
                                <p className="text-muted">{seedResult.urlsFound} URLs → {seedResult.leadsCreated} leads kept, {seedResult.leadsFiltered} filtered</p>
                                {seedResult.leads.length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                        {seedResult.leads.map(lead => (
                                            <Link key={lead.lead_id} href={`/leads/detail?id=${lead.lead_id}`} style={{ textDecoration: 'none' }}>
                                                <div className="lead-row" style={{ marginTop: '4px' }}>
                                                    <div className="lead-col-name" style={{ gridColumn: '1 / 3' }}>
                                                        <span className="lead-name-link">{lead.entity_name}</span>
                                                    </div>
                                                    <div className="lead-col-score">
                                                        <div className="score-meter">
                                                            <div className="score-fill" style={{ width: `${lead.lead_score}%`, background: scoreColor(lead.lead_score) }} />
                                                        </div>
                                                        <span className="score-number">{lead.lead_score}</span>
                                                    </div>
                                                    <div><span className={`badge badge-${lead.priority.toLowerCase()}`}>{lead.priority}</span></div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                                {seedResult.errors.length > 0 && (
                                    <div className="text-muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                                        {seedResult.errors.length} errors encountered
                                    </div>
                                )}
                            </div>
                        ))}

                        {autoResult.errors.length > 0 && (
                            <details className="card" style={{ marginTop: '16px' }}>
                                <summary className="card-title" style={{ cursor: 'pointer' }}>⚠ {autoResult.errors.length} Errors</summary>
                                <ul style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                    {autoResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </details>
                        )}

                        <div style={{ marginTop: '20px' }}>
                            <Link href="/leads" className="btn btn-primary">View All Leads →</Link>
                        </div>
                    </div>
                )}

                {/* ---- Batch Results ---- */}
                {batchResult && (
                    <div className="scan-results slide-up">
                        <div className="alert alert-success">
                            📋 Batch scan complete — {batchResult.highValue} high-value leads kept, {batchResult.filtered} filtered out
                        </div>

                        <div className="stats-grid" style={{ marginTop: '16px' }}>
                            <div className="stat-card"><div className="stat-value">{batchResult.totalUrls}</div><div className="stat-label">URLs Scanned</div></div>
                            <div className="stat-card"><div className="stat-value">{batchResult.highValue}</div><div className="stat-label">🔥 High-Value</div></div>
                            <div className="stat-card"><div className="stat-value">{batchResult.filtered}</div><div className="stat-label">Filtered</div></div>
                            <div className="stat-card"><div className="stat-value">{batchResult.errors.length}</div><div className="stat-label">Errors</div></div>
                        </div>

                        {batchResult.results.map((r, i) => (
                            <Link key={i} href={`/leads/detail?id=${r.lead.lead_id}`} style={{ textDecoration: 'none' }}>
                                <div className="lead-row" style={{ marginTop: '4px' }}>
                                    <div className="lead-col-name" style={{ gridColumn: '1 / 3' }}>
                                        <span className="lead-name-link">{r.lead.entity_name}</span>
                                        <div className="lead-sub">{r.lead.entity_type.replace(/_/g, ' ')} · {r.lead.city || 'Unknown'}</div>
                                    </div>
                                    <div className="lead-col-score">
                                        <div className="score-meter">
                                            <div className="score-fill" style={{ width: `${r.lead.lead_score}%`, background: scoreColor(r.lead.lead_score) }} />
                                        </div>
                                        <span className="score-number">{r.lead.lead_score}</span>
                                    </div>
                                    <div><span className={`badge badge-${r.lead.priority.toLowerCase()}`}>{r.lead.priority}</span></div>
                                </div>
                            </Link>
                        ))}

                        {batchResult.errors.length > 0 && (
                            <details className="card" style={{ marginTop: '16px' }}>
                                <summary className="card-title" style={{ cursor: 'pointer' }}>⚠ {batchResult.errors.length} Errors</summary>
                                <ul style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                    {batchResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </details>
                        )}

                        <div style={{ marginTop: '20px' }}>
                            <Link href="/leads" className="btn btn-primary">View All Leads →</Link>
                        </div>
                    </div>
                )}

                {/* ---- Single URL Result ---- */}
                {singleResult && (
                    <div className="scan-results slide-up">
                        <div className={`alert ${singleResult.qcPassed ? 'alert-success' : 'alert-warning'}`}>
                            {singleResult.isDuplicate ? '🔄 Duplicate — merged' : '✅ New lead'}
                            {singleResult.qcPassed ? ' · QC passed' : ' · ⚠ QC issues'}
                            {singleResult.lead.lead_score < 40 && ' · ⚠ Low value (below threshold)'}
                        </div>

                        {singleResult.qcIssues.length > 0 && (
                            <div className="alert alert-error">
                                <strong>Issues:</strong>
                                <ul style={{ margin: '8px 0 0 16px' }}>
                                    {singleResult.qcIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="card" style={{ marginTop: '16px' }}>
                            <div className="lead-result-header">
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{singleResult.lead.entity_name}</h3>
                                    <p className="text-muted">
                                        {(singleResult.lead.entity_type || 'other').replace(/_/g, ' ')}
                                        {singleResult.lead.city ? ` · ${singleResult.lead.city}` : ''}
                                    </p>
                                </div>
                                <div className="score-circle" style={{ borderColor: scoreColor(singleResult.lead.lead_score) }}>
                                    <span className="score-value" style={{ color: scoreColor(singleResult.lead.lead_score) }}>{singleResult.lead.lead_score}</span>
                                    <span className="score-label">/ 100</span>
                                </div>
                            </div>

                            <div className="scan-result-grid">
                                <div className="scan-result-section">
                                    <h4>📞 Contact</h4>
                                    {singleResult.lead.email && <div>📧 {singleResult.lead.email}</div>}
                                    {singleResult.lead.phone && <div>📱 {singleResult.lead.phone}</div>}
                                    {singleResult.lead.instagram_handle && <div>📸 @{singleResult.lead.instagram_handle}</div>}
                                    {!singleResult.lead.email && !singleResult.lead.phone && !singleResult.lead.instagram_handle && <div className="text-muted">None found</div>}
                                </div>
                                <div className="scan-result-section">
                                    <h4>🎵 Fit</h4>
                                    <div className="tag-list">{singleResult.lead.music_fit_tags.map((t, i) => <span key={i} className="badge badge-draft">{t}</span>)}</div>
                                    <div className="tag-list" style={{ marginTop: 4 }}>{singleResult.lead.event_types_seen.map((t, i) => <span key={i} className="badge badge-inquiry">{t}</span>)}</div>
                                </div>
                                <div className="scan-result-section">
                                    <h4>📊 Score</h4>
                                    <div>{singleResult.lead.lead_score}/100 · {singleResult.lead.priority}</div>
                                    <div className="score-reason">{singleResult.lead.score_reason}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                                <Link href={`/leads/detail?id=${singleResult.lead.lead_id}`} className="btn btn-primary">View Detail →</Link>
                                <button className="btn btn-secondary" onClick={() => { clearResults(); setUrl(''); }}>Scan Another</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
