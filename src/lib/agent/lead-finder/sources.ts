import { QuerySeed, ArtistType } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Lead Finder — Seed Queries & Source Definitions
// Per-artist-type seeds for tailored discovery
// ============================================================

export const TARGET_REGIONS = ['Orange County', 'Long Beach'] as const;

function seed(region: string, keywords: string[]): QuerySeed {
    return { id: uuid(), region, keywords, source: 'web_search', active: true, created_at: new Date().toISOString() };
}

const DJ_SEEDS: QuerySeed[] = [
    // Nightlife
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['nightclub', r]), seed(r, ['lounge', 'cocktail bar', r]),
        seed(r, ['rooftop bar', r]), seed(r, ['live music venue', r]),
    ]),
    // Event spaces
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['event space', 'private events', r]), seed(r, ['hotel ballroom', r]),
        seed(r, ['brewery', 'winery', 'events', r]),
    ]),
    // DJ-specific
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['DJ night', r]), seed(r, ['Latin night', r]),
    ]),
    // Corporate
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['corporate event venue', r]), seed(r, ['event planner', r]),
        seed(r, ['promoter', 'events', r]),
    ]),
    // Marketplace listings
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['site:craigslist.org', 'DJ gig', r]),
        seed(r, ['site:craigslist.org', 'DJ wanted', r]),
        seed(r, ['site:facebook.com/marketplace', 'DJ gig', r]),
        seed(r, ['site:facebook.com/marketplace', 'DJ wanted', r]),
        seed(r, ['site:gigsalad.com', 'DJ', r]),
        seed(r, ['site:thumbtack.com', 'DJ', r]),
        seed(r, ['site:bark.com', 'DJ hire', r]),
        seed(r, ['site:eventective.com', 'DJ', r]),
    ]),
];

const BAND_SEEDS: QuerySeed[] = [
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['live music venue', r]), seed(r, ['concert venue', r]),
        seed(r, ['bar live music', r]), seed(r, ['brewery live band', r]),
        seed(r, ['open mic night', r]), seed(r, ['music festival', r]),
        seed(r, ['outdoor concert', r]), seed(r, ['wedding band venue', r]),
        seed(r, ['corporate entertainment', 'live band', r]),
        seed(r, ['event space', 'live entertainment', r]),
    ]),
    // Marketplace listings
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['site:craigslist.org', 'band wanted', r]),
        seed(r, ['site:craigslist.org', 'live band gig', r]),
        seed(r, ['site:facebook.com/marketplace', 'band wanted', r]),
        seed(r, ['site:facebook.com/marketplace', 'live band gig', r]),
        seed(r, ['site:gigsalad.com', 'live band', r]),
        seed(r, ['site:thumbtack.com', 'live band', r]),
        seed(r, ['site:bandmix.com', r]),
        seed(r, ['site:bark.com', 'live band', r]),
    ]),
];

const SOLO_ARTIST_SEEDS: QuerySeed[] = [
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['restaurant live music', r]), seed(r, ['winery live music', r]),
        seed(r, ['coffee shop music', r]), seed(r, ['acoustic venue', r]),
        seed(r, ['wedding venue musician', r]), seed(r, ['private event entertainment', r]),
        seed(r, ['hotel lobby musician', r]), seed(r, ['cocktail hour entertainment', r]),
        seed(r, ['farmers market music', r]), seed(r, ['corporate reception musician', r]),
    ]),
    // Marketplace listings
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['site:craigslist.org', 'musician wanted', r]),
        seed(r, ['site:craigslist.org', 'solo musician gig', r]),
        seed(r, ['site:facebook.com/marketplace', 'musician wanted', r]),
        seed(r, ['site:gigsalad.com', 'solo musician', r]),
        seed(r, ['site:thumbtack.com', 'musician', r]),
        seed(r, ['site:bark.com', 'musician hire', r]),
    ]),
];

