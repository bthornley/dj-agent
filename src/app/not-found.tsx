import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Page Not Found — GigLift',
    description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a1a',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            textAlign: 'center',
            padding: '40px 20px',
        }}>
            <img
                src="/logo.png"
                alt="GigLift"
                style={{
                    width: 80, height: 80, borderRadius: 18, marginBottom: 24,
                    filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.4))',
                }}
            />
            <div style={{
                fontSize: 120, fontWeight: 900, lineHeight: 1,
                background: 'linear-gradient(135deg, #fff 0%, #a855f7 50%, #00d4e6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
            }}>
                404
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: '16px 0 8px', color: '#e0e0e8' }}>
                Page Not Found
            </h1>
            <p style={{ fontSize: 16, color: '#888', maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
                Let&apos;s get you back on track.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
                <Link
                    href="/"
                    style={{
                        background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
                        boxShadow: '0 0 30px rgba(168,85,247,0.3)',
                    }}
                >
                    Go Home
                </Link>
                <Link
                    href="/dashboard"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#ccc', fontSize: 16, fontWeight: 600,
                        padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
                    }}
                >
                    Dashboard
                </Link>
            </div>
            <div style={{ marginTop: 48, fontSize: 13, color: '#555' }}>
                GigLift — Lift your gigs to the next level
            </div>
        </div>
    );
}
