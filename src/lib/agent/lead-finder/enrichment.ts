import { Lead, EntityType } from '../../types';
import { ENTITY_TYPE_KEYWORDS, MUSIC_FIT_KEYWORDS, EVENT_TYPE_INDICATORS } from './sources';
import { validateExternalUrl } from '../../security';

// ============================================================
// Lead Finder — Enrichment Module
// Fetches a URL, extracts contact info, event indicators,
// and classifies the venue. Only stores publicly listed info.
// ============================================================

export interface EnrichmentResult {
    emails: string[];
    phones: string[];
    contact_form_url: string;
    instagram_handle: string;
    facebook_page: string;
    contact_name: string;
    role: string;
    entity_type: EntityType;
    music_fit_tags: string[];
    event_types_seen: string[];
    capacity_estimate: number | null;
    raw_snippet: string;
    agent_trace: string;
}

/**
 * Fetch a URL and extract lead-relevant information from the page text.
 * Respects basic rate limiting (caller should manage timing).
 */
export async function enrichFromUrl(url: string): Promise<EnrichmentResult> {
    const trace: string[] = [`Fetching: ${url}`];
    let pageText = '';

    // SSRF protection: validate URL before fetching
    const urlCheck = validateExternalUrl(url);
    if (!urlCheck.valid) {
        trace.push(`Blocked: ${urlCheck.error}`);
        return emptyResult(trace);
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LeadFinder/1.0; +https://digitalduende.com)',
                'Accept': 'text/html,application/xhtml+xml',
            },
        });
        clearTimeout(timeout);

        if (!res.ok) {
            trace.push(`HTTP ${res.status}`);
            return emptyResult(trace);
        }

        pageText = await res.text();
        trace.push(`Fetched ${pageText.length} chars`);
    } catch (err) {
        trace.push(`Fetch error: ${err instanceof Error ? err.message : 'unknown'}`);
        return emptyResult(trace);
    }

    // Strip HTML tags for text analysis, but keep raw for link extraction
    const textContent = stripHtml(pageText);
    const lowerText = textContent.toLowerCase();

    // ---- Extract Emails ----
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const allEmails = [...new Set((pageText.match(emailRegex) || []))];
    // Prioritize role-based emails
    const priorityEmails = allEmails.filter(e =>
        /^(events?|booking|book|marketing|info|contact|entertainment|private|vip)@/i.test(e)
    );
    const emails = priorityEmails.length > 0
        ? [...priorityEmails, ...allEmails.filter(e => !priorityEmails.includes(e))]
        : allEmails;
    if (emails.length > 0) trace.push(`Found ${emails.length} emails`);

    // ---- Extract Phones ----
    const phoneRegex = /(?:\+1\s?)?\(?(\d{3})\)?[\s.\-]?(\d{3})[\s.\-]?(\d{4})/g;
    const phones = [...new Set((textContent.match(phoneRegex) || []))].slice(0, 3);
    if (phones.length > 0) trace.push(`Found ${phones.length} phones`);

    // ---- Extract Contact Form URL ----
    const contactLinkRegex = /href\s*=\s*["']([^"']*(?:contact|private[_-]?event|booking|book[_-]?now|inquir|reserv)[^"']*)["']/gi;
    let contactFormUrl = '';
    const linkMatch = contactLinkRegex.exec(pageText);
    if (linkMatch) {
        contactFormUrl = resolveUrl(url, linkMatch[1]);
        trace.push(`Found contact form: ${contactFormUrl}`);
    }

    // ---- Extract Social Handles ----
    const igRegex = /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/i;
    const igMatch = pageText.match(igRegex);
    const instagram_handle = igMatch ? igMatch[1] : '';
    if (instagram_handle) trace.push(`Found IG: @${instagram_handle}`);

    const fbRegex = /facebook\.com\/([a-zA-Z0-9.\-]+)/i;
    const fbMatch = pageText.match(fbRegex);
    const facebook_page = fbMatch ? fbMatch[1] : '';

    // ---- Extract Contact Name / Role ----
    let contact_name = '';
    let role = '';
    const rolePatterns = [
        /(?:events?\s+(?:director|manager|coordinator|planner))[\s:–\-]*([A-Z][a-z]+\s[A-Z][a-z]+)/i,
        /(?:booking\s+(?:manager|contact|agent))[\s:–\-]*([A-Z][a-z]+\s[A-Z][a-z]+)/i,
        /(?:general\s+manager|gm)[\s:–\-]*([A-Z][a-z]+\s[A-Z][a-z]+)/i,
        /(?:entertainment\s+(?:director|manager))[\s:–\-]*([A-Z][a-z]+\s[A-Z][a-z]+)/i,
    ];
    for (const pat of rolePatterns) {
        const m = textContent.match(pat);
        if (m && m[1]) {
            contact_name = m[1].trim();
            role = textContent.match(pat)?.[0]?.replace(contact_name, '').replace(/[\s:–\-]+$/, '').trim() || '';
            trace.push(`Found contact: ${contact_name} (${role})`);
            break;
        }
    }

    // ---- Classify Entity Type ----
    let entity_type: EntityType = 'other';
    let bestScore = 0;
    for (const [type, keywords] of Object.entries(ENTITY_TYPE_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            const count = countOccurrences(lowerText, kw.toLowerCase());
            score += count;
        }
        if (score > bestScore) {
            bestScore = score;
            entity_type = type as EntityType;
        }
    }
    trace.push(`Classified as: ${entity_type}`);

    // ---- Extract Music Fit Tags ----
    const music_fit_tags = MUSIC_FIT_KEYWORDS.filter(tag =>
        lowerText.includes(tag.toLowerCase())
    );
    if (music_fit_tags.length > 0) trace.push(`Music tags: ${music_fit_tags.join(', ')}`);

    // ---- Extract Event Type Indicators ----
    const event_types_seen = EVENT_TYPE_INDICATORS.filter(indicator =>
        lowerText.includes(indicator.toLowerCase())
    );
    if (event_types_seen.length > 0) trace.push(`Event types: ${event_types_seen.join(', ')}`);

    // ---- Estimate Capacity ----
    let capacity_estimate: number | null = null;
    const capacityPatterns = [
        /(?:capacity|accommodat|holds?|seats?|fits?)\s*(?:up\s+to\s+)?(\d{2,4})\s*(?:people|guests|person|pax)?/i,
        /(\d{2,4})\s*(?:person|guest|seat)\s*(?:capacity|venue|space|room)/i,
    ];
    for (const pat of capacityPatterns) {
        const m = textContent.match(pat);
        if (m && m[1]) {
            capacity_estimate = parseInt(m[1]);
            trace.push(`Capacity estimate: ${capacity_estimate}`);
            break;
        }
    }

    // ---- Build raw snippet (first ~500 chars of meaningful text) ----
    const raw_snippet = textContent
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);

    return {
        emails,
        phones,
        contact_form_url: contactFormUrl,
        instagram_handle,
        facebook_page,
        contact_name,
        role,
        entity_type,
        music_fit_tags,
        event_types_seen,
        capacity_estimate,
        raw_snippet,
        agent_trace: trace.join('\n'),
    };
}

