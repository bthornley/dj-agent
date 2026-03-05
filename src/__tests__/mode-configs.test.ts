import { describe, it, expect } from 'vitest';

// Test MODE_CONFIGS directly (not the hook, which requires React)
// Import the raw config object
import { MODE_CONFIGS } from '@/hooks/useAppMode';

describe('MODE_CONFIGS', () => {
    const modes = ['performer', 'instructor', 'studio', 'touring'] as const;

    it('has all 4 modes', () => {
        expect(Object.keys(MODE_CONFIGS)).toHaveLength(4);
        for (const mode of modes) {
            expect(MODE_CONFIGS).toHaveProperty(mode);
        }
    });

    it('each mode has required fields', () => {
        for (const mode of modes) {
            const cfg = MODE_CONFIGS[mode];
            expect(cfg.key).toBe(mode);
            expect(cfg.label).toBeTruthy();
            expect(cfg.icon).toBeTruthy();
            expect(cfg.color).toMatch(/^#[0-9a-f]{6}$/i);
            expect(cfg.glow).toContain('rgba');
            expect(cfg.borderColor).toContain('rgba');
            expect(cfg.gradientBg).toContain('linear-gradient');
        }
    });

    it('performer mode is the default (no custom header)', () => {
        expect(MODE_CONFIGS.performer.headerBg).toBe('');
        expect(MODE_CONFIGS.performer.headerBorder).toBe('');
    });

    it('non-performer modes have custom header styles', () => {
        for (const mode of ['instructor', 'studio', 'touring'] as const) {
            expect(MODE_CONFIGS[mode].headerBg).toContain('linear-gradient');
            expect(MODE_CONFIGS[mode].headerBorder).toContain('solid');
        }
    });

    it('each mode has a unique color', () => {
        const colors = modes.map(m => MODE_CONFIGS[m].color);
        expect(new Set(colors).size).toBe(4);
    });
});
