// ============================================================
// Security Utilities
// ============================================================

import { NextResponse } from 'next/server';

/**
 * Validate and sanitize a URL before server-side fetching.
 * Blocks SSRF: private IPs, non-HTTP schemes, localhost.
 */
export function validateExternalUrl(url: string): { valid: boolean; error?: string } {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: `Blocked scheme: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '::1' || hostname === '0.0.0.0') {
        return { valid: false, error: 'Internal addresses are not allowed' };
    }

    // Block private/reserved IPv4 ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
        const [, a, b] = ipv4Match.map(Number);
        if (
            a === 10 ||                           // 10.0.0.0/8
            a === 127 ||                           // 127.0.0.0/8 (loopback)
            (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
            (a === 192 && b === 168) ||            // 192.168.0.0/16
            (a === 169 && b === 254) ||            // 169.254.0.0/16 (link-local / cloud metadata)
            a === 0                                // 0.0.0.0/8
        ) {
            return { valid: false, error: 'Internal addresses are not allowed' };
        }
    }

    // Block IPv6 private/link-local (anything in brackets)
    if (hostname.startsWith('[')) {
        return { valid: false, error: 'IPv6 addresses are not allowed' };
    }

    // Block common cloud metadata endpoints
    if (hostname === 'metadata.google.internal' || hostname.endsWith('.internal')) {
        return { valid: false, error: 'Internal addresses are not allowed' };
    }

    return { valid: true };
}

/**
 * Escape LIKE wildcard characters in user search input.
 */
export function escapeLikeQuery(query: string): string {
    return query
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
}

/**
 * Sanitize error for client response — never expose internals.
 */
export function safeErrorResponse(message: string, status: number = 500): NextResponse {
    return NextResponse.json({ error: message }, { status });
}

/**
 * Pick only allowed keys from an object (mass-assignment protection).
 */
export function pickFields<T extends Record<string, unknown>>(
    obj: T,
    allowedKeys: string[]
): Partial<T> {
    const result: Partial<T> = {};
    for (const key of allowedKeys) {
        if (key in obj) {
            (result as Record<string, unknown>)[key] = obj[key];
        }
    }
    return result;
}
