'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { FLYER_STYLES, ASPECT_RATIOS, FONT_OPTIONS, getStylePreset } from '@/lib/flyer/styles';
import { Event } from '@/lib/types';
import { FlyerConfig } from '@/lib/db';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

const DEFAULT_FLYER: Omit<FlyerConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
    style: 'neon-club',
    aspectRatio: '1:1',
    backgroundUrl: '',
    overlayOpacity: 20,
    headline: 'YOUR EVENT NAME',
    subheadline: 'feat. DJ NAME',
    dateText: 'FRI MAR 14 • 10PM',
    venueText: 'The Venue, City',
    extraText: '21+ • $15 presale',
    djName: '',
    headlineFont: 'Bebas Neue',
    bodyFont: 'Inter',
    headlineColor: '#e879f9',
    bodyColor: '#e2e8f0',
    textPosition: 'bottom',
    textAlign: 'center',
    eventId: '',
};

export default function FlyerCreatorPage() {
    const { toast } = useToast();
    const previewRef = useRef<HTMLDivElement>(null);

    const [flyer, setFlyer] = useState(DEFAULT_FLYER);
    const [events, setEvents] = useState<Event[]>([]);
    const [savedFlyers, setSavedFlyers] = useState<FlyerConfig[]>([]);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [generatingBg, setGeneratingBg] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [qrUrl, setQrUrl] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const uploadRef = useRef<HTMLInputElement>(null);
    const logoRef = useRef<HTMLInputElement>(null);

    // Load events + saved flyers + brand profile on mount
    useEffect(() => {
        fetch('/api/events').then(r => r.json()).then(d => setEvents(Array.isArray(d) ? d : [])).catch(() => { });
        fetch('/api/flyer').then(r => r.json()).then(d => setSavedFlyers(Array.isArray(d) ? d : [])).catch(() => { });
        fetch('/api/social/brand').then(r => r.json()).then(data => {
            if (data?.djName) {
                setFlyer(f => ({
                    ...f,
                    djName: data.djName,
                    subheadline: `feat. ${data.djName}`,
                    ...(data.brandColors?.[0] ? { headlineColor: data.brandColors[0] } : {}),
                }));
            }
        }).catch(() => { });

        // Load Google Fonts
        const fonts = [...new Set(FONT_OPTIONS)].map(f => f.replace(/ /g, '+')).join('&family=');
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fonts}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    const applyStyle = useCallback((styleId: string) => {
        const preset = getStylePreset(styleId);
        if (preset) {
            setFlyer(f => ({
                ...f,
                style: styleId,
                headlineFont: preset.headlineFont,
                bodyFont: preset.bodyFont,
                headlineColor: preset.headlineColor,
                bodyColor: preset.bodyColor,
                overlayOpacity: preset.overlayOpacity,
            }));
        }
    }, []);

    const applyEvent = (eventId: string) => {
        const ev = events.find(e => e.id === eventId);
        if (!ev) return;
        const dateStr = ev.date ? new Date(ev.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() : '';
        const timeStr = ev.startTime ? ` • ${ev.startTime}` : '';
        setFlyer(f => ({
            ...f,
            eventId,
            headline: ev.venueName || ev.clientName || f.headline,
            dateText: `${dateStr}${timeStr}`,
            venueText: ev.venueName ? `${ev.venueName}${ev.address ? `, ${ev.address}` : ''}` : f.venueText,
            extraText: ev.vibeDescription || f.extraText,
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = editId ? { ...flyer, id: editId } : flyer;
            const res = await fetch('/api/flyer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const saved = await res.json();
            if (saved.id) {
                setEditId(saved.id);
                toast('💾 Flyer saved!', 'success');
                // Refresh saved flyers
                fetch('/api/flyer').then(r => r.json()).then(setSavedFlyers).catch(() => { });
            }
        } catch { toast('Failed to save', 'error'); }
        setSaving(false);
    };

    const handleExport = async () => {
        if (!previewRef.current) return;
        setExporting(true);
        try {
            const ratio = ASPECT_RATIOS[flyer.aspectRatio];
            const canvas = await html2canvas(previewRef.current, {
                scale: ratio.width / previewRef.current.offsetWidth,
                useCORS: true,
                backgroundColor: '#000',
            });
            const link = document.createElement('a');
            link.download = `flyer-${flyer.headline.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast('📥 Downloaded!', 'success');
        } catch { toast('Export failed', 'error'); }
        setExporting(false);
    };

    const loadFlyer = (f: FlyerConfig) => {
        setEditId(f.id);
        setFlyer({
            style: f.style || 'neon-club',
            aspectRatio: f.aspectRatio || '1:1',
            backgroundUrl: f.backgroundUrl || '',
            backgroundPrompt: f.backgroundPrompt,
            overlayOpacity: f.overlayOpacity ?? 20,
            headline: f.headline || '',
            subheadline: f.subheadline || '',
            dateText: f.dateText || '',
            venueText: f.venueText || '',
            extraText: f.extraText || '',
            djName: f.djName || '',
            headlineFont: f.headlineFont || 'Bebas Neue',
            bodyFont: f.bodyFont || 'Inter',
            headlineColor: f.headlineColor || '#e879f9',
            bodyColor: f.bodyColor || '#e2e8f0',
            textPosition: f.textPosition || 'bottom',
            textAlign: f.textAlign || 'center',
            eventId: f.eventId || '',
        });
    };

    const deleteFlyer = async (id: string) => {
        await fetch('/api/flyer', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setSavedFlyers(prev => prev.filter(f => f.id !== id));
        if (editId === id) setEditId(null);
        toast('🗑 Flyer deleted', 'info');
    };

    const handleGenerateBg = async () => {
        setGeneratingBg(true);
        try {
            const ev = flyer.eventId ? events.find(e => e.id === flyer.eventId) : null;
            const res = await fetch('/api/flyer/generate-bg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    style: flyer.style,
                    aspectRatio: flyer.aspectRatio,
                    eventType: ev?.eventType,
                    vibeWords: ev?.vibeDescription?.split(/[,;]/).map(s => s.trim()).filter(Boolean),
                    customPrompt: customPrompt || undefined,
                }),
            });
            const data = await res.json();
            if (data.url) {
                setFlyer(f => ({ ...f, backgroundUrl: data.url, backgroundPrompt: data.prompt }));
                toast('✨ Background generated!', 'success');
            } else {
                toast(data.error || 'Generation failed', 'error');
            }
        } catch { toast('Failed to generate background', 'error'); }
        setGeneratingBg(false);
    };

    const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setFlyer(f => ({ ...f, backgroundUrl: reader.result as string }));
            toast('🖼 Background uploaded!', 'success');
        };
        reader.readAsDataURL(file);
    };

    const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setLogoUrl(reader.result as string);
            toast('🎯 Logo added!', 'success');
        };
        reader.readAsDataURL(file);
    };

    const generateQR = async (url: string) => {
        if (!url) { setQrDataUrl(''); return; }
        try {
            const dataUrl = await QRCode.toDataURL(url, {
                width: 200, margin: 1,
                color: { dark: '#ffffffdd', light: '#00000000' },
            });
            setQrDataUrl(dataUrl);
        } catch { setQrDataUrl(''); }
    };

    // Derived
    const stylePreset = getStylePreset(flyer.style);
    const bg = flyer.backgroundUrl || stylePreset?.background || FLYER_STYLES[0].background;
    const ratio = ASPECT_RATIOS[flyer.aspectRatio];
    const previewAspect = ratio.height / ratio.width;

    const textJustify = flyer.textPosition === 'top' ? 'flex-start' : flyer.textPosition === 'center' ? 'center' : 'flex-end';

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>

                    {/* LEFT — Live Preview */}
                    <div>
                        <div
                            ref={previewRef}
                            style={{
                                width: '100%',
                                paddingBottom: `${previewAspect * 100}%`,
                                position: 'relative',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                background: bg.startsWith('http') ? `url(${bg}) center/cover` : bg,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            }}
                        >
                            {/* Dark overlay */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: `rgba(0,0,0,${flyer.overlayOpacity / 100})`,
                            }} />

                            {/* Text content */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column',
                                justifyContent: textJustify,
                                textAlign: flyer.textAlign as 'left' | 'center' | 'right',
                                padding: '10%',
                                gap: '8px',
                            }}>
                                {flyer.headline && (
                                    <div style={{
                                        fontFamily: `'${flyer.headlineFont}', sans-serif`,
                                        fontSize: 'clamp(24px, 5vw, 48px)',
                                        fontWeight: 800,
                                        color: flyer.headlineColor,
                                        lineHeight: 1.1,
                                        textTransform: 'uppercase',
                                        letterSpacing: '2px',
                                        textShadow: '0 2px 16px rgba(0,0,0,0.6)',
                                    }}>
                                        {flyer.headline}
                                    </div>
                                )}
                                {flyer.subheadline && (
                                    <div style={{
                                        fontFamily: `'${flyer.bodyFont}', sans-serif`,
                                        fontSize: 'clamp(14px, 2.5vw, 24px)',
                                        color: flyer.bodyColor,
                                        letterSpacing: '1px',
                                        textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                                    }}>
                                        {flyer.subheadline}
                                    </div>
                                )}
                                <div style={{ height: '16px' }} />
                                {flyer.dateText && (
                                    <div style={{
                                        fontFamily: `'${flyer.headlineFont}', sans-serif`,
                                        fontSize: 'clamp(16px, 3vw, 28px)',
                                        fontWeight: 700,
                                        color: flyer.headlineColor,
                                        letterSpacing: '3px',
                                        textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                                    }}>
                                        {flyer.dateText}
                                    </div>
                                )}
                                {flyer.venueText && (
                                    <div style={{
                                        fontFamily: `'${flyer.bodyFont}', sans-serif`,
                                        fontSize: 'clamp(12px, 2vw, 18px)',
                                        color: flyer.bodyColor,
                                        opacity: 0.9,
                                        textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                                    }}>
                                        {flyer.venueText}
                                    </div>
                                )}
                                {flyer.extraText && (
                                    <div style={{
                                        fontFamily: `'${flyer.bodyFont}', sans-serif`,
                                        fontSize: 'clamp(10px, 1.5vw, 14px)',
                                        color: flyer.bodyColor,
                                        opacity: 0.7,
                                        marginTop: '4px',
                                        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                                    }}>
                                        {flyer.extraText}
                                    </div>
                                )}
                            </div>

                            {/* QR code overlay */}
                            {qrDataUrl && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '4%', right: '4%',
                                    width: 'clamp(48px, 12%, 96px)',
                                    height: 'clamp(48px, 12%, 96px)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: 'rgba(0,0,0,0.3)',
                                    backdropFilter: 'blur(4px)',
                                    padding: '4px',
                                }}>
                                    <img src={qrDataUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                            )}

                            {/* Logo overlay */}
                            {logoUrl && (
                                <div style={{
                                    position: 'absolute',
                                    top: '4%', right: '4%',
                                    width: 'clamp(40px, 10%, 80px)',
                                    height: 'clamp(40px, 10%, 80px)',
                                }}>
                                    <img src={logoUrl} alt="Logo" style={{
                                        width: '100%', height: '100%', objectFit: 'contain',
                                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                                    }} />
                                </div>
                            )}
                        </div>

                        {/* Export buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
                                {exporting ? '⏳ Exporting...' : '📥 Download PNG'}
                            </button>
                            <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
                                {saving ? '⏳ Saving...' : editId ? '💾 Update' : '💾 Save Flyer'}
                            </button>
                            {editId && (
                                <button className="btn btn-ghost" onClick={() => { setEditId(null); setFlyer(DEFAULT_FLYER); }}>
                                    + New Flyer
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — Controls Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Event Picker */}
                        {events.length > 0 && (
                            <div className="card" style={{ padding: '16px' }}>
                                <label className="form-label">📌 Auto-fill from Event</label>
                                <select
                                    className="input"
                                    value={flyer.eventId || ''}
                                    onChange={e => { if (e.target.value) applyEvent(e.target.value); }}
                                >
                                    <option value="">Select an event...</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.clientName || ev.venueName} — {ev.date}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Style Presets */}
                        <div className="card" style={{ padding: '16px' }}>
                            <label className="form-label">🎨 Style</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                {FLYER_STYLES.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => applyStyle(s.id)}
                                        style={{
                                            padding: '12px 4px',
                                            borderRadius: '8px',
                                            border: flyer.style === s.id ? '2px solid #a855f7' : '1px solid var(--glass-border)',
                                            background: s.background,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'transform 0.15s',
                                        }}
                                    >
                                        <div style={{ fontSize: '20px' }}>{s.preview}</div>
                                        <div style={{ fontSize: '10px', color: '#fff', marginTop: '4px' }}>{s.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* AI Background */}
                        <div className="card" style={{ padding: '16px' }}>
                            <label className="form-label">🖼 AI Background</label>
                            <input
                                className="input"
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                placeholder="Custom prompt (optional) e.g. 'rooftop party at sunset'"
                                style={{ marginBottom: '10px', fontSize: '13px' }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerateBg}
                                disabled={generatingBg}
                                style={{ width: '100%' }}
                            >
                                {generatingBg ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span className="spinner" style={{ width: 16, height: 16 }} /> Generating...
                                    </span>
                                ) : '✨ Generate AI Background'}
                            </button>
                            {flyer.backgroundUrl && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setFlyer(f => ({ ...f, backgroundUrl: '' }))}
                                    style={{ marginTop: '8px', width: '100%', fontSize: '12px' }}
                                >
                                    ✕ Remove AI Background
                                </button>
                            )}
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', margin: 0 }}>
                                Requires OPENAI_API_KEY. Uses DALL-E 3.
                            </p>
                            <div style={{ marginTop: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>📎 Or upload your own</label>
                                <input
                                    ref={uploadRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadBg}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => uploadRef.current?.click()}
                                    style={{ width: '100%' }}
                                >🖼 Upload Background Image</button>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="card" style={{ padding: '16px' }}>
                            <label className="form-label">📱 QR Code</label>
                            <input
                                className="input"
                                value={qrUrl}
                                onChange={e => { setQrUrl(e.target.value); generateQR(e.target.value); }}
                                placeholder="Ticket link (e.g. eventbrite.com/...)"
                                style={{ fontSize: '13px' }}
                            />
                            {qrDataUrl && (
                                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>✓ QR code visible on flyer</span>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setQrUrl(''); setQrDataUrl(''); }} style={{ fontSize: '12px' }}>✕</button>
                                </div>
                            )}
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', margin: 0 }}>
                                Appears bottom-right of the flyer.
                            </p>
                        </div>

                        {/* Logo Upload */}
                        <div className="card" style={{ padding: '16px' }}>
                            <label className="form-label">🎯 Logo / Watermark</label>
                            <input
                                ref={logoRef}
                                type="file"
                                accept="image/*"
                                onChange={handleUploadLogo}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => logoRef.current?.click()}
                                style={{ width: '100%' }}
                            >{logoUrl ? '★ Change Logo' : '★ Upload Logo'}</button>
                            {logoUrl && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setLogoUrl('')}
                                    style={{ width: '100%', marginTop: '6px', fontSize: '12px' }}
                                >✕ Remove Logo</button>
                            )}
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', margin: 0 }}>
                                Appears top-right of the flyer. Use a transparent PNG.
                            </p>
                        </div>

                        {/* Aspect Ratio */}
                        <div className="card" style={{ padding: '16px' }}>
                            <label className="form-label">📏 Size</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(Object.entries(ASPECT_RATIOS) as [string, { label: string }][]).map(([key, v]) => (
                                    <button
                                        key={key}
                                        className={`btn btn-sm ${flyer.aspectRatio === key ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setFlyer(f => ({ ...f, aspectRatio: key as '9:16' | '1:1' | '16:9' }))}
                                        style={{ flex: 1 }}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Text Fields */}
                        <div className="card" style={{ padding: '16px' }}>
                            <label className="form-label">✏️ Text</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input className="input" value={flyer.headline}
                                    onChange={e => setFlyer(f => ({ ...f, headline: e.target.value }))}
                                    placeholder="Headline" style={{ fontWeight: 700 }} />
                                <input className="input" value={flyer.subheadline}
                                    onChange={e => setFlyer(f => ({ ...f, subheadline: e.target.value }))}
                                    placeholder="Subheadline (e.g. feat. DJ Name)" />
                                <input className="input" value={flyer.dateText}
                                    onChange={e => setFlyer(f => ({ ...f, dateText: e.target.value }))}
                                    placeholder="Date & Time" />
                                <input className="input" value={flyer.venueText}
                                    onChange={e => setFlyer(f => ({ ...f, venueText: e.target.value }))}
                                    placeholder="Venue, City" />
                                <input className="input" value={flyer.extraText}
                                    onChange={e => setFlyer(f => ({ ...f, extraText: e.target.value }))}
                                    placeholder="Extra info (tickets, age, etc.)" />
                            </div>
                        </div>

                        {/* Typography */}
                        <div className="card" style={{ padding: '16px' }}>
                            <label className="form-label">🔤 Typography & Layout</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label className="form-label" style={{ fontSize: '11px' }}>Headline Font</label>
                                    <select className="input" value={flyer.headlineFont}
                                        onChange={e => setFlyer(f => ({ ...f, headlineFont: e.target.value }))}>
                                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '11px' }}>Body Font</label>
                                    <select className="input" value={flyer.bodyFont}
                                        onChange={e => setFlyer(f => ({ ...f, bodyFont: e.target.value }))}>
                                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '11px' }}>Headline Color</label>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input type="color" value={flyer.headlineColor}
                                            onChange={e => setFlyer(f => ({ ...f, headlineColor: e.target.value }))}
                                            style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
                                        <input className="input" value={flyer.headlineColor}
                                            onChange={e => setFlyer(f => ({ ...f, headlineColor: e.target.value }))}
                                            style={{ fontSize: '12px' }} />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '11px' }}>Body Color</label>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input type="color" value={flyer.bodyColor}
                                            onChange={e => setFlyer(f => ({ ...f, bodyColor: e.target.value }))}
                                            style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
                                        <input className="input" value={flyer.bodyColor}
                                            onChange={e => setFlyer(f => ({ ...f, bodyColor: e.target.value }))}
                                            style={{ fontSize: '12px' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                                <div>
                                    <label className="form-label" style={{ fontSize: '11px' }}>Text Position</label>
                                    <select className="input" value={flyer.textPosition}
                                        onChange={e => setFlyer(f => ({ ...f, textPosition: e.target.value as 'top' | 'center' | 'bottom' }))}>
                                        <option value="top">Top</option>
                                        <option value="center">Center</option>
                                        <option value="bottom">Bottom</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '11px' }}>Text Align</label>
                                    <select className="input" value={flyer.textAlign}
                                        onChange={e => setFlyer(f => ({ ...f, textAlign: e.target.value as 'left' | 'center' | 'right' }))}>
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>Overlay Darkness ({flyer.overlayOpacity}%)</label>
                                <input type="range" min="0" max="80" value={flyer.overlayOpacity}
                                    onChange={e => setFlyer(f => ({ ...f, overlayOpacity: Number(e.target.value) }))}
                                    style={{ width: '100%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Saved Flyers */}
                {savedFlyers.length > 0 && (
                    <div style={{ marginTop: '40px' }}>
                        <h3 style={{ marginBottom: '16px' }}>💾 Saved Flyers</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {savedFlyers.map(f => {
                                const s = getStylePreset(f.style);
                                const bg = f.backgroundUrl || s?.background || FLYER_STYLES[0].background;
                                return (
                                    <div
                                        key={f.id}
                                        className="card"
                                        style={{
                                            padding: 0, overflow: 'hidden', cursor: 'pointer',
                                            border: editId === f.id ? '2px solid #a855f7' : undefined,
                                        }}
                                        onClick={() => loadFlyer(f)}
                                    >
                                        <div style={{
                                            height: '120px',
                                            background: bg.startsWith('http') ? `url(${bg}) center/cover` : bg,
                                            display: 'flex', alignItems: 'flex-end', padding: '10px',
                                        }}>
                                            <div style={{
                                                fontFamily: `'${f.headlineFont || 'Bebas Neue'}', sans-serif`,
                                                fontSize: '14px', fontWeight: 700,
                                                color: f.headlineColor || '#fff',
                                                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                                                lineHeight: 1.2,
                                            }}>
                                                {f.headline || 'Untitled'}
                                            </div>
                                        </div>
                                        <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {f.dateText || 'No date'}
                                            </span>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={e => { e.stopPropagation(); deleteFlyer(f.id); }}
                                                style={{ fontSize: '12px', padding: '2px 6px' }}
                                            >🗑</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile responsive override */}
            <style jsx>{`
                @media (max-width: 900px) {
                    main > div:first-child {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </>
    );
}