/**
 * Apply enrichment results to an existing partial lead.
 */
export function applyEnrichment(lead: Partial<Lead>, enrichment: EnrichmentResult): Partial<Lead> {
    return {
        ...lead,
        email: lead.email || enrichment.emails[0] || '',
        phone: lead.phone || enrichment.phones[0] || '',
        contact_form_url: lead.contact_form_url || enrichment.contact_form_url,
        instagram_handle: lead.instagram_handle || enrichment.instagram_handle,
        facebook_page: lead.facebook_page || enrichment.facebook_page,
        contact_name: lead.contact_name || enrichment.contact_name,
        role: lead.role || enrichment.role,
        entity_type: lead.entity_type === 'other' ? enrichment.entity_type : (lead.entity_type || enrichment.entity_type),
        music_fit_tags: [...new Set([...(lead.music_fit_tags || []), ...enrichment.music_fit_tags])],
        event_types_seen: [...new Set([...(lead.event_types_seen || []), ...enrichment.event_types_seen])],
        capacity_estimate: lead.capacity_estimate || enrichment.capacity_estimate,
        raw_snippet: enrichment.raw_snippet,
        agent_trace: [lead.agent_trace, enrichment.agent_trace].filter(Boolean).join('\n---\n'),
    };
}

// ---- Helpers ----

function stripHtml(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;/g, '')
        .replace(/\s+/g, ' ');
}

function resolveUrl(base: string, relative: string): string {
    try {
        return new URL(relative, base).href;
    } catch {
        return relative;
    }
}

function countOccurrences(text: string, search: string): number {
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(search, pos)) !== -1) {
        count++;
        pos += search.length;
    }
    return count;
}

function emptyResult(trace: string[]): EnrichmentResult {
    return {
        emails: [],
        phones: [],
        contact_form_url: '',
        instagram_handle: '',
        facebook_page: '',
        contact_name: '',
        role: '',
        entity_type: 'other',
        music_fit_tags: [],
        event_types_seen: [],
        capacity_estimate: null,
        raw_snippet: '',
        agent_trace: trace.join('\n'),
    };
}
