import { Lead, BrandProfile, ArtistType } from '../types';

// ============================================================
// Outreach Agent — Email Drafter
// Generates personalized booking inquiry emails using
// lead data + user's brand profile. Template-based.
// Tailored per artist type: DJ, band, solo_artist, music_teacher
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

// ---- Artist-type context ----

interface ArtistContext {
    roleLabel: string;       // "DJ", "band", "solo musician", "music teacher"
    roleLabelCap: string;    // "DJ", "Band", "Solo Musician", "Music Teacher"
    actionVerb: string;      // "perform", "teach", "play"
    offerLine: string;       // what they offer
    demoOffer: string;       // what they can send as proof
    subjectPrefix: string;   // for email subjects
    casualEmoji: string;     // default emoji if no brand emojis
    followUpAction: string;  // what they'd like to do
}

function getArtistContext(artistType: ArtistType, brand: BrandProfile | null): ArtistContext {
    switch (artistType) {
        case 'band':
            return {
                roleLabel: 'live band',
                roleLabelCap: 'Live Band',
                actionVerb: 'perform',
                offerLine: 'live music for events, private parties, and regular bookings',
                demoOffer: 'demo recordings, set lists, or a video of a recent performance',
                subjectPrefix: 'Live Band',
                casualEmoji: brand?.emojis?.[0] || '🎸',
                followUpAction: 'performing at your venue',
            };
        case 'solo_artist':
            return {
                roleLabel: 'solo musician',
                roleLabelCap: 'Solo Musician',
                actionVerb: 'perform',
                offerLine: 'live acoustic and solo performances for events, dining, cocktail hours, and private parties',
                demoOffer: 'demo recordings, a song list, or a video of a recent performance',
                subjectPrefix: 'Solo Musician',
                casualEmoji: brand?.emojis?.[0] || '🎵',
                followUpAction: 'performing at your venue',
            };
        case 'music_teacher':
            return {
                roleLabel: 'music teacher',
                roleLabelCap: 'Music Teacher',
                actionVerb: 'teach',
                offerLine: 'music lessons and programs for students of all ages and skill levels',
                demoOffer: 'my teaching credentials, curriculum samples, or references from current students and parents',
                subjectPrefix: 'Music Lessons',
                casualEmoji: brand?.emojis?.[0] || '🎹',
                followUpAction: 'offering lessons or running a music program at your location',
            };
        case 'dj':
        default:
            return {
                roleLabel: 'DJ',
                roleLabelCap: 'DJ',
                actionVerb: 'perform',
                offerLine: 'DJ sets for events, parties, and regular nights',
                demoOffer: 'demo mixes, a press kit, or references',
                subjectPrefix: 'DJ',
                casualEmoji: brand?.emojis?.[0] || '🎧',
                followUpAction: 'DJing at your venue',
            };
    }
}

// ---- Template helpers ----

function artistName(brand: BrandProfile | null): string {
    return brand?.djName || 'I';
}

function genreLine(brand: BrandProfile | null, lead: Lead): string {
    const tags = lead.music_fit_tags?.length
        ? lead.music_fit_tags.slice(0, 3).join(', ')
        : brand?.vibeWords?.slice(0, 3).join(', ') || 'various styles';
    return tags;
}

