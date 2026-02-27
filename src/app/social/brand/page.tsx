'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { BrandProfile, ConnectedAccount, SocialPlatform } from '@/lib/types';
import { v4 as uuid } from 'uuid';

const EMPTY_PROFILE: BrandProfile = {
    id: uuid(),
    voiceExamples: ['', '', '', '', ''],
    vibeWords: [],
    emojis: [],
    avoidTopics: [],
    profanityLevel: 'mild',
    politicsAllowed: false,
    locations: [],
    typicalVenues: [],
    brandColors: ['#8b5cf6', '#22d3ee'],
    djName: '',
    bio: '',
    connectedAccounts: [],
    updatedAt: '',
};

const PLATFORM_CONFIG: Record<SocialPlatform, { icon: string; label: string; color: string; placeholder: string; tokenHelp: string }> = {
    instagram: { icon: '📸', label: 'Instagram', color: '#E4405F', placeholder: '@yourdj', tokenHelp: 'Get from Meta Business Suite → Settings → Advanced → Access Tokens' },
    facebook: { icon: '📘', label: 'Facebook', color: '#1877F2', placeholder: 'Your Page Name', tokenHelp: 'Get from developers.facebook.com → Tools → Graph API Explorer' },
    tiktok: { icon: '🎵', label: 'TikTok', color: '#000000', placeholder: '@yourdj', tokenHelp: 'Get from developers.tiktok.com → Manage Apps → Your App → API Key' },
};

