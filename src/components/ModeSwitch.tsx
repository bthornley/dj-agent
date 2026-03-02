'use client';

import { useState, useEffect, useRef } from 'react';
import { MODE_CONFIGS } from '@/hooks/useAppMode';

export type AppMode = 'performer' | 'instructor' | 'studio' | 'touring';

const MODES: AppMode[] = ['performer', 'instructor', 'studio', 'touring'];

interface ModeSwitchProps {
    onChange?: (mode: AppMode) => void;
}

export default function ModeSwitch({ onChange }: ModeSwitchProps) {
    const [mode, setMode] = useState<AppMode>('performer');
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/profile/mode')
            .then(r => r.json())
            .then(data => {
                const loaded = (data.mode as AppMode) || 'performer';
                setMode(loaded);
                onChange?.(loaded);
                setLoading(false);
            })
            .catch(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const select = async (next: AppMode) => {
        if (next === mode) { setOpen(false); return; }
        setMode(next);
        setOpen(false);
        onChange?.(next);
        try {
            await fetch('/api/profile/mode', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: next }),
            });
        } catch {
            setMode(mode);
        }
    };

    if (loading) return null;

    const cfg = MODE_CONFIGS[mode];

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                title="Switch mode"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: cfg.borderColor,
                    background: cfg.gradientBg,
                    color: cfg.color,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                }}
            >
                <span style={{ fontSize: '14px' }}>{cfg.icon}</span>
                {cfg.label}
                <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.6 }}>▾</span>
            </button>

            {open && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: '180px',
                    background: 'var(--md-surface-container, #1e1e2e)',
                    border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    padding: '6px',
                    zIndex: 200,
                    animation: 'fadeIn 0.15s ease-out',
                }}>
                    {MODES.map(m => {
                        const c = MODE_CONFIGS[m];
                        const active = m === mode;
                        return (
                            <button
                                key={m}
                                onClick={() => select(m)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: active ? `${c.color}18` : 'transparent',
                                    color: active ? c.color : 'var(--text-secondary, #b0b0c0)',
                                    fontSize: '13px',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => {
                                    if (!active) (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                }}
                                onMouseLeave={e => {
                                    if (!active) (e.target as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                <span style={{ fontSize: '16px' }}>{c.icon}</span>
                                <span>{c.label}</span>
                                {active && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
