import { Lead } from '../../types';

// ============================================================
// Lead Finder — Quality Control Module
// Validates leads before handoff to DJ Agent.
// ============================================================

export interface QCResult {
    passed: boolean;
    issues: string[];
    warnings: string[];
}

/**
 * Run quality control checks on a lead.
 * A lead must pass all checks before being queued for the DJ Agent.
 */
export function qualityCheck(lead: Lead): QCResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // ---- BLOCKERS (must pass) ----

    // 1) Must have at least one contact path
    const hasContactPath =
        (lead.email && lead.email.trim() !== '') ||
        (lead.contact_form_url && lead.contact_form_url.trim() !== '') ||
        (lead.phone && lead.phone.trim() !== '') ||
        (lead.instagram_handle && lead.instagram_handle.trim() !== '');

    if (!hasContactPath) {
        issues.push('No contact path found (need email, contact form, phone, or Instagram)');
    }

    // 2) Must have a real web/social presence
    const hasPresence =
        (lead.website_url && lead.website_url.trim() !== '') ||
        (lead.instagram_handle && lead.instagram_handle.trim() !== '') ||
        (lead.facebook_page && lead.facebook_page.trim() !== '') ||
        (lead.source_url && lead.source_url.trim() !== '');

    if (!hasPresence) {
        issues.push('No web or social presence found');
    }

    // 3) Must not be obviously irrelevant
    const irrelevantKeywords = [
        'dj equipment', 'dj gear', 'dj supplies', 'dj store',
        'music store', 'instrument store', 'guitar center',
        'equipment rental', 'audio rental',
        'dj school', 'dj academy', 'dj course', 'dj class',
        'wedding chapel', 'wedding planner', // excluded per user request
        'funeral', 'mortuary', 'cemetery',
    ];

    const lowerName = (lead.entity_name || '').toLowerCase();
    const lowerNotes = (lead.notes || '').toLowerCase();
    const lowerSnippet = (lead.raw_snippet || '').toLowerCase();
    const combinedText = `${lowerName} ${lowerNotes} ${lowerSnippet}`;

    for (const keyword of irrelevantKeywords) {
        if (combinedText.includes(keyword)) {
            issues.push(`Possibly irrelevant: matched "${keyword}"`);
            break;
        }
    }

    // 4) Must have entity_name
    if (!lead.entity_name || lead.entity_name.trim() === '') {
        issues.push('Missing entity name');
    }

    // ---- WARNINGS (info, not blockers) ----

    // Low score warning
    if (lead.lead_score < 30) {
        warnings.push(`Low score (${lead.lead_score}/100) — may not be worth pursuing`);
    }

    // No event types detected
    if (!lead.event_types_seen || lead.event_types_seen.length === 0) {
        warnings.push('No event types detected — may need manual review');
    }

    // No email (phone/IG only)
    if (!lead.email && !lead.contact_form_url) {
        warnings.push('No email or contact form — outreach limited to phone/social');
    }

    // Unknown city
    if (!lead.city || lead.city.trim() === '') {
        warnings.push('City not identified');
    }

    return {
        passed: issues.length === 0,
        issues,
        warnings,
    };
}
