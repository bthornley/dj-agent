'use client';

import { useState } from 'react';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function AmbassadorApplyPage() {
    const { user, isLoaded } = useUser();
    const [form, setForm] = useState({
        artistName: '',
        role: 'performer',
        city: '',
        instagram: '',
        tiktok: '',
        youtube: '',
        twitter: '',
        spotify: '',
        website: '',
        whyAmbassador: '',
        monthlyGigs: '',
        communityDescription: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    function update(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.artistName || !form.city || !form.whyAmbassador) {
            setError('Please fill in all required fields.');
            return;
        }
        if (!form.instagram && !form.tiktok && !form.youtube && !form.twitter) {
            setError('Please provide at least one social media link.');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/ambassador/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                setSubmitting(false);
                return;
            }
            setSubmitted(true);
        } catch {
            setError('Network error — please try again');
        }
        setSubmitting(false);
    }

    if (submitted) {
        return (
            <>
            <Topbar />
                <main className="main-content fade-in" style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
                    <div style={{ textAlign: 'center', maxWidth: '500px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌟</div>
                        <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>Application Received!</h2>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
                            Thanks for applying to the GigLift Brand Ambassador Program. We&apos;ll review your application
                            and get back to you within 48 hours.
                        </p>
                        <Link href="/dashboard" className="btn btn-primary">← Back to Dashboard</Link>
                    </div>
                </main>
            </>
        );
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 16px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
        color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '13px', fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: '6px',
    };

    return (
        <>
            <Topbar />

            <main className="main-content fade-in" style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
                <div style={{ maxWidth: '600px', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h1 style={{
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            fontSize: '32px', fontWeight: 800, marginBottom: '8px',
                        }}>
                            🌟 Ambassador Application
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>
                            Get a free Pro account, early access to features, and showcase your work to our community.
                        </p>
                    </div>

                    {!isLoaded ? (
                        <div className="empty-state"><div className="spinner" /></div>
                    ) : !user ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>You need to sign in to apply.</p>
                            <Link href="/sign-in" className="btn btn-primary">Sign In</Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>🎵 About You</h3>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle}>Artist / Band Name *</label>
                                    <input style={inputStyle} value={form.artistName}
                                        onChange={e => update('artistName', e.target.value)}
                                        placeholder="Your performing name" />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Role *</label>
                                        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.role}
                                            onChange={e => update('role', e.target.value)}>
                                            <option value="performer">🎵 Performer / DJ</option>
                                            <option value="instructor">📚 Music Instructor</option>
                                            <option value="studio">🎙️ Studio Musician</option>
                                            <option value="touring">🚐 Touring Artist</option>
                                            <option value="other">🎸 Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>City *</label>
                                        <input style={inputStyle} value={form.city}
                                            onChange={e => update('city', e.target.value)}
                                            placeholder="e.g. Austin, TX" />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle}>Monthly Gigs / Lessons</label>
                                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.monthlyGigs}
                                        onChange={e => update('monthlyGigs', e.target.value)}>
                                        <option value="">Select...</option>
                                        <option value="1-2">1–2 per month</option>
                                        <option value="3-5">3–5 per month</option>
                                        <option value="6-10">6–10 per month</option>
                                        <option value="10+">10+ per month</option>
                                    </select>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '16px' }}>📱 Social Media</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>Provide at least one link</p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Instagram</label>
                                        <input style={inputStyle} value={form.instagram}
                                            onChange={e => update('instagram', e.target.value)}
                                            placeholder="@handle or URL" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>TikTok</label>
                                        <input style={inputStyle} value={form.tiktok}
                                            onChange={e => update('tiktok', e.target.value)}
                                            placeholder="@handle or URL" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>YouTube</label>
                                        <input style={inputStyle} value={form.youtube}
                                            onChange={e => update('youtube', e.target.value)}
                                            placeholder="Channel URL" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Twitter / X</label>
                                        <input style={inputStyle} value={form.twitter}
                                            onChange={e => update('twitter', e.target.value)}
                                            placeholder="@handle or URL" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Spotify</label>
                                        <input style={inputStyle} value={form.spotify}
                                            onChange={e => update('spotify', e.target.value)}
                                            placeholder="Artist URL" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Website</label>
                                        <input style={inputStyle} value={form.website}
                                            onChange={e => update('website', e.target.value)}
                                            placeholder="https://..." />
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>✍️ Tell Us More</h3>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle}>Why would you be a great ambassador? *</label>
                                    <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                                        value={form.whyAmbassador}
                                        onChange={e => update('whyAmbassador', e.target.value)}
                                        placeholder="Tell us about your involvement in the music community, what makes you passionate about helping other musicians, etc." />
                                </div>

                                <div>
                                    <label style={labelStyle}>Describe your community (optional)</label>
                                    <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                                        value={form.communityDescription}
                                        onChange={e => update('communityDescription', e.target.value)}
                                        placeholder="e.g. I run a 500-member DJ community in Austin, organize monthly open mic nights..." />
                                </div>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#ef4444', fontSize: '13px',
                                }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="btn btn-xl" disabled={submitting} style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: '#1a1a2e', fontWeight: 700,
                                boxShadow: '0 0 24px rgba(240,199,85,0.2)',
                                opacity: submitting ? 0.7 : 1,
                            }}>
                                {submitting ? '⏳ Submitting...' : '🌟 Submit Application'}
                            </button>

                            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                                Applications reviewed within 48 hours · No minimum follower count required
                            </p>
                        </form>
                    )}
                </div>
            </main>
        </>
    );
}
