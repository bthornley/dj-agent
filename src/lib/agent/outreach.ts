import { Lead, BrandProfile } from '../types';

// ============================================================
// Outreach Agent — Email Drafter
// Generates personalized booking inquiry emails using
// lead data + user's brand profile. Template-based.
// ============================================================

export interface OutreachEmail {
    variant: 'formal' | 'casual' | 'follow_up';
    subject: string;
    body: string;
}

export interface OutreachResult {
    leadId: string;
    venueName: string;
    contactName: string;
    contactEmail: string;
    emails: OutreachEmail[];
}

// ---- Template helpers ----

function djLabel(brand: BrandProfile | null): string {
    return brand?.djName || 'I';
}

function genreLine(brand: BrandProfile | null, lead: Lead): string {
    const tags = lead.music_fit_tags?.length
        ? lead.music_fit_tags.slice(0, 3).join(', ')
        : brand?.vibeWords?.slice(0, 3).join(', ') || 'open format';
    return tags;
}

function bioSnippet(brand: BrandProfile | null): string {
    if (brand?.bio && brand.bio.length > 10) {
        // Trim to ~120 chars at a sentence boundary
        const trimmed = brand.bio.length > 120 ? brand.bio.substring(0, 120).replace(/[^.!?]*$/, '') : brand.bio;
        return trimmed || brand.bio.substring(0, 120) + '...';
    }
    return '';
}

function contactFirstName(lead: Lead): string {
    if (lead.contact_name) return lead.contact_name.split(' ')[0];
    return '';
}

function greeting(lead: Lead, formal: boolean): string {
    const name = contactFirstName(lead);
    if (formal) return name ? `Dear ${name}` : 'Dear Booking Team';
    return name ? `Hey ${name}` : 'Hey there';
}

function venueRef(lead: Lead): string {
    return lead.entity_name || 'your venue';
}

// ---- Email generators ----

function formalEmail(lead: Lead, brand: BrandProfile | null): OutreachEmail {
    const dj = djLabel(brand);
    const genre = genreLine(brand, lead);
    const bio = bioSnippet(brand);
    const venue = venueRef(lead);

    const subject = `Booking Inquiry — ${dj === 'I' ? 'DJ' : dj} at ${venue}`;

    const bodyParts = [
        `${greeting(lead, true)},`,
        '',
        `I hope this message finds you well. My name is ${dj === 'I' ? 'a DJ in the area' : dj + ', a DJ based in ' + (brand?.locations?.[0] || 'the area')}. I came across ${venue} and was impressed by the atmosphere and events you host.`,
        '',
        `I specialize in ${genre} and have experience performing at ${brand?.typicalVenues?.length ? brand.typicalVenues.slice(0, 2).join(' and ') : 'venues in the area'}. ${bio ? bio + ' ' : ''}I believe my style would be a great fit for your clientele.`,
        '',
        `I'd love the opportunity to discuss a potential booking or audition set. I'm flexible on dates and happy to provide references, a press kit, or demo mixes.`,
        '',
        lead.capacity_estimate ? `I noticed your venue has a capacity around ${lead.capacity_estimate}, which is right in my sweet spot for creating an incredible atmosphere.` : '',
        '',
        `Would you be open to a brief call or email exchange to explore this further?`,
        '',
        `Thank you for your time and consideration.`,
        '',
        `Best regards,`,
        dj === 'I' ? '' : dj,
    ].filter(line => line !== undefined);

    return { variant: 'formal', subject, body: bodyParts.join('\n') };
}

function casualEmail(lead: Lead, brand: BrandProfile | null): OutreachEmail {
    const dj = djLabel(brand);
    const genre = genreLine(brand, lead);
    const bio = bioSnippet(brand);
    const venue = venueRef(lead);
    const emojis = brand?.emojis?.length ? brand.emojis.slice(0, 2).join('') : '🎧';

    const subject = `${emojis} DJ for ${venue}?`;

    const bodyParts = [
        `${greeting(lead, false)} ${emojis}`,
        '',
        `I'm ${dj === 'I' ? 'a DJ' : dj} — I play ${genre} and I've been checking out ${venue}. Love what you've got going on there.`,
        '',
        bio ? bio : `I've been DJing for years and love bringing energy to the right venue.`,
        '',
        brand?.typicalVenues?.length
            ? `I've played at ${brand.typicalVenues.slice(0, 3).join(', ')} and I think my vibe would fit your crowd perfectly.`
            : `I think my vibe would fit your crowd perfectly.`,
        '',
        lead.event_types_seen?.length
            ? `I saw you host ${lead.event_types_seen.slice(0, 2).join(' and ')} — that's exactly what I'm looking for.`
            : '',
        '',
        `Would love to chat about doing a set. I can send over mixes, a press kit, whatever you need.`,
        '',
        `Let me know! ${emojis}`,
        '',
        dj === 'I' ? '' : `— ${dj}`,
    ].filter(line => line !== undefined);

    return { variant: 'casual', subject, body: bodyParts.join('\n') };
}

function followUpEmail(lead: Lead, brand: BrandProfile | null): OutreachEmail {
    const dj = djLabel(brand);
    const venue = venueRef(lead);
    const emojis = brand?.emojis?.length ? brand.emojis[0] : '🎵';

    const subject = `Following up — DJ booking at ${venue}`;

    const bodyParts = [
        `${greeting(lead, false)},`,
        '',
        `Just following up on my earlier message about DJing at ${venue}. Totally understand if you're swamped — just wanted to make sure it didn't get buried.`,
        '',
        `I'm ${dj === 'I' ? 'a local DJ' : dj} and I'd love a shot at performing at your venue. Happy to do an audition set, send demo mixes, or jump on a quick call — whatever works best for you.`,
        '',
        `No pressure at all. If the timing isn't right, I'd love to stay on your radar for the future.`,
        '',
        `Thanks! ${emojis}`,
        '',
        dj === 'I' ? '' : `— ${dj}`,
    ].filter(line => line !== undefined);

    return { variant: 'follow_up', subject, body: bodyParts.join('\n') };
}

// ---- Main entry point ----

export function generateOutreachEmails(lead: Lead, brand: BrandProfile | null): OutreachResult {
    return {
        leadId: lead.lead_id,
        venueName: lead.entity_name,
        contactName: lead.contact_name || '',
        contactEmail: lead.email || '',
        emails: [
            formalEmail(lead, brand),
            casualEmail(lead, brand),
            followUpEmail(lead, brand),
        ],
    };
}
