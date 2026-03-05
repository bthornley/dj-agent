'use client';

import React from 'react';
import { ModeConfig, AppMode } from '@/hooks/useAppMode';

interface ModeCardProps {
    mode: AppMode;
    config: ModeConfig;
    active: boolean;
    bullets: string[];
}

export default function ModeCard({ mode, config, active, bullets }: ModeCardProps) {
    return (
        <div style={{
            padding: '16px', borderRadius: '14px',
            background: active ? `linear-gradient(135deg, ${config.color}1a, ${config.color}0d)` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${active ? config.borderColor : 'rgba(255,255,255,0.06)'}`,
            opacity: active ? 1 : 0.5,
            transition: 'all 0.3s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>{config.icon}</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: active ? config.color : 'var(--text-muted)' }}>
                        {config.label} Mode
                    </h3>
                    {active && <span className="badge badge-confirmed" style={{ fontSize: '9px', background: `${config.color}22`, color: config.color, borderColor: config.borderColor }}>ACTIVE</span>}
                </div>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                {bullets.map(b => <li key={b}>{b}</li>)}
            </ul>
        </div>
    );
}
