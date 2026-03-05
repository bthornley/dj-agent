import { Lead, BrandProfile, ArtistType } from '../types';
import { aiJSON } from '../ai';

// ============================================================
// Outreach Agent — Email Drafter
// Generates personalized booking inquiry emails using
// lead data + user's brand profile. Template-based.
// Tailored per artist type: DJ, band, solo_artist, music_instructor
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
    roleLabel: string;       // "DJ", "band", "solo musician", "music instructor"
    roleLabelCap: string;    // "DJ", "Band", "Solo Musician", "Music Instructor"
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
        case 'music_instructor':
            return {
                roleLabel: 'music instructor',
                roleLabelCap: 'Music Instructor',
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

function genreLine(brand: BrandProfile | null, lead: Lead, specialties?: string[]): string {
    // Use specialties first, then fall back to music fit tags / vibe words
    if (specialties?.length) {
        return specialties.slice(0, 4).join(', ');
    }
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

function formalEmail(lead: Lead, brand: BrandProfile | null, ctx: ArtistContext, specialties?: string[]): OutreachEmail {
    const name = artistName(brand);
    const genre = genreLine(brand, lead, specialties);
    const bio = bioSnippet(brand);
    const venue = venueRef(lead);
    const isInstructor = ctx.roleLabel === 'music instructor';

    const subject = `${ctx.subjectPrefix} Inquiry — ${name === 'I' ? ctx.roleLabelCap : name} at ${venue}`;

    const introLine = name === 'I'
        ? `My name is a ${ctx.roleLabel} in the area`
        : `${name}, a ${ctx.roleLabel} based in ${brand?.locations?.[0] || 'the area'}`;

    const bodyParts = [
        `${greeting(lead, true)},`,
        '',
        `I hope this message finds you well. I'm ${introLine}. I came across ${venue} and ${isInstructor ? 'was excited to learn about your programs' : 'was impressed by the atmosphere and events you host'}.`,
        '',
        isInstructor
            ? `I specialize in teaching ${genre} and have experience working with ${brand?.typicalVenues?.length ? brand.typicalVenues.slice(0, 2).join(' and ') : 'students of all ages and levels'}. ${bio ? bio + ' ' : ''}I'd love to explore how I could contribute to your music programming.`
            : `I specialize in ${genre} and have experience performing at ${brand?.typicalVenues?.length ? brand.typicalVenues.slice(0, 2).join(' and ') : 'venues in the area'}. ${bio ? bio + ' ' : ''}I believe my style would be a great fit for your clientele.`,
        '',
        isInstructor
            ? `I'd love the opportunity to discuss offering lessons or a music program at your location. I'm flexible on scheduling and happy to provide ${ctx.demoOffer}.`
            : `I'd love the opportunity to discuss a potential booking. I'm flexible on dates and happy to provide ${ctx.demoOffer}.`,
        '',
        lead.capacity_estimate && !isInstructor ? `I noticed your venue has a capacity around ${lead.capacity_estimate}, which is right in my sweet spot for creating an incredible atmosphere.` : '',
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

function casualEmail(lead: Lead, brand: BrandProfile | null, ctx: ArtistContext, specialties?: string[]): OutreachEmail {
    const name = artistName(brand);
    const genre = genreLine(brand, lead, specialties);
    const bio = bioSnippet(brand);
    const venue = venueRef(lead);
    const emoji = ctx.casualEmoji;
    const isInstructor = ctx.roleLabel === 'music instructor';

    const subject = `${emoji} ${ctx.roleLabelCap} for ${venue}?`;

    const bodyParts = [
        `${greeting(lead, false)} ${emoji}`,
        '',
        `I'm ${name === 'I' ? `a ${ctx.roleLabel}` : name} — I ${isInstructor ? 'teach' : 'play'} ${genre} and I've been checking out ${venue}. ${isInstructor ? "Love what you've got going on there." : "Love what you've got going on there."}`,
        '',
        bio ? bio : isInstructor
            ? `I've been teaching music for years and love helping students discover their potential.`
            : `I've been ${ctx.actionVerb}ing for years and love bringing energy to the right venue.`,
        '',
        brand?.typicalVenues?.length
            ? isInstructor
                ? `I've worked with ${brand.typicalVenues.slice(0, 3).join(', ')} and I think I could add a lot of value to your program.`
                : `I've played at ${brand.typicalVenues.slice(0, 3).join(', ')} and I think my vibe would fit your crowd perfectly.`
            : isInstructor
                ? `I think I could add a lot of value to your music programming.`
                : `I think my vibe would fit your crowd perfectly.`,
        '',
        lead.event_types_seen?.length && !isInstructor
            ? `I saw you host ${lead.event_types_seen.slice(0, 2).join(' and ')} — that's exactly what I'm looking for.`
            : '',
        '',
        isInstructor
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
    const isInstructor = ctx.roleLabel === 'music instructor';

    const subject = `Following up — ${ctx.roleLabelCap.toLowerCase()} ${isInstructor ? 'lessons' : 'booking'} at ${venue}`;

    const bodyParts = [
        `${greeting(lead, false)},`,
        '',
        `Just following up on my earlier message about ${ctx.followUpAction}. Totally understand if you're swamped — just wanted to make sure it didn't get buried.`,
        '',
        `I'm ${name === 'I' ? `a local ${ctx.roleLabel}` : name} and I'd love a shot at ${ctx.followUpAction}. Happy to ${isInstructor ? 'do a trial lesson, share my curriculum, or jump on a quick call' : `do an audition set, send ${ctx.demoOffer}, or jump on a quick call`} — whatever works best for you.`,
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

// ---- AI-powered email generation ----

interface AIEmailSet {
    emails: Array<{
        variant: 'formal' | 'casual' | 'follow_up';
        subject: string;
        body: string;
    }>;
}

async function generateOutreachEmailsAI(
    lead: Lead,
    brand: BrandProfile | null,
    artistType: ArtistType = 'dj',
    specialties?: string[],
): Promise<OutreachEmail[] | null> {
    const artistLabel = artistType.replace(/_/g, ' ');
    const brandInfo = brand ? [
        brand.djName ? `Artist name: ${brand.djName}` : '',
        brand.vibeWords?.length ? `Style/Vibe: ${brand.vibeWords.join(', ')}` : '',
        brand.locations?.length ? `Based in: ${brand.locations.join(', ')}` : '',
        brand.bio ? `Bio: ${brand.bio.substring(0, 200)}` : '',
        brand.typicalVenues?.length ? `Past venues: ${brand.typicalVenues.join(', ')}` : '',
    ].filter(Boolean).join('\n') : 'No brand profile available';

    const venueInfo = [
        `Venue: ${lead.entity_name}`,
        lead.city ? `City: ${lead.city}` : '',
        lead.entity_type ? `Type: ${lead.entity_type.replace(/_/g, ' ')}` : '',
        lead.contact_name ? `Contact: ${lead.contact_name}` : '',
        lead.music_fit_tags?.length ? `Music vibe: ${lead.music_fit_tags.join(', ')}` : '',
        lead.event_types_seen?.length ? `Events they host: ${lead.event_types_seen.join(', ')}` : '',
        lead.capacity_estimate ? `Capacity: ~${lead.capacity_estimate}` : '',
        lead.notes ? `Notes: ${lead.notes}` : '',
    ].filter(Boolean).join('\n');

    const specialtiesInfo = specialties?.length ? `Specialties: ${specialties.join(', ')}` : '';

    const system = `You are an expert cold-outreach copywriter for a ${artistLabel}. Write booking inquiry emails that feel personal, reference specific venue details, and sound human — never generic or spammy. Each email must feel like it was hand-written for THIS specific venue. Return JSON.`;

    const user = `Write 3 outreach email variants for this ${artistLabel} to send to a venue.

## Artist Profile
${brandInfo}
${specialtiesInfo}

## Venue Details
${venueInfo}

Generate exactly 3 emails:
1. "formal" — Professional, concise, suitable for corporate or upscale venues
2. "casual" — Friendly, conversational, with personality and maybe an emoji
3. "follow_up" — Brief follow-up assuming no response to initial outreach

Each email must:
- Have a unique, compelling subject line (not generic like "DJ Services Inquiry")
- Reference something specific about the venue (their events, vibe, neighborhood)
- Include the artist's name and relevant experience
- End with a clear call-to-action
- Be 100-200 words for formal/casual, 50-100 words for follow-up

Return JSON: { "emails": [{ "variant": "formal"|"casual"|"follow_up", "subject": "...", "body": "..." }] }`;

    const result = await aiJSON<AIEmailSet>(system, user, { maxTokens: 1500, temperature: 0.85 });
    if (!result?.emails?.length) return null;

    return result.emails.map(e => ({
        variant: e.variant,
        subject: e.subject,
        body: e.body,
    }));
}

// ---- Main entry point ----

export async function generateOutreachEmails(
    lead: Lead,
    brand: BrandProfile | null,
    artistType: ArtistType = 'dj',
    specialties?: string[],
): Promise<OutreachResult> {
    // Try AI-powered generation first
    const aiEmails = await generateOutreachEmailsAI(lead, brand, artistType, specialties);

    // Fall back to templates if AI is unavailable
    const ctx = getArtistContext(artistType, brand);
    const emails = aiEmails || [
        formalEmail(lead, brand, ctx, specialties),
        casualEmail(lead, brand, ctx, specialties),
        followUpEmail(lead, brand, ctx),
    ];

    return {
        leadId: lead.lead_id,
        venueName: lead.entity_name,
        contactName: lead.contact_name || '',
        contactEmail: lead.email || '',
        emails,
    };
}
