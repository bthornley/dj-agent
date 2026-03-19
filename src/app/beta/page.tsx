'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Topbar from '@/components/Topbar';

export default function BetaSignupPage() {
    const { user, isLoaded } = useUser();
    const [role, setRole] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Safely retrieve beta status from public metadata, defaulting to false
    const hasBetaAccess = user?.publicMetadata?.beta === true;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Ensure the user is logged in before they can submit the form
        if (!user) {
            window.location.href = `/sign-up?redirect_url=${encodeURIComponent('/beta')}`;
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/beta/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, reason }),
            });

            if (!res.ok) {
                const data = await res.json();
                setErrorMsg(data.error || 'Failed to submit application.');
            } else {
                setSuccess(true);
                // Hard reload nicely syncs the UI and clerk JWT session
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (err) {
            setErrorMsg('An unexpected error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <>
            <Topbar />
            <main className="main-content fade-in" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ maxWidth: '600px', width: '100%' }}>
                    
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
                            color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px'
                        }}>
                            New Beta Program ✨
                        </div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>GigLift Voice AI Manager</h1>
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                            Run your music business with your voice. Apply below to get exclusive early access and help shape the future of GigLift.
                        </p>
                    </div>

                    <div style={{
                        background: 'var(--bg-card, #1c1c24)', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '40px', borderRadius: '16px', boxShadow: '0 0 40px rgba(168,85,247,0.05)'
                    }}>
                        {hasBetaAccess ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px', color: '#10b981' }}>You're Already In!</h2>
                                <p style={{ color: 'var(--text-muted)' }}>You have full access to all Voice API features. Tap the 🎙️ icon in your dashboard to start using your AI Manager!</p>
                            </div>
                        ) : success ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px', color: '#10b981' }}>Application Approved</h2>
                                <p style={{ color: 'var(--text-muted)' }}>Welcome to the Beta! We are refreshing your session...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {!user && (
                                    <div style={{ 
                                        padding: '16px', borderRadius: '12px', background: 'rgba(56,189,248,0.1)', 
                                        border: '1px solid rgba(56,189,248,0.3)', color: '#7dd3fc',
                                        fontSize: '0.95rem', marginBottom: '8px'
                                    }}>
                                        You'll be asked to create a free GigLift account before your application goes through.
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Name</label>
                                    <input 
                                        type="text" 
                                        value={user?.firstName || ''}
                                        disabled={!!user} // Automatically pull from clerk if logged in
                                        placeholder={user ? user.fullName || '' : 'Will be collected during secure signup'}
                                        style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', opacity: user ? 0.7 : 1 }} 
                                    />
                                </div>
                                
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Primary Role</label>
                                    <select 
                                        required 
                                        value={role} 
                                        onChange={(e) => setRole(e.target.value)}
                                        style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    >
                                        <option value="" disabled>Select your primary focus...</option>
                                        <option value="dj">DJ</option>
                                        <option value="producer">Producer / Studio Musician</option>
                                        <option value="instructor">Music Instructor</option>
                                        <option value="touring">Touring Artist / Band</option>
                                        <option value="agency">Booking Agency / Manager</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Why do you want Beta access?</label>
                                    <textarea 
                                        required 
                                        value={reason} 
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="How do you plan on utilizing the Voice AI Manager? (e.g. touring logistics, social media planning, contract review...)"
                                        style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minHeight: '120px' }} 
                                    />
                                </div>

                                {errorMsg && (
                                    <div style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '4px' }}>{errorMsg}</div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="btn btn-primary btn-lg" 
                                    style={{ width: '100%', marginTop: '12px' }}
                                >
                                    {loading ? 'Submitting...' : user ? 'Submit Beta Application' : 'Continue to Signup'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
