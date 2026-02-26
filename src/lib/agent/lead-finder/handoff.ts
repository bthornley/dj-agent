import { Lead, LeadHandoff, Event, EventType } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Lead Finder — Handoff Module
// Generates structured briefs for the DJ Agent queue
// AND creates Event entries for the DJ Agent pipeline.
// ============================================================

/**
 * Convert a lead into a DJ Agent Event (inquiry status).
 * This is the actual "handoff" — it creates a real event
 * that the DJ Agent can work with.
 */
export function leadToEvent(lead: Lead, handoff: LeadHandoff): Event {
    const now = new Date().toISOString();

    // Map entity type to event type
    const eventTypeMap: Record<string, EventType> = {
        club: 'other',
        bar: 'other',
        lounge: 'other',
        rooftop: 'other',
        hotel: 'corporate',
        event_space: 'corporate',
        corporate: 'corporate',
        event_planner: 'other',
        promoter: 'other',
        festival: 'festival',
        restaurant: 'other',
        brewery_winery: 'other',
        city_event: 'other',
        other: 'other',
    };

    // Build a raw inquiry from the lead + handoff data
    const rawInquiry = [
        `[Lead Finder Handoff]`,
        `Venue: ${lead.entity_name}`,
        `Type: ${lead.entity_type.replace(/_/g, ' ')}`,
        `City: ${lead.city || 'Unknown'}${lead.state ? `, ${lead.state}` : ''}`,
        ``,
        `Brief: ${handoff.brief}`,
        `Suggested Angle: ${handoff.suggested_angle}`,
        ``,
        `Contact: ${lead.contact_name || 'N/A'}${lead.role ? ` (${lead.role})` : ''}`,
        `Email: ${lead.email || 'N/A'}`,
        `Phone: ${lead.phone || 'N/A'}`,
        `Instagram: ${lead.instagram_handle ? '@' + lead.instagram_handle : 'N/A'}`,
        `Contact Form: ${lead.contact_form_url || 'N/A'}`,
        ``,
        `Score: ${lead.lead_score}/100 (${lead.priority})`,
        `Score Reason: ${lead.score_reason}`,
        ``,
        lead.event_types_seen.length > 0 ? `Event Types Seen: ${lead.event_types_seen.join(', ')}` : '',
        lead.music_fit_tags.length > 0 ? `Music Fit: ${lead.music_fit_tags.join(', ')}` : '',
        lead.capacity_estimate ? `Capacity: ~${lead.capacity_estimate}` : '',
        ``,
        `Source: ${lead.source_url}`,
        `Website: ${lead.website_url || 'N/A'}`,
    ].filter(Boolean).join('\n');

    return {
        id: uuid(),
        status: 'inquiry',
        clientName: lead.contact_name || lead.entity_name,
        org: lead.entity_name,
        phone: lead.phone || '',
        email: lead.email || '',
        venueName: lead.entity_name,
        address: `${lead.city || ''}${lead.state ? `, ${lead.state}` : ''}`,
        loadInNotes: '',
        indoorOutdoor: '',
        date: '',
        startTime: '',
        endTime: '',
        setupTime: '',
        strikeTime: '',
        eventType: eventTypeMap[lead.entity_type] || 'other',
        attendanceEstimate: lead.capacity_estimate || 0,
        budgetRange: lead.budget_signal !== 'unknown' ? lead.budget_signal : '',
        vibeDescription: lead.music_fit_tags.join(', '),
        scheduleMoments: [],
        deliverables: [],
        inventoryRequired: [],
        risks: [],
        questions: [
            'What dates are you looking for DJ entertainment?',
            'What type of event/night are you planning?',
            `Suggested outreach angle: ${handoff.suggested_angle}`,
        ],
        createdAt: now,
        updatedAt: now,
        rawInquiry,
    };
}

/**
 * Generate a handoff brief for the DJ Agent.
 * Includes a 2–4 sentence summary and a suggested outreach angle.
 */
export function generateHandoff(lead: Lead): LeadHandoff {
    const brief = generateBrief(lead);
    const suggested_angle = suggestAngle(lead);

    return {
        lead_id: lead.lead_id,
        entity_name: lead.entity_name,
        entity_type: lead.entity_type,
        city: lead.city,
        state: lead.state,
        source_url: lead.source_url,
        email: lead.email,
        contact_form_url: lead.contact_form_url,
        phone: lead.phone,
        instagram_handle: lead.instagram_handle,
        lead_score: lead.lead_score,
        score_reason: lead.score_reason,
        notes: lead.notes,
        suggested_angle,
        brief,
        contact_name: lead.contact_name,
        role: lead.role,
        event_types_seen: lead.event_types_seen,
        music_fit_tags: lead.music_fit_tags,
    };
}

