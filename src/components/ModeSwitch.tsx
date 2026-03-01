'use client';

import { useState, useEffect } from 'react';

export type AppMode = 'performer' | 'teacher';

interface ModeSwitchProps {
    onChange?: (mode: AppMode) => void;
}

export default function ModeSwitch({ onChange }: ModeSwitchProps) {
    const [mode, setMode] = useState<AppMode>('performer');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/profile/mode')
            .then(r => r.json())
            .then(data => {
                const loaded = data.mode || 'performer';
                setMode(loaded);
                onChange?.(loaded);
                setLoading(false);
            })
            .catch(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = async () => {
        const next: AppMode = mode === 'performer' ? 'teacher' : 'performer';
        setMode(next);
        onChange?.(next);
        try {
            await fetch('/api/profile/mode', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: next }),
            });
        } catch {
            // Revert on error
            setMode(mode);
        }
    };

    if (loading) return null;

    return (
        <button
            onClick={toggle}
            title={`Switch to ${mode === 'performer' ? 'Teacher' : 'Performer'} mode`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: mode === 'teacher' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)',
                background: mode === 'teacher'
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(34, 211, 238, 0.08))'
                    : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(139, 92, 246, 0.08))',
                color: mode === 'teacher' ? '#38bdf8' : '#a855f7',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{ fontSize: '14px' }}>{mode === 'teacher' ? '📚' : '🎵'}</span>
            {mode === 'teacher' ? 'Teacher' : 'Performer'}
        </button>
    );
}
