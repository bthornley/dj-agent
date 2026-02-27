import { Lead } from '../../types';
import { dbFindLeadByDedupeKey } from '../../db';

// ============================================================
// Lead Finder — Deduplication Module
// Computes dedupe keys and merges duplicate leads.
// ============================================================

/**
 * Compute a dedupe key for a lead.
 * Priority: website domain > normalized entity_name + city
 */
export function computeDedupeKey(lead: Partial<Lead>): string {
    // Prefer domain-based key
    if (lead.website_url) {
        try {
            const domain = new URL(lead.website_url).hostname
                .replace(/^www\./, '')
                .toLowerCase();
            if (domain && domain !== '') return `domain:${domain}`;
        } catch { /* fall through */ }
    }

    // Fallback: normalized name + city
    const name = normalizeName(lead.entity_name || '');
    const city = (lead.city || '').toLowerCase().trim();
    if (name && city) return `name:${name}|${city}`;

    // Last resort: source URL
    if (lead.source_url) return `url:${lead.source_url}`;

    return `unknown:${Date.now()}`;
}

/**
 * Normalize an entity name for dedup comparison.
 */
function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/['']/g, '')           // remove apostrophes
        .replace(/[^a-z0-9\s]/g, '')    // remove special chars
        .replace(/\b(the|a|an|of|and|&)\b/g, '') // remove articles
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Check if a lead is a duplicate. If so, merge and return
 * the merged lead + the existing lead ID.
 */
export async function checkAndMergeDuplicate(
    newLead: Lead,
    userId: string = ''
): Promise<{ isDuplicate: boolean; mergedLead: Lead; existingId?: string }> {
    const existing = await dbFindLeadByDedupeKey(newLead.dedupe_key, userId);

    if (!existing) {
        return { isDuplicate: false, mergedLead: newLead };
    }

    // Merge: fill in missing fields from the new lead
    const merged: Lead = {
        ...existing,
        // Keep existing identity, but update if new data is better
        entity_name: existing.entity_name || newLead.entity_name,
        entity_type: existing.entity_type === 'other' ? newLead.entity_type : existing.entity_type,
        neighborhood: existing.neighborhood || newLead.neighborhood,

        // Contact: fill gaps
        email: existing.email || newLead.email,
        phone: existing.phone || newLead.phone,
        contact_name: existing.contact_name || newLead.contact_name,
        role: existing.role || newLead.role,
        contact_form_url: existing.contact_form_url || newLead.contact_form_url,
        instagram_handle: existing.instagram_handle || newLead.instagram_handle,
        facebook_page: existing.facebook_page || newLead.facebook_page,
        preferred_contact_method: existing.preferred_contact_method || newLead.preferred_contact_method,

        // Event Fit: merge arrays
        music_fit_tags: [...new Set([...existing.music_fit_tags, ...newLead.music_fit_tags])],
        event_types_seen: [...new Set([...existing.event_types_seen, ...newLead.event_types_seen])],
        capacity_estimate: existing.capacity_estimate || newLead.capacity_estimate,
        budget_signal: existing.budget_signal !== 'unknown' ? existing.budget_signal : newLead.budget_signal,
        notes: existing.notes
            ? `${existing.notes}\n[Updated ${new Date().toISOString()}] ${newLead.notes}`
            : newLead.notes,

        // Keep newest source reference
        source_url: newLead.source_url || existing.source_url,
        source: newLead.source || existing.source,

        // Append to audit trail
        raw_snippet: newLead.raw_snippet || existing.raw_snippet,
        agent_trace: [existing.agent_trace, `[Merge ${new Date().toISOString()}]`, newLead.agent_trace]
            .filter(Boolean)
            .join('\n'),
    };

    return {
        isDuplicate: true,
        mergedLead: merged,
        existingId: existing.lead_id,
    };
}
