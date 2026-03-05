import { describe, it, expect } from 'vitest';
import { validateExternalUrl, escapeLikeQuery, pickFields } from '@/lib/security';

describe('validateExternalUrl', () => {
    it('accepts valid HTTPS URLs', () => {
        expect(validateExternalUrl('https://example.com')).toEqual({ valid: true });
        expect(validateExternalUrl('https://bandsintown.com/artists')).toEqual({ valid: true });
    });

    it('accepts valid HTTP URLs', () => {
        expect(validateExternalUrl('http://example.com/page')).toEqual({ valid: true });
    });

    it('rejects invalid URL formats', () => {
        const result = validateExternalUrl('not-a-url');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid URL');
    });

    it('blocks non-HTTP schemes', () => {
        expect(validateExternalUrl('ftp://example.com').valid).toBe(false);
        expect(validateExternalUrl('file:///etc/passwd').valid).toBe(false);
        expect(validateExternalUrl('javascript:alert(1)').valid).toBe(false);
    });

    it('blocks localhost', () => {
        expect(validateExternalUrl('http://localhost/admin').valid).toBe(false);
        expect(validateExternalUrl('http://0.0.0.0').valid).toBe(false);
        expect(validateExternalUrl('http://[::1]').valid).toBe(false);
    });

    it('blocks private IPv4 ranges (SSRF protection)', () => {
        expect(validateExternalUrl('http://10.0.0.1').valid).toBe(false);
        expect(validateExternalUrl('http://172.16.0.1').valid).toBe(false);
        expect(validateExternalUrl('http://192.168.1.1').valid).toBe(false);
        expect(validateExternalUrl('http://127.0.0.1').valid).toBe(false);
    });

    it('blocks cloud metadata endpoints', () => {
        expect(validateExternalUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
        expect(validateExternalUrl('http://metadata.google.internal').valid).toBe(false);
    });

    it('allows public IPs', () => {
        expect(validateExternalUrl('http://8.8.8.8').valid).toBe(true);
        expect(validateExternalUrl('https://93.184.216.34').valid).toBe(true);
    });
});

describe('escapeLikeQuery', () => {
    it('escapes percent signs', () => {
        expect(escapeLikeQuery('100%')).toBe('100\\%');
    });

    it('escapes underscores', () => {
        expect(escapeLikeQuery('test_user')).toBe('test\\_user');
    });

    it('escapes backslashes', () => {
        expect(escapeLikeQuery('path\\file')).toBe('path\\\\file');
    });

    it('handles combined special characters', () => {
        expect(escapeLikeQuery('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
    });

    it('returns normal strings unchanged', () => {
        expect(escapeLikeQuery('hello world')).toBe('hello world');
    });
});

describe('pickFields', () => {
    it('picks only allowed keys', () => {
        const obj = { name: 'Blake', email: 'b@test.com', role: 'admin', secret: 'xyz' };
        const result = pickFields(obj, ['name', 'email']);
        expect(result).toEqual({ name: 'Blake', email: 'b@test.com' });
        expect(result).not.toHaveProperty('role');
        expect(result).not.toHaveProperty('secret');
    });

    it('ignores keys not present in object', () => {
        const obj = { name: 'Blake' };
        const result = pickFields(obj, ['name', 'nonexistent']);
        expect(result).toEqual({ name: 'Blake' });
    });

    it('returns empty object for no matching keys', () => {
        const obj = { a: 1, b: 2 };
        const result = pickFields(obj, ['x', 'y']);
        expect(result).toEqual({});
    });
});
