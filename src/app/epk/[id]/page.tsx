'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EPKData {
    brand: {
        djName: string;
        tagline: string;
        bio: string;
        vibeWords: string[];
        locations: string[];
        typicalVenues: string[];
        brandColors: string[];
        emojis: string[];
        connectedAccounts: { platform: string; handle: string }[];
    };
    events: {
        id: string;
        eventType: string;
        venueName: string;
        clientName: string;
        date: string;
        status: string;
    }[];
    media: {
        id: string;
        url: string;
        thumbnailUrl: string;
        mediaType: string;
        fileName: string;
    }[];
    stats: {
        totalEvents: number;
        totalPosts: number;
    };
    config: {
        theme: 'dark' | 'light' | 'gradient';
        accentColor: string;
        sectionOrder: string[];
        hiddenSections: string[];
        customSections: { id: string; title: string; body: string }[];
    } | null;
}

export default function EPKPage({ params }: { params: Promise<{ id: string }> }) {
    const [data, setData] = useState<EPKData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userId, setUserId] = useState('');

    useEffect(() => {
        params.then(p => {
            setUserId(p.id);
            fetch(`/api/epk/${p.id}`)
                .then(r => r.json())
                .then(d => {
                    if (d.error) {
                        setError(d.error);
                    } else {
                        setData(d);
                    }
                    setLoading(false);
                })
                .catch(() => {
                    setError('Failed to load EPK');
                    setLoading(false);
                });
        });
    }, [params]);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%)',
                color: '#fff',
            }}>
                <div className="spinner" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '16px',
                background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%)',
                color: '#fff',
            }}>
                <div style={{ fontSize: '48px' }}>🎵</div>
                <h1 style={{ fontSize: '24px' }}>EPK Not Found</h1>
                <p style={{ color: '#999' }}>This electronic press kit doesn&apos;t exist or hasn&apos;t been set up yet.</p>
                <Link href="/" style={{ color: '#a855f7' }}>← Go to GigLift</Link>
            </div>
        );
    }

    const { brand, events, media, stats, config: epkConfig } = data;
    const accentColor = epkConfig?.accentColor || brand.brandColors?.[0] || '#a855f7';
    const theme = epkConfig?.theme || 'dark';
    const images = media.filter(m => m.mediaType === 'image');
    const videos = media.filter(m => m.mediaType === 'video');
    const upcomingEvents = events.filter(e => e.status === 'confirmed');
    const pastEvents = events.filter(e => e.status === 'completed');
    const hiddenSections = new Set(epkConfig?.hiddenSections || []);
    const sectionOrder = epkConfig?.sectionOrder || ['socials', 'stats', 'gallery', 'videos', 'venues', 'upcoming', 'past', 'custom'];
    const customSections = epkConfig?.customSections || [];

    const bgStyle = theme === 'light'
        ? 'linear-gradient(135deg, #f0f0f4 0%, #e8e8f0 100%)'
        : theme === 'gradient'
            ? 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)'
            : 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%)';
    const textColor = theme === 'light' ? '#1a1a2e' : '#fff';
    const mutedColor = theme === 'light' ? '#666' : '#b0b0cc';
    const cardBg = theme === 'light' ? '#ffffff15' : '#ffffff06';
    const cardBorder = theme === 'light' ? '#00000010' : '#ffffff10';

    const socialIcons: Record<string, string> = {
        instagram: '📸', facebook: '📘', tiktok: '🎵', youtube: '🎬',
        twitter: '🐦', soundcloud: '🔊', spotify: '🎧', mixcloud: '☁️',
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: bgStyle,
            color: textColor,
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            {/* Hero */}
            <section style={{
                textAlign: 'center', padding: '80px 24px 48px',
                background: `linear-gradient(180deg, transparent 0%, ${accentColor}11 50%, transparent 100%)`,
            }}>
                <div style={{
                    display: 'inline-block', padding: '6px 16px', borderRadius: '20px',
                    background: `${accentColor}22`, border: `1px solid ${accentColor}44`,
                    fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px',
                    color: accentColor, marginBottom: '20px',
                }}>
                    Electronic Press Kit
                </div>
                <h1 style={{
                    fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800,
                    margin: '0 0 12px', lineHeight: 1.1,
                    background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    {brand.djName}
                </h1>
                {brand.tagline && (
                    <p style={{
                        fontSize: '18px', color: mutedColor, fontStyle: 'italic',
                        maxWidth: '500px', margin: '0 auto 16px',
                    }}>
                        {brand.tagline}
                    </p>
                )}
                {brand.bio && (
                    <p style={{
                        fontSize: '17px', lineHeight: 1.6, color: mutedColor,
                        maxWidth: '600px', margin: '0 auto 24px',
                    }}>
                        {brand.bio}
                    </p>
                )}
                {brand.vibeWords.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {brand.vibeWords.map((word, i) => (
                            <span key={i} style={{
                                padding: '4px 14px', borderRadius: '16px',
                                background: '#ffffff10', border: '1px solid #ffffff15',
                                fontSize: '13px', color: '#ccc',
                            }}>
                                {word}
                            </span>
                        ))}
                    </div>
                )}
                {brand.locations.length > 0 && (
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '16px' }}>
                        📍 {brand.locations.join(' · ')}
                    </p>
                )}
            </section>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 60px' }}>

                {/* Social Links */}
                {brand.connectedAccounts.length > 0 && (
                    <section style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {brand.connectedAccounts.map((acc, i) => (
                                <a key={i}
                                    href={acc.handle.startsWith('http') ? acc.handle : `https://${acc.platform}.com/${acc.handle.replace('@', '')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', borderRadius: '10px',
                                        background: '#ffffff08', border: '1px solid #ffffff12',
                                        color: '#ccc', fontSize: '13px', textDecoration: 'none',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={e => (e.currentTarget.style.background = '#ffffff15')}
                                    onMouseOut={e => (e.currentTarget.style.background = '#ffffff08')}
                                >
                                    <span>{socialIcons[acc.platform] || '🔗'}</span>
                                    <span>{acc.handle || acc.platform}</span>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Stats */}
                {(stats.totalEvents > 0 || brand.typicalVenues.length > 0) && (
                    <section style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '16px', marginBottom: '48px',
                    }}>
                        {stats.totalEvents > 0 && (
                            <div style={{
                                textAlign: 'center', padding: '20px', borderRadius: '12px',
                                background: '#ffffff06', border: '1px solid #ffffff10',
                            }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: accentColor }}>{stats.totalEvents}</div>
                                <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Events</div>
                            </div>
                        )}
                        {brand.typicalVenues.length > 0 && (
                            <div style={{
                                textAlign: 'center', padding: '20px', borderRadius: '12px',
                                background: '#ffffff06', border: '1px solid #ffffff10',
                            }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: accentColor }}>{brand.typicalVenues.length}</div>
                                <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Venues</div>
                            </div>
                        )}
                        {brand.locations.length > 0 && (
                            <div style={{
                                textAlign: 'center', padding: '20px', borderRadius: '12px',
                                background: '#ffffff06', border: '1px solid #ffffff10',
                            }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: accentColor }}>{brand.locations.length}</div>
                                <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Regions</div>
                            </div>
                        )}
                    </section>
                )}

                {/* Photo Gallery */}
                {images.length > 0 && (
                    <section style={{ marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#eee' }}>
                            📸 Gallery
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '12px',
                        }}>
                            {images.map((img, i) => (
                                <div key={i} style={{
                                    borderRadius: '10px', overflow: 'hidden',
                                    aspectRatio: '1', border: '1px solid #ffffff10',
                                }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.url} alt={img.fileName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Videos */}
                {videos.length > 0 && (
                    <section style={{ marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#eee' }}>
                            🎬 Videos
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {videos.map((vid, i) => (
                                <video key={i} src={vid.url} controls preload="metadata"
                                    style={{
                                        width: '100%', borderRadius: '10px',
                                        border: '1px solid #ffffff10',
                                    }} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Venues */}
                {brand.typicalVenues.length > 0 && (
                    <section style={{ marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#eee' }}>
                            🏢 Notable Venues
                        </h2>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {brand.typicalVenues.map((venue, i) => (
                                <span key={i} style={{
                                    padding: '8px 18px', borderRadius: '10px',
                                    background: '#ffffff08', border: '1px solid #ffffff12',
                                    fontSize: '14px', color: '#ccc',
                                }}>
                                    {venue}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                    <section style={{ marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#eee' }}>
                            📅 Upcoming Events
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {upcomingEvents.map(evt => (
                                <div key={evt.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '14px 18px', borderRadius: '10px',
                                    background: '#ffffff06', border: '1px solid #ffffff10',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{evt.venueName || evt.eventType}</div>
                                        {evt.clientName && <div style={{ fontSize: '13px', color: '#888' }}>{evt.clientName}</div>}
                                    </div>
                                    <div style={{ fontSize: '13px', color: accentColor }}>{evt.date}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Past Events */}
                {pastEvents.length > 0 && (
                    <section style={{ marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#eee' }}>
                            ✅ Past Events
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {pastEvents.map(evt => (
                                <div key={evt.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 18px', borderRadius: '10px',
                                    background: '#ffffff04', border: '1px solid #ffffff08',
                                }}>
                                    <span style={{ fontSize: '14px', color: '#aaa' }}>{evt.venueName || evt.eventType}</span>
                                    <span style={{ fontSize: '13px', color: '#666' }}>{evt.date}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <footer style={{
                    textAlign: 'center', padding: '32px 0', borderTop: '1px solid #ffffff10',
                    color: '#555', fontSize: '13px',
                }}>
                    <p>Electronic Press Kit — {brand.djName}</p>
                    <p style={{ marginTop: '4px' }}>
                        Powered by <a href="/" style={{ color: accentColor, textDecoration: 'none' }}>GigLift</a>
                    </p>
                </footer>
            </div>
        </div>
    );
}
