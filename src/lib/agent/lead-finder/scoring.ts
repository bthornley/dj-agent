import { Lead, Priority, Confidence } from '../../types';
import { TARGET_REGIONS } from './sources';

// ============================================================
// Lead Finder — Scoring Module
// Deterministic rubric: Fit (0–60) + Reachability (0–40) = 0–100
// Target: OC + Long Beach, no weddings
// ============================================================

export interface ScoreResult {
    lead_score: number;
    score_reason: string;
    confidence: Confidence;
    priority: Priority;
}

/**
 * Score a lead using the fit + reachability rubric.
 */
export function scoreLead(lead: Partial<Lead>): ScoreResult {
    const reasons: string[] = [];
    let fitScore = 0;
    let reachScore = 0;

    // ---- FIT SCORE (0–60) ----

    // +20 if venue explicitly hosts DJs or nightlife
    const djIndicators = ['dj night', 'dj nights', 'live dj', 'nightclub', 'club',
        'bottle service', 'vip', 'latin night', 'reggaeton night'];
    const hasDjPresence = lead.event_types_seen?.some(e =>
        djIndicators.some(d => e.toLowerCase().includes(d))
    ) || ['club', 'lounge', 'rooftop'].includes(lead.entity_type || '');

    if (hasDjPresence) {
        fitScore += 20;
        reasons.push('+20 DJ/nightlife presence');
    }

    // +15 if venue has regular events calendar
    const eventIndicators = ['private event', 'private party', 'corporate mixer',
        'holiday party', 'live entertainment', 'happy hour', 'themed party'];
    const hasEventCalendar = lead.event_types_seen?.some(e =>
        eventIndicators.some(d => e.toLowerCase().includes(d))
    );
    if (hasEventCalendar) {
        fitScore += 15;
        reasons.push('+15 regular events/calendar');
    }

    // +10 if capacity looks 100+
    if (lead.capacity_estimate && lead.capacity_estimate >= 100) {
        fitScore += 10;
        reasons.push(`+10 capacity ${lead.capacity_estimate}+`);
    }

    // +10 if content fits target style tags (latin, open format, corporate, etc.)
    const targetStyles = ['latin', 'reggaeton', 'salsa', 'bachata', 'open format',
        'hip hop', 'r&b', 'house', 'edm', 'corporate', 'pool party'];
    const matchedStyles = (lead.music_fit_tags || []).filter(tag =>
        targetStyles.some(s => tag.toLowerCase().includes(s))
    );
    if (matchedStyles.length > 0) {
        fitScore += 10;
        reasons.push(`+10 style match (${matchedStyles.slice(0, 3).join(', ')})`);
    }

    // +5 if in target region
    const inTargetRegion = TARGET_REGIONS.some(region => {
        const r = region.toLowerCase();
        const city = (lead.city || '').toLowerCase();
        const neighborhood = (lead.neighborhood || '').toLowerCase();
        return city.includes(r) || neighborhood.includes(r) ||
            r.includes(city) || city === 'long beach' ||
            // OC cities
            ['anaheim', 'santa ana', 'irvine', 'costa mesa', 'huntington beach',
                'newport beach', 'fullerton', 'garden grove', 'tustin', 'laguna beach',
                'dana point', 'san clemente', 'aliso viejo', 'mission viejo',
                'lake forest', 'brea', 'yorba linda', 'placentia', 'la habra',
                'buena park', 'cypress', 'los alamitos', 'seal beach', 'westminster',
                'fountain valley', 'orange', 'san juan capistrano'].includes(city);
    });
    if (inTargetRegion) {
        fitScore += 5;
        reasons.push('+5 target region');
    }

    // ---- REACHABILITY SCORE (0–40) ----

    // +20 if email or booking form exists
    if (lead.email || lead.contact_form_url) {
        reachScore += 20;
        reasons.push(lead.email ? '+20 email found' : '+20 contact form found');
    }

    // +10 if direct event/booking contact is listed
    const hasBookingContact = lead.role?.toLowerCase().match(/event|booking|entertainment/) ||
        (lead.email && /^(events?|booking|entertainment)@/i.test(lead.email));
    if (hasBookingContact) {
        reachScore += 10;
        reasons.push('+10 direct booking contact');
    }

    // +5 if phone listed
    if (lead.phone) {
        reachScore += 5;
        reasons.push('+5 phone');
    }

    // +5 if active socials
    if (lead.instagram_handle || lead.facebook_page) {
        reachScore += 5;
        reasons.push('+5 active socials');
    }

    // ---- TOTAL ----
    const lead_score = Math.min(fitScore + reachScore, 100);

    // ---- CONFIDENCE ----
    let confidence: Confidence = 'low';
    const dataPoints = [
        lead.email, lead.phone, lead.website_url,
        lead.instagram_handle, lead.contact_form_url,
        (lead.event_types_seen?.length || 0) > 0 ? 'yes' : '',
        (lead.music_fit_tags?.length || 0) > 0 ? 'yes' : '',
    ].filter(Boolean).length;

    if (dataPoints >= 5) confidence = 'high';
    else if (dataPoints >= 3) confidence = 'med';

    // ---- PRIORITY ----
    let priority: Priority = 'P3';
    if (lead_score >= 70) priority = 'P1';
    else if (lead_score >= 40) priority = 'P2';

    const score_reason = reasons.join('; ') || 'No scoring signals found';

    return { lead_score, score_reason, confidence, priority };
}