export default function BrandSetupPage() {
    const [profile, setProfile] = useState<BrandProfile>(EMPTY_PROFILE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Temp inputs for list fields
    const [vibeInput, setVibeInput] = useState('');
    const [emojiInput, setEmojiInput] = useState('');
    const [avoidInput, setAvoidInput] = useState('');
    const [locationInput, setLocationInput] = useState('');
    const [venueInput, setVenueInput] = useState('');

    useEffect(() => {
        fetch('/api/social/brand')
            .then(r => r.json())
            .then(data => {
                if (data && data.id) {
                    // Merge with defaults to fill any missing fields (e.g. connectedAccounts)
                    setProfile({
                        ...EMPTY_PROFILE,
                        ...data,
                        connectedAccounts: data.connectedAccounts || [],
                        voiceExamples: data.voiceExamples?.length ? data.voiceExamples : EMPTY_PROFILE.voiceExamples,
                    });
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        setSaveError('');
        try {
            const res = await fetch('/api/social/brand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });
            if (res.ok) {
                setSaved(true);
            } else {
                const errData = await res.json().catch(() => ({}));
                setSaveError(errData.error || `Save failed (HTTP ${res.status})`);
            }
        } catch (e) {
            console.error(e);
            setSaveError('Network error — could not save');
        }
        setSaving(false);
        setTimeout(() => { setSaved(false); setSaveError(''); }, 5000);
    }

    function addToList(field: keyof BrandProfile, value: string) {
        if (!value.trim()) return;
        const current = profile[field] as string[];
        if (!current.includes(value.trim())) {
            setProfile({ ...profile, [field]: [...current, value.trim()] });
        }
    }

    function removeFromList(field: keyof BrandProfile, index: number) {
        const current = [...(profile[field] as string[])];
        current.splice(index, 1);
        setProfile({ ...profile, [field]: current });
    }

    function updateAccount(platform: SocialPlatform, field: keyof ConnectedAccount, value: string) {
        const accounts = [...(profile.connectedAccounts || [])];
        let account = accounts.find(a => a.platform === platform);
        if (!account) {
            account = {
                platform,
                handle: '',
                profileUrl: '',
                accessToken: '',
                pageId: '',
                connected: false,
                lastVerified: '',
                tokenExpiresAt: '',
            };
            accounts.push(account);
        }
        (account as unknown as Record<string, unknown>)[field] = value;
        // Auto-set connected status based on whether we have a token + handle
        account.connected = !!(account.accessToken && account.handle);
        setProfile({ ...profile, connectedAccounts: accounts });
    }

    if (loading) return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎧</div><span>StageScout</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/social" className="btn btn-ghost btn-sm">📱 Social</Link>
                    <Link href="/social/brand" className="btn btn-secondary btn-sm">🎨 Brand</Link>
                    <UserButton />
                </nav>
            </header>
            <main className="main-content"><div className="empty-state"><div className="spinner" /></div></main>
        </>
    );

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <div className="icon">🎧</div>
                    <span>StageScout</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/social" className="btn btn-ghost btn-sm">📱 Social</Link>
                    <Link href="/social/queue" className="btn btn-ghost btn-sm">📝 Queue</Link>
                    <Link href="/social/brand" className="btn btn-secondary btn-sm">🎨 Brand</Link>
                    <Link href="/social/analytics" className="btn btn-ghost btn-sm">📊 Analytics</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Brand Setup</h2>
                        <p className="section-subtitle">Define your voice, vibe, and boundaries for the Social Hype Agent</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {saved && <span style={{ color: 'var(--accent-green)', fontSize: '14px' }}>✅ Saved!</span>}
                        {saveError && <span style={{ color: 'var(--accent-red)', fontSize: '13px' }}>❌ {saveError}</span>}
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            {saving ? '⏳ Saving...' : '💾 Save Profile'}
                        </button>
                    </div>
                </div>

                <div className="brand-form-grid">
                    {/* Identity */}
                    <div className="card brand-section">
                        <h3 className="card-title">🎧 Identity</h3>
                        <div className="form-group">
                            <label className="form-label">DJ Name</label>
                            <input className="input" value={profile.djName}
                                onChange={e => setProfile({ ...profile, djName: e.target.value })}
                                placeholder="Your DJ / artist name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bio (one-liner)</label>
                            <input className="input" value={profile.bio}
                                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                placeholder="e.g. Open-format DJ bringing the energy to SoCal" />
                        </div>
                    </div>

                    {/* Voice Examples */}
                    <div className="card brand-section">
                        <h3 className="card-title">✍️ Voice Examples</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                            Paste 5 caption examples that sound like you. The agent uses these to match your tone.
                        </p>
                        {profile.voiceExamples.map((ex, i) => (
                            <div className="form-group" key={i}>
                                <label className="form-label">Caption #{i + 1}</label>
                                <textarea className="textarea" style={{ minHeight: '60px' }} value={ex}
                                    onChange={e => {
                                        const updated = [...profile.voiceExamples];
                                        updated[i] = e.target.value;
                                        setProfile({ ...profile, voiceExamples: updated });
                                    }}
                                    placeholder={`Example caption ${i + 1}...`} />
                            </div>
                        ))}
                    </div>

                    {/* Vibe & Emojis */}
                    <div className="card brand-section">
                        <h3 className="card-title">✨ Vibe & Emojis</h3>
                        <div className="form-group">
                            <label className="form-label">Vibe Words</label>
                            <div className="tag-input-row">
                                <input className="input" value={vibeInput}
                                    onChange={e => setVibeInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { addToList('vibeWords', vibeInput); setVibeInput(''); } }}
                                    placeholder="Type a vibe word and press Enter" />
                            </div>
                            <div className="tag-list">
                                {profile.vibeWords.map((w, i) => (
                                    <span key={i} className="tag" onClick={() => removeFromList('vibeWords', i)}>{w} ×</span>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Emojis You Use</label>
                            <div className="tag-input-row">
                                <input className="input" value={emojiInput}
                                    onChange={e => setEmojiInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { addToList('emojis', emojiInput); setEmojiInput(''); } }}
                                    placeholder="Add emojis one at a time" />
                            </div>
                            <div className="tag-list">
                                {profile.emojis.map((em, i) => (
                                    <span key={i} className="tag" onClick={() => removeFromList('emojis', i)}>{em} ×</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Boundaries */}
                    <div className="card brand-section">
                        <h3 className="card-title">🚧 Boundaries</h3>
                        <div className="form-group">
                            <label className="form-label">Topics to Avoid</label>
                            <div className="tag-input-row">
                                <input className="input" value={avoidInput}
                                    onChange={e => setAvoidInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { addToList('avoidTopics', avoidInput); setAvoidInput(''); } }}
                                    placeholder="e.g. politics, religion..." />
                            </div>
                            <div className="tag-list">
                                {profile.avoidTopics.map((t, i) => (
                                    <span key={i} className="tag tag-danger" onClick={() => removeFromList('avoidTopics', i)}>{t} ×</span>
                                ))}
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Profanity Level</label>
                                <select className="input" value={profile.profanityLevel}
                                    onChange={e => setProfile({ ...profile, profanityLevel: e.target.value as BrandProfile['profanityLevel'] })}>
                                    <option value="none">None — keep it clean</option>
                                    <option value="mild">Mild — damn, hell OK</option>
                                    <option value="any">Any — no filter</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Politics</label>
                                <select className="input" value={profile.politicsAllowed ? 'yes' : 'no'}
                                    onChange={e => setProfile({ ...profile, politicsAllowed: e.target.value === 'yes' })}>
                                    <option value="no">No politics</option>
                                    <option value="yes">OK to reference</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Locations */}
                    <div className="card brand-section">
                        <h3 className="card-title">📍 Locations & Venues</h3>
                        <div className="form-group">
                            <label className="form-label">Cities / Regions You Play</label>
                            <div className="tag-input-row">
                                <input className="input" value={locationInput}
                                    onChange={e => setLocationInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { addToList('locations', locationInput); setLocationInput(''); } }}
                                    placeholder="e.g. Orange County, LA, San Diego" />
                            </div>
                            <div className="tag-list">
                                {profile.locations.map((l, i) => (
                                    <span key={i} className="tag" onClick={() => removeFromList('locations', i)}>{l} ×</span>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Typical Venues</label>
                            <div className="tag-input-row">
                                <input className="input" value={venueInput}
                                    onChange={e => setVenueInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { addToList('typicalVenues', venueInput); setVenueInput(''); } }}
                                    placeholder="e.g. The Observatory, House of Blues" />
                            </div>
                            <div className="tag-list">
                                {profile.typicalVenues.map((v, i) => (
                                    <span key={i} className="tag" onClick={() => removeFromList('typicalVenues', i)}>{v} ×</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Connected Accounts — full width */}
                    <div className="card brand-section" style={{ gridColumn: '1 / -1' }}>
                        <h3 className="card-title">🔗 Connected Accounts</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                            Connect your social profiles to let the agent push approved drafts directly to each platform.
                        </p>

                        <div className="connected-accounts-grid">
                            {(['instagram', 'facebook', 'tiktok'] as SocialPlatform[]).map(platform => {
                                const config = PLATFORM_CONFIG[platform];
                                const existing = profile.connectedAccounts?.find(a => a.platform === platform);
                                return (
                                    <div key={platform} className={`connected-account-card ${existing?.connected ? 'account-connected' : ''}`}
                                        style={{ borderColor: existing?.connected ? config.color + '40' : undefined }}>
                                        <div className="account-card-header">
                                            <span className="account-icon" style={{ background: config.color + '20', color: config.color }}>{config.icon}</span>
                                            <span className="account-label">{config.label}</span>
                                            {existing?.connected && <span className="badge badge-approved" style={{ fontSize: '10px' }}>✓ Connected</span>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Handle</label>
                                            <input className="input" value={existing?.handle || ''}
                                                placeholder={config.placeholder}
                                                onChange={e => updateAccount(platform, 'handle', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Profile URL</label>
                                            <input className="input" value={existing?.profileUrl || ''}
                                                placeholder={`https://${platform}.com/...`}
                                                onChange={e => updateAccount(platform, 'profileUrl', e.target.value)} />
                                        </div>
                                        {platform !== 'tiktok' && (
                                            <div className="form-group">
                                                <label className="form-label">{platform === 'instagram' ? 'IG Business Account ID' : 'Page ID'}</label>
                                                <input className="input" value={existing?.pageId || ''}
                                                    placeholder="Numeric ID from Meta Business Suite"
                                                    onChange={e => updateAccount(platform, 'pageId', e.target.value)} />
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label className="form-label">Access Token</label>
                                            <input className="input" type="password" value={existing?.accessToken || ''}
                                                placeholder="Paste your API token"
                                                onChange={e => updateAccount(platform, 'accessToken', e.target.value)} />
                                            <p className="form-hint">{config.tokenHelp}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