function bioSnippet(brand: BrandProfile | null): string {
    if (brand?.bio && brand.bio.length > 10) {
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
    if (formal) return name ? `Dear ${name}` : 'Dear Team';
    return name ? `Hey ${name}` : 'Hey there';
}

function venueRef(lead: Lead): string {
    return lead.entity_name || 'your organization';
}

const PLATFORM_LABELS: Record<string, string> = {
    soundcloud: 'SoundCloud',
    spotify: 'Spotify',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
};

function connectedAccountsLine(brand: BrandProfile | null): string {
    if (!brand?.connectedAccounts?.length) return '';
    const links = brand.connectedAccounts
        .filter(a => a.handle || a.profileUrl)
        .map(a => {
            const label = PLATFORM_LABELS[a.platform] || a.platform;
            const url = a.profileUrl || a.handle;
            return `${label}: ${url}`;
        });
    if (links.length === 0) return '';
    return `\nYou can check out my work here:\n${links.join('\n')}\n`;
}

// ---- Email generators ----

function formalEmail(lead: Lead, brand: BrandProfile | null, ctx: ArtistContext): OutreachEmail {
    const name = artistName(brand);
    const genre = genreLine(brand, lead);
    const bio = bioSnippet(brand);
    const venue = venueRef(lead);
    const isTeacher = ctx.roleLabel === 'music teacher';

    const subject = `${ctx.subjectPrefix} Inquiry — ${name === 'I' ? ctx.roleLabelCap : name} at ${venue}`;

    const introLine = name === 'I'
        ? `My name is a ${ctx.roleLabel} in the area`
        : `${name}, a ${ctx.roleLabel} based in ${brand?.locations?.[0] || 'the area'}`;

    const bodyParts = [
        `${greeting(lead, true)},`,
        '',
        `I hope this message finds you well. I'm ${introLine}. I came across ${venue} and ${isTeacher ? 'was excited to learn about your programs' : 'was impressed by the atmosphere and events you host'}.`,
        '',
        isTeacher
            ? `I specialize in teaching ${genre} and have experience working with ${brand?.typicalVenues?.length ? brand.typicalVenues.slice(0, 2).join(' and ') : 'students of all ages and levels'}. ${bio ? bio + ' ' : ''}I'd love to explore how I could contribute to your music programming.`
            : `I specialize in ${genre} and have experience performing at ${brand?.typicalVenues?.length ? brand.typicalVenues.slice(0, 2).join(' and ') : 'venues in the area'}. ${bio ? bio + ' ' : ''}I believe my style would be a great fit for your clientele.`,
        '',
        isTeacher
            ? `I'd love the opportunity to discuss offering lessons or a music program at your location. I'm flexible on scheduling and happy to provide ${ctx.demoOffer}.`
            : `I'd love the opportunity to discuss a potential booking. I'm flexible on dates and happy to provide ${ctx.demoOffer}.`,
        '',
        lead.capacity_estimate && !isTeacher ? `I noticed your venue has a capacity around ${lead.capacity_estimate}, which is right in my sweet spot for creating an incredible atmosphere.` : '',
        connectedAccountsLine(brand),
        `Would you be open to a brief call or email exchange to explore this further?`,
        '',
        `Thank you for your time and consideration.`,
        '',
        `Best regards,`,
        name === 'I' ? '' : name,
    ].filter(line => line !== undefined);

    return { variant: 'formal', subject, body: bodyParts.join('\n') };
}

function casualEmail(lead: Lead, brand: BrandProfile | null, ctx: ArtistContext): OutreachEmail {
    const name = artistName(brand);
    const genre = genreLine(brand, lead);
    const bio = bioSnippet(brand);
    const venue = venueRef(lead);
    const emoji = ctx.casualEmoji;
    const isTeacher = ctx.roleLabel === 'music teacher';

    const subject = `${emoji} ${ctx.roleLabelCap} for ${venue}?`;

    const bodyParts = [
        `${greeting(lead, false)} ${emoji}`,
        '',
        `I'm ${name === 'I' ? `a ${ctx.roleLabel}` : name} — I ${isTeacher ? 'teach' : 'play'} ${genre} and I've been checking out ${venue}. ${isTeacher ? "Love what you've got going on there." : "Love what you've got going on there."}`,
        '',
        bio ? bio : isTeacher
            ? `I've been teaching music for years and love helping students discover their potential.`
            : `I've been ${ctx.actionVerb}ing for years and love bringing energy to the right venue.`,
        '',
        brand?.typicalVenues?.length
            ? isTeacher
                ? `I've worked with ${brand.typicalVenues.slice(0, 3).join(', ')} and I think I could add a lot of value to your program.`
                : `I've played at ${brand.typicalVenues.slice(0, 3).join(', ')} and I think my vibe would fit your crowd perfectly.`
            : isTeacher
                ? `I think I could add a lot of value to your music programming.`
                : `I think my vibe would fit your crowd perfectly.`,
        '',
        lead.event_types_seen?.length && !isTeacher
            ? `I saw you host ${lead.event_types_seen.slice(0, 2).join(' and ')} — that's exactly what I'm looking for.`
            : '',
        '',
        isTeacher
            ? `Would love to chat about offering lessons or a workshop. I can send over ${ctx.demoOffer} — whatever would be helpful.`
            : `Would love to chat about doing a set. I can send over ${ctx.demoOffer} — whatever you need.`,
        connectedAccountsLine(brand),
        `Let me know! ${emoji}`,
        '',
        name === 'I' ? '' : `— ${name}`,
    ].filter(line => line !== undefined);

    return { variant: 'casual', subject, body: bodyParts.join('\n') };
}

function followUpEmail(lead: Lead, brand: BrandProfile | null, ctx: ArtistContext): OutreachEmail {
    const name = artistName(brand);
    const venue = venueRef(lead);
    const emoji = ctx.casualEmoji;
    const isTeacher = ctx.roleLabel === 'music teacher';

    const subject = `Following up — ${ctx.roleLabelCap.toLowerCase()} ${isTeacher ? 'lessons' : 'booking'} at ${venue}`;

    const bodyParts = [
        `${greeting(lead, false)},`,
        '',
        `Just following up on my earlier message about ${ctx.followUpAction}. Totally understand if you're swamped — just wanted to make sure it didn't get buried.`,
        '',
        `I'm ${name === 'I' ? `a local ${ctx.roleLabel}` : name} and I'd love a shot at ${ctx.followUpAction}. Happy to ${isTeacher ? 'do a trial lesson, share my curriculum, or jump on a quick call' : `do an audition set, send ${ctx.demoOffer}, or jump on a quick call`} — whatever works best for you.`,
        connectedAccountsLine(brand),
        `No pressure at all. If the timing isn't right, I'd love to stay on your radar for the future.`,
        '',
        `Thanks! ${emoji}`,
        '',
        name === 'I' ? '' : `— ${name}`,
    ].filter(line => line !== undefined);

    return { variant: 'follow_up', subject, body: bodyParts.join('\n') };
}

// ---- Main entry point ----

export function generateOutreachEmails(lead: Lead, brand: BrandProfile | null, artistType: ArtistType = 'dj'): OutreachResult {
    const ctx = getArtistContext(artistType, brand);
    return {
        leadId: lead.lead_id,
        venueName: lead.entity_name,
        contactName: lead.contact_name || '',
        contactEmail: lead.email || '',
        emails: [
            formalEmail(lead, brand, ctx),
            casualEmail(lead, brand, ctx),
            followUpEmail(lead, brand, ctx),
        ],
    };
}
