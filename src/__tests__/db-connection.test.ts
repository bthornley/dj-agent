import { describe, it, expect } from 'vitest';
import { clampPageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/db/connection';

describe('clampPageSize', () => {
    it('returns default when no limit provided', () => {
        expect(clampPageSize()).toBe(DEFAULT_PAGE_SIZE);
        expect(clampPageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    });

    it('returns default for zero or negative', () => {
        expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
        expect(clampPageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
    });

    it('returns the limit when within bounds', () => {
        expect(clampPageSize(50)).toBe(50);
        expect(clampPageSize(1)).toBe(1);
        expect(clampPageSize(MAX_PAGE_SIZE)).toBe(MAX_PAGE_SIZE);
    });

    it('clamps to MAX_PAGE_SIZE when exceeded', () => {
        expect(clampPageSize(MAX_PAGE_SIZE + 1)).toBe(MAX_PAGE_SIZE);
        expect(clampPageSize(999999)).toBe(MAX_PAGE_SIZE);
    });
});

describe('pagination constants', () => {
    it('DEFAULT_PAGE_SIZE is 200', () => {
        expect(DEFAULT_PAGE_SIZE).toBe(200);
    });

    it('MAX_PAGE_SIZE is 1000', () => {
        expect(MAX_PAGE_SIZE).toBe(1000);
    });

    it('DEFAULT < MAX', () => {
        expect(DEFAULT_PAGE_SIZE).toBeLessThan(MAX_PAGE_SIZE);
    });
});
