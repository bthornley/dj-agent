'use client';

import { useState, useEffect, useCallback } from 'react';

export type AppMode = 'performer' | 'teacher';

export interface AppModeState {
    activeMode: AppMode | null;
    setActiveMode: (mode: AppMode) => void;
    isTeacher: boolean;
    modeLoaded: boolean;
    // Styling helpers
    accentColor: string;
    accentGlow: string;
    headerStyle: React.CSSProperties | undefined;
    logoFilter: string;
}

export function useAppMode(): AppModeState {
    const [activeMode, setActiveMode] = useState<AppMode | null>(null);
    const [modeLoaded, setModeLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/profile/mode')
            .then(r => r.json())
            .then(data => {
                const mode = (data.mode as AppMode) || 'performer';
                setActiveMode(mode);
                setModeLoaded(true);
            })
            .catch(() => {
                setActiveMode('performer');
                setModeLoaded(true);
            });
    }, []);

    const handleSetMode = useCallback((mode: AppMode) => {
        setActiveMode(mode);
    }, []);

    const isTeacher = activeMode === 'teacher';
    const accentColor = isTeacher ? '#38bdf8' : '#a855f7';
    const accentGlow = isTeacher ? 'rgba(56,189,248,0.4)' : 'rgba(168,85,247,0.4)';

    const headerStyle: React.CSSProperties | undefined = isTeacher ? {
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        background: 'linear-gradient(135deg, rgba(15,15,35,0.98), rgba(10,30,50,0.98))',
    } : undefined;

    const logoFilter = `drop-shadow(0 0 6px ${accentGlow})`;

    return {
        activeMode,
        setActiveMode: handleSetMode,
        isTeacher,
        modeLoaded,
        accentColor,
        accentGlow,
        headerStyle,
        logoFilter,
    };
}