/**
 * Validate that a lead has the minimum required fields for handoff.
 */
export function validateHandoffReady(lead: Lead): { ready: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!lead.entity_name) missing.push('entity_name');
    if (!lead.entity_type) missing.push('entity_type');
    if (!lead.city && !lead.state) missing.push('city/state');
    if (!lead.source_url) missing.push('source_url');

    const hasContact = lead.email || lead.contact_form_url || lead.phone || lead.instagram_handle;
    if (!hasContact) missing.push('contact method (email/form/phone/IG)');

    if (!lead.lead_score && lead.lead_score !== 0) missing.push('lead_score');
    if (!lead.score_reason) missing.push('score_reason');

    return { ready: missing.length === 0, missing };
}

// ---- Internal helpers ----

function generateBrief(lead: Lead): string {
    const parts: string[] = [];

    // Sentence 1: What it is
    const typeLabel = lead.entity_type.replace(/_/g, ' ');
    parts.push(
        `${lead.entity_name} is a ${typeLabel} in ${lead.city || 'the area'}${lead.state ? `, ${lead.state}` : ''}.`
    );

    // Sentence 2: What they do
    if (lead.event_types_seen.length > 0) {
        const topEvents = lead.event_types_seen.slice(0, 3).join(', ');
        parts.push(`They host ${topEvents}.`);
    } else if (lead.music_fit_tags.length > 0) {
        const topTags = lead.music_fit_tags.slice(0, 3).join(', ');
        parts.push(`Their vibe aligns with ${topTags}.`);
    }

    // Sentence 3: How to reach them
    if (lead.contact_name && lead.role) {
        parts.push(`Contact ${lead.contact_name} (${lead.role}) via ${bestContactMethod(lead)}.`);
    } else if (lead.email || lead.contact_form_url) {
        parts.push(`Reachable via ${bestContactMethod(lead)}.`);
    }

    // Sentence 4: Capacity/budget if available
    if (lead.capacity_estimate) {
        parts.push(`Estimated capacity: ${lead.capacity_estimate}.`);
    }

    return parts.join(' ');
}

function suggestAngle(lead: Lead): string {
    const types = lead.event_types_seen.map(t => t.toLowerCase());
    const tags = lead.music_fit_tags.map(t => t.toLowerCase());
    const entityType = lead.entity_type;

    // Check for specific angles
    if (types.some(t => t.includes('dj night') || t.includes('latin night'))) {
        return 'weekday residency';
    }
    if (types.some(t => t.includes('private event') || t.includes('private party'))) {
        return 'private events package';
    }
    if (types.some(t => t.includes('corporate'))) {
        return 'corporate entertainment package';
    }
    if (types.some(t => t.includes('pool party') || t.includes('day party'))) {
        return 'weekend day party series';
    }
    if (types.some(t => t.includes('holiday'))) {
        return 'seasonal holiday events';
    }
    if (types.some(t => t.includes('charity') || t.includes('gala') || t.includes('fundraiser'))) {
        return 'charity/gala entertainment';
    }
    if (tags.some(t => t.includes('latin') || t.includes('reggaeton') || t.includes('salsa'))) {
        return 'Latin night programming';
    }

    // Default by entity type
    switch (entityType) {
        case 'club':
        case 'lounge':
        case 'rooftop':
            return 'branded party / residency';
        case 'hotel':
            return 'hotel events & poolside entertainment';
        case 'restaurant':
        case 'bar':
            return 'weekly live DJ entertainment';
        case 'event_space':
        case 'corporate':
            return 'event entertainment partner';
        case 'brewery_winery':
            return 'weekend tasting room entertainment';
        default:
            return 'entertainment partnership';
    }
}

function bestContactMethod(lead: Lead): string {
    if (lead.email) return `email (${lead.email})`;
    if (lead.contact_form_url) return 'their contact form';
    if (lead.phone) return `phone (${lead.phone})`;
    if (lead.instagram_handle) return `Instagram (@${lead.instagram_handle})`;
    return 'unknown';
}
