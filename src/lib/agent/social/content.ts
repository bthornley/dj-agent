import { SocialPost, BrandProfile, Event, ContentPillar } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Content Agent — The Editor
// Fills in draft content for post shells: hooks, captions,
// hashtags, CTAs, and A/B variants.
// ============================================================

// ---- Hook templates by pillar ----
const HOOKS: Record<ContentPillar, string[]> = {
    event: [
        '🔥 This {day} is about to be different.',
        '📍 {venue} — you coming or nah?',
        '🎧 Set times just dropped for {event}.',
        "POV: You're front row at {venue}.",
        "⚡ Tickets are moving. Don't sleep on this one.",
    ],
    proof_of_party: [
        '😤 Last night was INSANE.',
        'When the drop hits and the whole room loses it 🫠',
        'This is what {venue} looks like at midnight.',
        'Crowd was giving MAIN CHARACTER energy.',
        'Still recovering from this set 🎧🔊',
    ],
    taste_identity: [
        'Track ID? 👀 Drop your guess below.',
        '🎵 This record changed everything for me.',
        'Crate dig of the week — who knows this one?',
        'My secret weapon track for opening sets.',
        'If you know, you know. 🫡',
    ],
    education: [
        'Help me pick the opener for Saturday 👇',
        'DJ tip that nobody talks about:',
        'Which transition style hits harder? A or B?',
        '📊 Poll: What BPM range do you vibe with most?',
        'Q&A time — ask me anything about DJing.',
    ],
    credibility: [
        'Big shoutout to {venue} for having me back 🙏',
        'When the venue rebooks you before you even leave 😤',
        '"Best DJ we\'ve ever had" — {client}',
        'Grateful for this community. {count} shows and counting.',
        'Collab with @{handle} was absolutely unreal.',
    ],
};

// ---- CTA templates by pillar ----
const CTAS: Record<ContentPillar, string[]> = {
    event: ['🎟️ Link in bio for tickets', 'DM me "RSVP" for the list', 'Save this for Saturday 📌', 'Tag someone who needs to be there'],
    proof_of_party: ['Save this 📌', 'Share to your story if you were there', 'Tag yourself 👇', 'Drop a 🔥 if this goes hard'],
    taste_identity: ['Comment your guess 👇', 'Save for your next playlist', 'Share with a DJ friend', 'DM me "TRACKLIST" for the full set'],
    education: ['Vote in the poll 👆', 'Drop your answer below', 'Share your hot take 👇', 'Save this tip 📌'],
    credibility: ['Show some love in the comments', 'Tag a venue that should book me next', 'Share this with your event planner', 'DM for booking inquiries'],
};

// ---- Hashtag sets by pillar ----
const HASHTAG_POOLS: Record<ContentPillar, string[]> = {
    event: ['#djlife', '#livemusic', '#nightlife', '#djset', '#partyvibes', '#clubnight', '#eventdj', '#djgig', '#upcomingshow', '#ticketsavailable'],
    proof_of_party: ['#crowdcontrol', '#djlife', '#partytime', '#nightlife', '#turntup', '#livedjset', '#foryou', '#vibes', '#crowdenergy', '#djmoment'],
    taste_identity: ['#trackid', '#newmusic', '#cratedigger', '#musicselection', '#djlife', '#vinylonly', '#undergroundmusic', '#musicdiscovery', '#djvibes', '#tuneid'],
    education: ['#djtips', '#djlife', '#learntodj', '#musicproduction', '#beatmatching', '#djcommunity', '#openformat', '#djadvice', '#mixing101'],
    credibility: ['#djlife', '#bookedandblessed', '#venuelife', '#clientlove', '#collab', '#djcommunity', '#grateful', '#nightlife', '#residency'],
};

/**
 * Fill in a post shell with content (hook, caption, hashtags, CTA).
 * Returns two variants (A/B) for testing.
 */
export function generatePostContent(
    post: SocialPost,
    brand: BrandProfile | null,
    event?: Event | null,
): { variantA: SocialPost; variantB: SocialPost } {
    const now = new Date().toISOString();
    const pairId = uuid();

    const variantA = fillContent(post, brand, event, 'A', 0, pairId, now);
    const variantB = fillContent(post, brand, event, 'B', 1, pairId, now);

    return { variantA, variantB };
}

/**
 * Generate a story sequence for an event (3-7 frames).
 * teaser → poll → countdown → DM CTA
 */
