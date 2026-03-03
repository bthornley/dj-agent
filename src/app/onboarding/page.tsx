'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { useToast } from '@/components/ToastProvider';
import { v4 as uuid } from 'uuid';

type AppMode = 'performer' | 'instructor' | 'studio' | 'touring';

const MODE_OPTIONS: { value: AppMode; icon: string; label: string; desc: string }[] = [
    { value: 'performer', icon: '🎵', label: 'Performer', desc: 'Find venues, clubs, and gig opportunities' },
    { value: 'instructor', icon: '📚', label: 'Instructor', desc: 'Find music schools and instruction positions' },
    { value: 'studio', icon: '🎙️', label: 'Studio', desc: 'Find recording studios and session work' },
    { value: 'touring', icon: '🚐', label: 'Touring', desc: 'Find tour opportunities and festivals' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = useState(1);
    const [djName, setDjName] = useState('');
    const [bio, setBio] = useState('');
    const [mode, setMode] = useState<AppMode>('performer');
    const [region, setRegion] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleFinish() {
        if (!djName.trim() || !region.trim()) return;
        setSaving(true);

        try {
            // Save brand profile
            await fetch('/api/social/brand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: uuid(),
                    djName: djName.trim(),
                    bio: bio.trim(),
                    voiceExamples: ['', '', '', '', ''],
                    vibeWords: [],
                    emojis: [],
                    avoidTopics: [],
                    profanityLevel: 'mild',
                    politicsAllowed: false,
                    locations: [region.trim()],
                    typicalVenues: [],
                    brandColors: ['#8b5cf6', '#22d3ee'],
                    connectedAccounts: [],
                }),
            });

            // Create first seed from region
            await fetch('/api/leads/seeds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: uuid(),
                    region: region.trim(),
                    keywords: getDefaultKeywords(mode),
                    source: 'google_maps',
                    active: true,
                    mode,
                    created_at: new Date().toISOString(),
                }),
            });

            // Save mode preference
            if (typeof window !== 'undefined') {
                localStorage.setItem('giglift-mode', mode);
            }

            toast('🎉 You\'re all set! Welcome to GigLift', 'success');
            router.push('/dashboard');
        } catch (err) {
            console.error('Onboarding error:', err);
            toast('Something went wrong — try again', 'error');
        } finally {
            setSaving(false);
        }
    }

    function getDefaultKeywords(m: AppMode): string[] {
        switch (m) {
            case 'performer': return ['nightclub', 'lounge', 'live music venue', 'bar with DJ', 'event space'];
            case 'instructor': return ['music school', 'music academy', 'music lessons', 'after school program'];
            case 'studio': return ['recording studio', 'music production', 'mixing studio', 'mastering'];
            case 'touring': return ['concert venue', 'booking agent', 'music festival', 'promoter'];
        }
    }

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.4))' }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav">
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in" style={{ maxWidth: '640px', margin: '0 auto' }}>
                {/* Progress bar */}
                <div style={{
                    display: 'flex', gap: '8px', marginBottom: '32px',
                }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, height: '4px', borderRadius: '2px',
                            background: s <= step ? 'var(--accent-purple, #8b5cf6)' : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s ease',
                        }} />
                    ))}
                </div>

                {/* Step 1: Identity */}
                {step === 1 && (
                    <div className="slide-up">
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎧</div>
                            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Welcome to GigLift</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                                Let&apos;s get you set up in 30 seconds.
                            </p>
                        </div>

                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>What should we call you?</h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="form-label">Artist / DJ Name</label>
                                <input
                                    className="input"
                                    value={djName}
                                    onChange={e => setDjName(e.target.value)}
                                    placeholder="e.g. DJ Nova, The Groove Band"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="form-label">One-liner bio (optional)</label>
                                <input
                                    className="input"
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="e.g. Open-format DJ bringing the energy to SoCal"
                                />
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '14px' }}
                            disabled={!djName.trim()}
                            onClick={() => setStep(2)}
                        >
                            Continue →
                        </button>
                    </div>
                )}

                {/* Step 2: Mode & Region */}
                {step === 2 && (
                    <div className="slide-up">
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                                What are you looking for?
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                                Choose your primary mode and region. You can change these anytime.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            {MODE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className="card"
                                    onClick={() => setMode(opt.value)}
                                    style={{
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                        border: mode === opt.value ? '2px solid var(--accent-purple, #8b5cf6)' : '1px solid var(--glass-border)',
                                        background: mode === opt.value ? 'rgba(139,92,246,0.08)' : undefined,
                                        boxShadow: mode === opt.value ? '0 0 20px rgba(139,92,246,0.15)' : undefined,
                                    }}
                                >
                                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{opt.icon}</div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{opt.label}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="card" style={{ marginBottom: '20px' }}>
                            <label className="form-label">Your Region / City</label>
                            <input
                                className="input"
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                                placeholder="e.g. Orange County, Los Angeles, Miami"
                                autoFocus
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                We&apos;ll set up your first scan seed for this region.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, padding: '14px' }} onClick={() => setStep(1)}>
                                ← Back
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 2, padding: '14px' }}
                                disabled={!region.trim()}
                                onClick={() => setStep(3)}
                            >
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                    <div className="slide-up">
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚀</div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>You&apos;re ready to go!</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                                Here&apos;s what we&apos;ll set up for you:
                            </p>
                        </div>

                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '20px', width: '32px', textAlign: 'center' }}>🎧</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{djName}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{bio || 'No bio yet'}</div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '20px', width: '32px', textAlign: 'center' }}>
                                        {MODE_OPTIONS.find(m => m.value === mode)?.icon}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>
                                            {MODE_OPTIONS.find(m => m.value === mode)?.label} Mode
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {MODE_OPTIONS.find(m => m.value === mode)?.desc}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '20px', width: '32px', textAlign: 'center' }}>📍</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{region}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            First scan seed will be created for this region
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, padding: '14px' }} onClick={() => setStep(2)}>
                                ← Back
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 2, padding: '14px' }}
                                disabled={saving}
                                onClick={handleFinish}
                            >
                                {saving ? '⏳ Setting up...' : '🚀 Launch GigLift'}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
