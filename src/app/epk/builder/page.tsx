'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import ModeSwitch from '@/components/ModeSwitch';
import { useAppMode } from '@/hooks/useAppMode';

interface EPKConfig {
    headline: string;
    tagline: string;
    bio: string;
    sectionOrder: string[];
    hiddenSections: string[];
    customSections: { id: string; title: string; body: string }[];
    selectedMedia: string[];
    selectedEvents: string[];
    theme: 'dark' | 'light' | 'gradient';
    accentColor: string;
    updatedAt: string;
}

interface ContentVariant { style: string; text: string; }

const SECTION_LABELS: Record<string, string> = {
    socials: '🔗 Social Links',
    stats: '📊 Stats',
    gallery: '📸 Gallery',
    videos: '🎬 Videos',
    venues: '🏢 Venues',
    upcoming: '📅 Upcoming Events',
    past: '✅ Past Events',
    custom: '📝 Custom Sections',
};

const DEFAULT_SECTIONS = ['socials', 'stats', 'gallery', 'videos', 'venues', 'upcoming', 'past', 'custom'];

const ACCENT_PRESETS = ['#a855f7', '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function EPKBuilderPage() {
    const { user } = useUser();
    const [config, setConfig] = useState<EPKConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [bioVariants, setBioVariants] = useState<ContentVariant[] | null>(null);
    const [taglineVariants, setTaglineVariants] = useState<ContentVariant[] | null>(null);
    const [generatingBio, setGeneratingBio] = useState(false);
    const [generatingTagline, setGeneratingTagline] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'content' | 'design' | 'sections'>('content');

    useEffect(() => {
        fetch('/api/epk/builder')
            .then(r => r.json())
            .then(data => {
                setConfig(data.config || {
                    headline: '', tagline: '', bio: '',
                    sectionOrder: DEFAULT_SECTIONS,
                    hiddenSections: [], customSections: [],
                    selectedMedia: [], selectedEvents: [],
                    theme: 'dark', accentColor: '#a855f7', updatedAt: '',
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const updateConfig = (updates: Partial<EPKConfig>) => {
        if (!config) return;
        setConfig({ ...config, ...updates });
        setSaved(false);
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const res = await fetch('/api/epk/builder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                setSaved(true);
                setMessage('✅ EPK saved!');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch { setMessage('Failed to save'); }
        setSaving(false);
    };

    const handleGenerateBio = async () => {
        setGeneratingBio(true);
        try {
            const res = await fetch('/api/epk/builder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'bio' }),
            });
            const data = await res.json();
            if (data.variants) setBioVariants(data.variants);
            else setMessage(data.error || 'Failed to generate');
        } catch { setMessage('Failed to generate bio'); }
        setGeneratingBio(false);
    };

    const handleGenerateTagline = async () => {
        setGeneratingTagline(true);
        try {
            const res = await fetch('/api/epk/builder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'tagline' }),
            });
            const data = await res.json();
            if (data.variants) setTaglineVariants(data.variants);
            else setMessage(data.error || 'Failed to generate');
        } catch { setMessage('Failed to generate taglines'); }
        setGeneratingTagline(false);
    };

    const toggleSection = (sectionId: string) => {
        if (!config) return;
        const hidden = new Set(config.hiddenSections);
        if (hidden.has(sectionId)) hidden.delete(sectionId);
        else hidden.add(sectionId);
        updateConfig({ hiddenSections: Array.from(hidden) });
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (!config) return;
        const order = [...config.sectionOrder];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= order.length) return;
        [order[index], order[target]] = [order[target], order[index]];
        updateConfig({ sectionOrder: order });
    };

    const addCustomSection = () => {
        if (!config) return;
        const id = `custom_${Date.now()}`;
        updateConfig({
            customSections: [...config.customSections, { id, title: 'New Section', body: '' }],
        });
    };

    const updateCustomSection = (id: string, updates: { title?: string; body?: string }) => {
        if (!config) return;
        updateConfig({
            customSections: config.customSections.map(s => s.id === id ? { ...s, ...updates } : s),
        });
    };

    const removeCustomSection = (id: string) => {
        if (!config) return;
        updateConfig({
            customSections: config.customSections.filter(s => s.id !== id),
        });
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <div className="spinner" />
        </div>
    );

    if (!config) return null;

    const accent = config.accentColor || '#a855f7';
    const { isTeacher, headerStyle, logoFilter } = useAppMode();

    return (
        <>
            <header className="topbar" style={headerStyle}>
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: logoFilter }} />
                    <span style={isTeacher ? { color: '#38bdf8' } : undefined}>EPK Builder</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
                    {user && (
                        <a href={`/epk/${user.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                            👁 View Public EPK
                        </a>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || saved}>
                        {saving ? '💾 Saving...' : saved ? '✅ Saved' : '💾 Save EPK'}
                    </button>
                    <ModeSwitch />
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in" style={{ maxWidth: '1200px' }}>
                {message && <div className="alert alert-success">{message}</div>}

                {/* Editor Tabs */}
                <div className="tabs" style={{ marginBottom: '24px' }}>
                    <button className={`tab ${activeTab === 'content' ? 'active' : ''}`}
                        onClick={() => setActiveTab('content')}>✏️ Content</button>
                    <button className={`tab ${activeTab === 'design' ? 'active' : ''}`}
                        onClick={() => setActiveTab('design')}>🎨 Design</button>
                    <button className={`tab ${activeTab === 'sections' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sections')}>📋 Sections</button>
                </div>

                {/* Content Tab */}
                {activeTab === 'content' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Headline */}
                        <div className="card">
                            <h3 className="card-title">🎤 Headline</h3>
                            <input className="input" placeholder="Your DJ / Artist Name"
                                value={config.headline} onChange={e => updateConfig({ headline: e.target.value })} />
                        </div>

                        {/* Tagline */}
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>✨ Tagline</h3>
                                <button className="btn btn-secondary btn-sm" onClick={handleGenerateTagline} disabled={generatingTagline}>
                                    {generatingTagline ? '⏳ Generating...' : '✨ AI Suggest'}
                                </button>
                            </div>
                            <input className="input" placeholder="A catchy one-liner about your style"
                                value={config.tagline} onChange={e => updateConfig({ tagline: e.target.value })} />
                            {taglineVariants && (
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pick one:</span>
                                    {taglineVariants.map((v, i) => (
                                        <button key={i} className="btn btn-ghost" style={{
                                            textAlign: 'left', padding: '10px 14px', borderRadius: '8px',
                                            border: '1px solid var(--border)', fontSize: '14px',
                                        }}
                                            onClick={() => { updateConfig({ tagline: v.text }); setTaglineVariants(null); }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: 600, marginRight: '8px' }}>{v.style}</span>
                                            {v.text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bio */}
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>📝 Bio</h3>
                                <button className="btn btn-secondary btn-sm" onClick={handleGenerateBio} disabled={generatingBio}>
                                    {generatingBio ? '⏳ Generating...' : '✨ AI Write Bio'}
                                </button>
                            </div>
                            <textarea className="textarea" rows={5} placeholder="Tell your story..."
                                value={config.bio} onChange={e => updateConfig({ bio: e.target.value })} />
                            {bioVariants && (
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pick a variant:</span>
                                    {bioVariants.map((v, i) => (
                                        <button key={i} className="btn btn-ghost" style={{
                                            textAlign: 'left', padding: '12px 14px', borderRadius: '8px',
                                            border: '1px solid var(--border)', fontSize: '13px', lineHeight: 1.5,
                                            whiteSpace: 'pre-wrap',
                                        }}
                                            onClick={() => { updateConfig({ bio: v.text }); setBioVariants(null); }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: 600, marginBottom: '4px' }}>{v.style}</div>
                                            {v.text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Custom Sections */}
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>📝 Custom Sections</h3>
                                <button className="btn btn-secondary btn-sm" onClick={addCustomSection}>+ Add Section</button>
                            </div>
                            {config.customSections.length === 0 && (
                                <p className="text-muted">No custom sections yet. Add one to include freeform content in your EPK.</p>
                            )}
                            {config.customSections.map(section => (
                                <div key={section.id} style={{
                                    padding: '12px', borderRadius: '8px', border: '1px solid var(--border)',
                                    marginBottom: '10px', background: 'var(--surface-raised)',
                                }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input className="input" style={{ flex: 1 }} placeholder="Section Title"
                                            value={section.title}
                                            onChange={e => updateCustomSection(section.id, { title: e.target.value })} />
                                        <button className="btn btn-ghost btn-sm" onClick={() => removeCustomSection(section.id)}
                                            style={{ color: 'var(--accent-red)' }}>✕</button>
                                    </div>
                                    <textarea className="textarea" rows={3} placeholder="Section content..."
                                        value={section.body}
                                        onChange={e => updateCustomSection(section.id, { body: e.target.value })} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Design Tab */}
                {activeTab === 'design' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Theme */}
                        <div className="card">
                            <h3 className="card-title">🎨 Theme</h3>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                {(['dark', 'light', 'gradient'] as const).map(theme => (
                                    <button key={theme} className="btn"
                                        style={{
                                            padding: '16px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                                            border: config.theme === theme ? `2px solid ${accent}` : '2px solid var(--border)',
                                            background: theme === 'dark' ? '#0a0a1a' : theme === 'light' ? '#f0f0f0' : 'linear-gradient(135deg, #0a0a1a, #1a1a3e)',
                                            color: theme === 'light' ? '#111' : '#fff',
                                        }}
                                        onClick={() => updateConfig({ theme })}>
                                        {theme === 'dark' ? '🌙 Dark' : theme === 'light' ? '☀️ Light' : '🌈 Gradient'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accent Color */}
                        <div className="card">
                            <h3 className="card-title">🎨 Accent Color</h3>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {ACCENT_PRESETS.map(color => (
                                    <button key={color} onClick={() => updateConfig({ accentColor: color })}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                                            background: color, cursor: 'pointer',
                                            outline: config.accentColor === color ? '3px solid white' : 'none',
                                            outlineOffset: '2px',
                                        }} />
                                ))}
                                <input type="color" value={config.accentColor}
                                    onChange={e => updateConfig({ accentColor: e.target.value })}
                                    style={{ width: '40px', height: '40px', border: 'none', borderRadius: '50%', cursor: 'pointer' }} />
                            </div>
                            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: accent }} />
                                <code style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{accent}</code>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="card">
                            <h3 className="card-title">👁 Preview</h3>
                            <div style={{
                                marginTop: '12px', padding: '32px', borderRadius: '12px',
                                background: config.theme === 'light' ? '#f8f8fa' : config.theme === 'gradient'
                                    ? 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%)' : '#0a0a1a',
                                color: config.theme === 'light' ? '#111' : '#fff',
                                textAlign: 'center',
                            }}>
                                <div style={{
                                    display: 'inline-block', padding: '4px 12px', borderRadius: '16px',
                                    background: `${accent}22`, border: `1px solid ${accent}44`,
                                    fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px',
                                    color: accent, marginBottom: '12px',
                                }}>
                                    Electronic Press Kit
                                </div>
                                <h2 style={{
                                    fontSize: '28px', fontWeight: 800, margin: '0 0 8px',
                                    background: `linear-gradient(135deg, ${config.theme === 'light' ? '#111' : '#fff'} 0%, ${accent} 100%)`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    {config.headline || 'Your Name'}
                                </h2>
                                {config.tagline && (
                                    <p style={{ fontSize: '14px', color: config.theme === 'light' ? '#666' : '#999', margin: 0 }}>
                                        {config.tagline}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sections Tab */}
                {activeTab === 'sections' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="card">
                            <h3 className="card-title">📋 Section Order & Visibility</h3>
                            <p className="text-muted" style={{ marginBottom: '16px' }}>
                                Drag sections to reorder. Toggle visibility to show/hide sections on your public EPK.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {config.sectionOrder.map((sectionId, i) => {
                                    const isHidden = config.hiddenSections.includes(sectionId);
                                    return (
                                        <div key={sectionId} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '10px 14px', borderRadius: '8px',
                                            background: isHidden ? 'var(--surface-raised)' : 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            opacity: isHidden ? 0.5 : 1,
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <button className="btn btn-ghost" style={{ padding: '2px', fontSize: '10px', lineHeight: 1 }}
                                                    onClick={() => moveSection(i, 'up')} disabled={i === 0}>▲</button>
                                                <button className="btn btn-ghost" style={{ padding: '2px', fontSize: '10px', lineHeight: 1 }}
                                                    onClick={() => moveSection(i, 'down')} disabled={i === config.sectionOrder.length - 1}>▼</button>
                                            </div>
                                            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                                                {SECTION_LABELS[sectionId] || sectionId}
                                            </span>
                                            <button className="btn btn-ghost btn-sm"
                                                onClick={() => toggleSection(sectionId)}
                                                style={{ fontSize: '12px', color: isHidden ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                {isHidden ? '👁 Show' : '🚫 Hide'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Copy EPK Link */}
                        {user && (
                            <div className="card">
                                <h3 className="card-title">🔗 Share Your EPK</h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                                    <input className="input" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/epk/${user.id}`}
                                        style={{ flex: 1, fontSize: '13px' }} />
                                    <button className="btn btn-primary btn-sm" onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/epk/${user.id}`);
                                        setMessage('📋 Link copied!');
                                        setTimeout(() => setMessage(''), 3000);
                                    }}>
                                        📋 Copy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom Save Bar */}
                <div style={{
                    position: 'sticky', bottom: 0, padding: '16px 0', marginTop: '24px',
                    display: 'flex', gap: '12px', justifyContent: 'center',
                    background: 'var(--bg-primary)', borderTop: '1px solid var(--border)',
                }}>
                    <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving || saved}>
                        {saving ? '💾 Saving...' : saved ? '✅ Saved' : '💾 Save EPK'}
                    </button>
                    {user && (
                        <a href={`/epk/${user.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                            👁 Preview Public EPK
                        </a>
                    )}
                </div>
            </main>
        </>
    );
}
