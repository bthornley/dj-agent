import { BrandProfile, EPKConfig } from '../types';

// ============================================================
// EPK Writer — AI Content Generator
// Template-based bio/tagline generation personalized
// from brand profile data. No LLM API key needed.
// ============================================================

export interface EPKContentVariant {
    style: string;
    text: string;
}

// ---- Bio generators ----

function professionalBio(brand: BrandProfile): string {
    const name = brand.djName || 'This artist';
    const vibes = brand.vibeWords?.slice(0, 3).join(', ') || 'diverse genres';
    const locations = brand.locations?.join(', ') || '';
    const venues = brand.typicalVenues?.slice(0, 3).join(', ') || '';

    const parts = [
        `${name} is a dynamic performer specializing in ${vibes}.`,
    ];
    if (locations) parts.push(`Based in ${locations}, ${name} has built a reputation for delivering unforgettable experiences.`);
    if (venues) parts.push(`With residencies and performances at ${venues}, ${name} brings a signature energy that keeps crowds moving all night.`);
    parts.push(`Known for reading the room and crafting seamless musical journeys, ${name} is the perfect addition to any event.`);
    return parts.join(' ');
}

function casualBio(brand: BrandProfile): string {
    const name = brand.djName || 'This artist';
    const vibes = brand.vibeWords?.slice(0, 3).join(', ') || 'all kinds of music';
    const locations = brand.locations?.[0] || '';
    const venues = brand.typicalVenues?.slice(0, 2).join(' and ') || '';
    const emojis = brand.emojis?.slice(0, 2).join('') || '🎧';

    const parts = [
        `${emojis} ${name} here — if it makes you move, I play it.`,
        `I'm all about ${vibes}.`,
    ];
    if (locations) parts.push(`Repping ${locations}.`);
    if (venues) parts.push(`You might've caught me at ${venues}.`);
    parts.push(`Let's make your next event one to remember.`);
    return parts.join(' ');
}

function storytellingBio(brand: BrandProfile): string {
    const name = brand.djName || 'This artist';
    const vibes = brand.vibeWords?.slice(0, 2).join(' and ') || 'music';
    const locations = brand.locations?.[0] || 'the city';
    const venues = brand.typicalVenues?.[0] || '';

    const parts = [
        `It started with a love for ${vibes} and a pair of headphones.`,
        `${name} has been crafting sonic experiences in ${locations} ever since — from intimate underground sets to packed main stages.`,
    ];
    if (venues) parts.push(`Venues like ${venues} became the proving grounds for a style that blends technical precision with raw energy.`);
    parts.push(`Every set tells a story, and ${name} makes sure it's one worth remembering.`);
    return parts.join(' ');
}

export function generateBioVariants(brand: BrandProfile): EPKContentVariant[] {
    return [
        { style: 'Professional', text: professionalBio(brand) },
        { style: 'Casual', text: casualBio(brand) },
        { style: 'Storytelling', text: storytellingBio(brand) },
    ];
}

// ---- Tagline generators ----

export function generateTaglineVariants(brand: BrandProfile): EPKContentVariant[] {
    const name = brand.djName || 'Artist';
    const vibes = brand.vibeWords || [];
    const locations = brand.locations || [];
    const emojis = brand.emojis || ['🎧'];

    const taglines: EPKContentVariant[] = [];

    // Vibe-based
    if (vibes.length >= 2) {
        taglines.push({ style: 'Vibe', text: `${vibes[0].charAt(0).toUpperCase() + vibes[0].slice(1)} meets ${vibes[1]} — ${name}` });
    } else if (vibes.length === 1) {
        taglines.push({ style: 'Vibe', text: `Pure ${vibes[0]} energy — ${name}` });
    } else {
        taglines.push({ style: 'Vibe', text: `Music that moves you — ${name}` });
    }

    // Location-based
    if (locations.length > 0) {
        taglines.push({ style: 'Local', text: `${locations[0]}'s go-to DJ for events that hit different` });
    } else {
        taglines.push({ style: 'Local', text: `Your next event's secret weapon` });
    }

    // Energy-based
    taglines.push({ style: 'Energy', text: `${emojis[0]} Every set tells a story. Let ${name} write yours.` });

    return taglines;
}

// ---- Section intro generators ----

export function generateSectionIntro(sectionType: string, brand: BrandProfile): string {
    const name = brand.djName || 'this artist';
    switch (sectionType) {
        case 'gallery':
            return `A glimpse into ${name}'s world — from packed dancefloors to behind-the-scenes moments.`;
        case 'videos':
            return `Watch ${name} in action — live sets, event highlights, and more.`;
        case 'events':
            return `See where ${name} is performing next and explore past events.`;
        case 'venues':
            return `${name} has been trusted to perform at these venues.`;
        default:
            return '';
    }
}

// ---- Default config ----

export function getDefaultEPKConfig(brand: BrandProfile | null): Partial<EPKConfig> {
    return {
        headline: brand?.djName || '',
        tagline: '',
        bio: brand?.bio || '',
        sectionOrder: ['socials', 'stats', 'gallery', 'videos', 'venues', 'upcoming', 'past', 'custom'],
        hiddenSections: [],
        customSections: [],
        selectedMedia: [],
        selectedEvents: [],
        theme: 'dark',
        accentColor: brand?.brandColors?.[0] || '#a855f7',
    };
}
