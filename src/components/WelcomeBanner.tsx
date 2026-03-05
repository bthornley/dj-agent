'use client';

import React from 'react';
import Link from 'next/link';

export default function WelcomeBanner() {
    return (
        <div className="slide-up" style={{
            padding: '24px 28px',
            borderRadius: '16px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(34,211,238,0.08))',
            border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap' as const,
        }}>
            <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                    👋 Welcome to GigLift!
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    Set up your profile in 30 seconds to start finding leads.
                </p>
            </div>
            <Link href="/onboarding" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                🚀 Get Started
            </Link>
        </div>
    );
}
