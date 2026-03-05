'use client';

import React from 'react';

interface StatCardProps {
    value: string | number;
    label: string;
    accentColor?: string;
    borderColor?: string;
    /** Optional progress bar (0-1) */
    progress?: number;
    progressColor?: string;
}

export default function StatCard({
    value,
    label,
    accentColor = 'var(--accent-purple)',
    borderColor,
    progress,
    progressColor,
}: StatCardProps) {
    const border = borderColor || `${accentColor}26`;
    return (
        <div style={{
            padding: '14px 16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${border}`,
        }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: accentColor }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </div>
            {progress !== undefined && (
                <div style={{ marginTop: '6px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{
                        height: '100%', borderRadius: '2px',
                        width: `${Math.min(100, progress * 100)}%`,
                        background: progressColor || accentColor,
                        transition: 'width 0.5s ease',
                    }} />
                </div>
            )}
        </div>
    );
}
