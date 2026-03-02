'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export type AppMode = 'performer' | 'instructor' | 'studio' | 'touring';

export interface ModeConfig {
    key: AppMode;
    label: string;
    icon: string;
    color: string;
    glow: string;
    borderColor: string;
    gradientBg: string;
    headerBg: string;
    headerBorder: string;
}

const MODE_CONFIGS: Record<AppMode, ModeConfig> = {
    performer: {
        key: 'performer',
        label: 'Performer',
        icon: '🎵',
        color: '#a855f7',
        glow: 'rgba(168,85,247,0.4)',
        borderColor: 'rgba(168,85,247,0.3)',
        gradientBg: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.06), rgba(15,15,35,0.95))',
        headerBg: '',
        headerBorder: '',
    },
    instructor: {
        key: 'instructor',
        label: 'Instructor',
        icon: '📚',
        color: '#38bdf8',
        glow: 'rgba(56,189,248,0.4)',
        borderColor: 'rgba(56,189,248,0.3)',
        gradientBg: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(34,211,238,0.06), rgba(15,15,35,0.95))',
        headerBg: 'linear-gradient(135deg, rgba(15,15,35,0.98), rgba(10,30,50,0.98))',
        headerBorder: '1px solid rgba(56,189,248,0.2)',
    },
    studio: {
        key: 'studio',
        label: 'Studio',
        icon: '🎙️',
        color: '#f97316',
        glow: 'rgba(249,115,22,0.4)',
        borderColor: 'rgba(249,115,22,0.3)',
        gradientBg: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06), rgba(15,15,35,0.95))',
        headerBg: 'linear-gradient(135deg, rgba(15,15,35,0.98), rgba(30,20,10,0.98))',
        headerBorder: '1px solid rgba(249,115,22,0.2)',
    },
    touring: {
        key: 'touring',
        label: 'Touring',
        icon: '🚐',
        color: '#10b981',
        glow: 'rgba(16,185,129,0.4)',
        borderColor: 'rgba(16,185,129,0.3)',
        gradientBg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06), rgba(15,15,35,0.95))',
        headerBg: 'linear-gradient(135deg, rgba(15,15,35,0.98), rgba(10,30,20,0.98))',
        headerBorder: '1px solid rgba(16,185,129,0.2)',
    },
};

export interface AppModeState {
    activeMode: AppMode | null;
    setActiveMode: (mode: AppMode) => void;
    isInstructor: boolean;
    modeLoaded: boolean;
    modeConfig: ModeConfig;
    allModes: ModeConfig[];
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

    const cfg = MODE_CONFIGS[activeMode || 'performer'];
    const isInstructor = activeMode === 'instructor';

    const headerStyle: React.CSSProperties | undefined = useMemo(() => {
        if (!cfg.headerBg) return undefined;
        return { borderBottom: cfg.headerBorder, background: cfg.headerBg };
    }, [cfg]);

    const allModes = useMemo(() => Object.values(MODE_CONFIGS), []);

    return {
        activeMode,
        setActiveMode: handleSetMode,
        isInstructor,
        modeLoaded,
        modeConfig: cfg,
        allModes,
        accentColor: cfg.color,
        accentGlow: cfg.glow,
        headerStyle,
        logoFilter: `drop-shadow(0 0 6px ${cfg.glow})`,
    };
}

export { MODE_CONFIGS };