const MUSIC_TEACHER_SEEDS: QuerySeed[] = [
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['music school', r]), seed(r, ['music lessons', r]),
        seed(r, ['music store lessons', r]), seed(r, ['community center music', r]),
        seed(r, ['school district music program', r]),
        seed(r, ['after school music program', r]),
        seed(r, ['summer camp music', r]), seed(r, ['church music program', r]),
        seed(r, ['youth music program', r]), seed(r, ['private music studio', r]),
    ]),
    // Marketplace listings
    ...TARGET_REGIONS.flatMap(r => [
        seed(r, ['site:craigslist.org', 'music teacher', r]),
        seed(r, ['site:craigslist.org', 'music lessons', r]),
        seed(r, ['site:facebook.com/marketplace', 'music teacher', r]),
        seed(r, ['site:thumbtack.com', 'music lessons', r]),
        seed(r, ['site:care.com', 'music teacher', r]),
        seed(r, ['site:takelessons.com', r]),
        seed(r, ['site:lessonface.com', r]),
    ]),
];

/**
 * Get default seeds based on artist type.
 */
export function getDefaultSeeds(artistType: ArtistType = 'dj'): QuerySeed[] {
    switch (artistType) {
        case 'band': return BAND_SEEDS;
        case 'solo_artist': return SOLO_ARTIST_SEEDS;
        case 'music_teacher': return MUSIC_TEACHER_SEEDS;
        case 'dj':
        default: return DJ_SEEDS;
    }
}

/** @deprecated Use getDefaultSeeds(artistType) instead */
export const DEFAULT_SEEDS = DJ_SEEDS;

/**
 * High-value entity type keywords — used during enrichment
 * to classify what a venue is.
 */
export const ENTITY_TYPE_KEYWORDS: Record<string, string[]> = {
    club: ['nightclub', 'night club', 'dance club', 'club'],
    bar: ['bar ', 'cocktail bar', 'dive bar', 'sports bar', 'pub'],
    lounge: ['lounge', 'ultra lounge'],
    rooftop: ['rooftop', 'roof deck', 'sky bar'],
    hotel: ['hotel', 'resort', 'inn', 'suites'],
    event_space: ['event space', 'event center', 'event venue', 'banquet', 'ballroom', 'conference'],
    restaurant: ['restaurant', 'dining', 'bistro', 'grill', 'eatery'],
    brewery_winery: ['brewery', 'winery', 'taproom', 'tasting room'],
    corporate: ['corporate event', 'corporate venue', 'meeting space'],
    event_planner: ['event planner', 'event planning', 'event coordinator', 'event management'],
    promoter: ['promoter', 'promotion', 'event promoter'],
    festival: ['festival', 'street fair', 'fair', 'carnival'],
    city_event: ['city event', 'city festival', 'downtown event', 'community event'],
};

/**
 * Music/style tags to look for in venue content.
 */
export const MUSIC_FIT_KEYWORDS: string[] = [
    'latin', 'reggaeton', 'salsa', 'bachata', 'cumbia',
    'open format', 'top 40', 'hip hop', 'hip-hop', 'r&b',
    'house', 'techno', 'edm', 'electronic',
    'corporate', 'cocktail hour', 'dinner music',
    'karaoke', 'live band', 'live music', 'live dj',
    'pool party', 'day party', 'after party',
    'birthday', 'anniversary', 'celebration',
    'charity', 'fundraiser', 'gala', 'benefit',
];

/**
 * Event-type indicators to look for on venue pages.
 */
export const EVENT_TYPE_INDICATORS: string[] = [
    'dj night', 'dj nights', 'live dj',
    'private party', 'private parties', 'private event', 'private events',
    'corporate mixer', 'corporate event', 'corporate party',
    'holiday party', 'new year', 'nye',
    'pool party', 'day party',
    'happy hour', 'ladies night',
    'latin night', 'reggaeton night', 'salsa night',
    'karaoke night',
    'live entertainment', 'live music',
    'bottle service', 'vip',
    'themed party', 'themed event',
    'birthday party', 'birthday celebration',
    'charity event', 'fundraiser', 'gala',
    'golf tournament', 'after party',
];
