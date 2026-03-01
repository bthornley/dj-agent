import { Lead } from '../../types';
import { v4 as uuid } from 'uuid';
import { enrichFromUrl, applyEnrichment } from './enrichment';
import { computeDedupeKey, checkAndMergeDuplicate } from './dedup';
import { scoreLead } from './scoring';
import { qualityCheck } from './qc';
import { dbSaveLead } from '../../db';

// ============================================================
// Lead Finder — Pipeline Orchestrator
// Runs the full pipeline for a given URL: enrich → dedup → score → QC → save
// ============================================================

export interface PipelineResult {
    lead: Lead;
    isNew: boolean;
    isDuplicate: boolean;
    qcPassed: boolean;
    qcIssues: string[];
    qcWarnings: string[];
}

/**
 * Run the complete lead finder pipeline for a single URL.
 * This is the "Manual URL Drop" workflow — paste a venue URL and get a scored lead.
 */
export async function runPipeline(input: {
    url: string;
    entity_name?: string;
    city?: string;
    state?: string;
    entity_type?: string;
    userId?: string;
    mode?: string;
}): Promise<PipelineResult> {
    const now = new Date().toISOString();

    // Step 1: Enrich from URL
    const enrichment = await enrichFromUrl(input.url);

    // Step 2: Build initial lead
    const partialLead: Partial<Lead> = {
        lead_id: uuid(),
        entity_name: input.entity_name || extractNameFromUrl(input.url),
        entity_type: input.entity_type as Lead['entity_type'] || enrichment.entity_type,
        city: input.city || '',
        state: input.state || 'CA',
        neighborhood: '',
        website_url: input.url,
        source: 'manual',
        source_url: input.url,
        found_at: now,
        contact_name: '',
        role: '',
        email: '',
        phone: '',
        contact_form_url: '',
        instagram_handle: '',
        facebook_page: '',
        preferred_contact_method: '',
        music_fit_tags: [],
        event_types_seen: [],
        capacity_estimate: null,
        budget_signal: 'unknown',
        notes: '',
        lead_score: 0,
        score_reason: '',
        confidence: 'low',
        priority: 'P3',
        status: 'new',
        dedupe_key: '',
        raw_snippet: '',
        agent_trace: '',
    };

    // Step 3: Apply enrichment data
    const enrichedLead = applyEnrichment(partialLead, enrichment) as Lead;

    // Step 4: Compute dedupe key
    enrichedLead.dedupe_key = computeDedupeKey(enrichedLead);

    // Determine preferred contact method
    if (enrichedLead.email) enrichedLead.preferred_contact_method = 'email';
    else if (enrichedLead.contact_form_url) enrichedLead.preferred_contact_method = 'form';
    else if (enrichedLead.phone) enrichedLead.preferred_contact_method = 'phone';
    else if (enrichedLead.instagram_handle) enrichedLead.preferred_contact_method = 'IG';

    // Step 5: Score
    const scoreResult = scoreLead(enrichedLead);
    enrichedLead.lead_score = scoreResult.lead_score;
    enrichedLead.score_reason = scoreResult.score_reason;
    enrichedLead.confidence = scoreResult.confidence;
    enrichedLead.priority = scoreResult.priority;

    // Step 6: Auto-generate notes
    enrichedLead.notes = generateNotes(enrichedLead);

    // Step 7: Dedup check
    const { isDuplicate, mergedLead } = await checkAndMergeDuplicate(enrichedLead, input.userId || '');
    const finalLead = mergedLead;

    // Re-score if merged (may have new data)
    if (isDuplicate) {
        const newScore = scoreLead(finalLead);
        finalLead.lead_score = newScore.lead_score;
        finalLead.score_reason = newScore.score_reason;
        finalLead.confidence = newScore.confidence;
        finalLead.priority = newScore.priority;
    }

    // Step 8: Quality control
    const qcResult = qualityCheck(finalLead);

    // Step 9: Save to DB
    await dbSaveLead(finalLead, input.userId || '', input.mode || 'performer');

    return {
        lead: finalLead,
        isNew: !isDuplicate,
        isDuplicate,
        qcPassed: qcResult.passed,
        qcIssues: qcResult.issues,
        qcWarnings: qcResult.warnings,
    };
}

// ---- Helpers ----

function extractNameFromUrl(url: string): string {
    try {
        const hostname = new URL(url).hostname
            .replace(/^www\./, '')
            .replace(/\.(com|net|org|io|co|bar|club|restaurant|events?)$/i, '');
        // Convert hyphens/dots to spaces and title-case
        return hostname
            .replace(/[.\-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
            .trim();
    } catch {
        return 'Unknown Venue';
    }
}

function generateNotes(lead: Lead): string {
    const parts: string[] = [];
    const typeLabel = lead.entity_type.replace(/_/g, ' ');
    parts.push(`${typeLabel} in ${lead.city || 'unknown city'}`);

    if (lead.event_types_seen.length > 0) {
        parts.push(`hosts ${lead.event_types_seen.slice(0, 3).join(', ')}`);
    }
    if (lead.music_fit_tags.length > 0) {
        parts.push(`vibe: ${lead.music_fit_tags.slice(0, 3).join(', ')}`);
    }
    if (lead.capacity_estimate) {
        parts.push(`capacity ~${lead.capacity_estimate}`);
    }

    return parts.join('; ') + '.';
}