export function generateStorySequence(
    event: Event,
    brand: BrandProfile | null,
    planId: string,
): SocialPost[] {
    const now = new Date().toISOString();
    const frames = [
        { hook: `🔥 ${event.venueName || 'Something big'} — this ${getDayName(event.date)}`, cta: 'Stay tuned...', note: 'Teaser frame' },
        { hook: `What should I open with? 🤔\nA) Deep house\nB) Hip-hop\nC) Latin vibes`, cta: 'Vote now 👆', note: 'Poll frame' },
        { hook: `⏰ ${getCountdown(event.date)} until showtime`, cta: `📍 ${event.venueName || 'TBA'} · ${event.startTime || 'Doors TBD'}`, note: 'Countdown frame' },
        { hook: `Want on the guestlist? 🎟️`, cta: 'DM me "LIST" right now', note: 'DM CTA frame' },
    ];

    return frames.map((frame, i) => ({
        id: uuid(),
        pillar: 'event' as ContentPillar,
        postType: 'story' as const,
        platform: 'instagram' as const,
        hookText: frame.hook,
        caption: '',
        hashtags: [],
        cta: frame.cta,
        mediaRefs: [],
        status: 'draft' as const,
        scheduledFor: '',
        postedAt: '',
        variant: 'A' as const,
        variantPairId: '',
        eventId: event.id,
        planId,
        notes: `Story frame ${i + 1}/${frames.length}: ${frame.note}`,
        createdAt: now,
        updatedAt: now,
    }));
}

// ---- Internal helpers ----

function fillContent(
    post: SocialPost,
    brand: BrandProfile | null,
    event: Event | null | undefined,
    variant: 'A' | 'B',
    hookIdx: number,
    pairId: string,
    now: string,
): SocialPost {
    const hooks = HOOKS[post.pillar] || HOOKS.event;
    const ctas = CTAS[post.pillar] || CTAS.event;
    const pool = HASHTAG_POOLS[post.pillar] || HASHTAG_POOLS.event;

    // Pick hook — offset by variant
    let hook = hooks[(hookIdx + (variant === 'B' ? 2 : 0)) % hooks.length];

    // Template substitutions
    if (event) {
        hook = hook
            .replace('{venue}', event.venueName || 'the venue')
            .replace('{event}', event.clientName || 'the event')
            .replace('{day}', getDayName(event.date))
            .replace('{client}', event.clientName || 'our client');
    }
    hook = hook
        .replace('{venue}', brand?.typicalVenues[0] || 'the spot')
        .replace('{handle}', '')
        .replace('{count}', '100+');

    // Build caption
    const djName = brand?.djName || 'DJ';
    const emojiSet = brand?.emojis?.length ? brand.emojis : ['🎧', '🔥', '🎵'];
    const randomEmoji = emojiSet[Math.floor(Math.random() * emojiSet.length)];

    let caption = hook + '\n\n';
    if (post.pillar === 'event' && event) {
        caption += `📅 ${event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Date TBD'}\n`;
        caption += `📍 ${event.venueName || 'Venue TBD'}\n`;
        if (event.startTime) caption += `🕐 ${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}\n`;
        caption += '\n';
    }
    caption += `${randomEmoji} ${ctas[hookIdx % ctas.length]}`;

    // Select hashtags (6-10, shuffled)
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const hashtags = shuffled.slice(0, 6 + Math.floor(Math.random() * 5));

    // Add location-specific hashtags
    if (brand?.locations?.length) {
        const city = brand.locations[0].toLowerCase().replace(/\s+/g, '');
        hashtags.push(`#${city}dj`, `#${city}nightlife`);
    }

    return {
        ...post,
        id: variant === 'A' ? post.id : uuid(),
        hookText: hook,
        caption,
        hashtags,
        cta: ctas[hookIdx % ctas.length],
        status: 'draft',
        variant,
        variantPairId: pairId,
        updatedAt: now,
    };
}

function getDayName(dateStr: string): string {
    if (!dateStr) return 'this weekend';
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    } catch {
        return 'this weekend';
    }
}

function getCountdown(dateStr: string): string {
    if (!dateStr) return 'Soon';
    try {
        const diff = new Date(dateStr + 'T00:00:00').getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) return 'TONIGHT';
        if (days === 1) return 'TOMORROW';
        return `${days} days`;
    } catch {
        return 'Soon';
    }
}
