import { QuerySeed, ArtistType } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Lead Finder — Seed Queries & Source Definitions
// Per-artist-type seeds for tailored discovery
// ============================================================

/** Primary US metro regions available for selection */
export const US_REGIONS = [
    // California
    'Los Angeles', 'San Francisco', 'San Diego', 'Orange County', 'Long Beach',
    'Sacramento', 'San Jose', 'Oakland', 'Inland Empire', 'Santa Barbara',
    // Southwest
    'Las Vegas', 'Phoenix', 'Tucson', 'Albuquerque',
    // Pacific Northwest
    'Seattle', 'Portland', 'Boise',
    // Mountain
    'Denver', 'Salt Lake City', 'Colorado Springs',
    // Texas
    'Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso',
    // Midwest
    'Chicago', 'Detroit', 'Minneapolis', 'Milwaukee', 'Indianapolis',
    'Columbus', 'Cleveland', 'Kansas City', 'St. Louis', 'Cincinnati',
    // Southeast
    'Atlanta', 'Miami', 'Tampa', 'Orlando', 'Nashville', 'Charlotte',
    'Raleigh', 'Jacksonville', 'Memphis', 'New Orleans', 'Birmingham',
    'Charleston', 'Savannah',
    // Northeast
    'New York', 'Boston', 'Philadelphia', 'Washington DC', 'Baltimore',
    'Pittsburgh', 'Hartford', 'Providence', 'Newark',
    // Other
    'Honolulu', 'Anchorage',
] as const;

/** @deprecated Use US_REGIONS and user-selected regions instead */
export const TARGET_REGIONS = ['Orange County', 'Long Beach'] as const;

function seed(region: string, keywords: string[]): QuerySeed {
    return { id: uuid(), region, keywords, source: 'web_search', active: true, created_at: new Date().toISOString() };
}

/** Generate DJ seeds for given regions */
function djSeeds(regions: string[]): QuerySeed[] {
    return regions.flatMap(r => [
        seed(r, ['nightclub', r]), seed(r, ['lounge', 'cocktail bar', r]),
        seed(r, ['rooftop bar', r]), seed(r, ['live music venue', r]),
        seed(r, ['event space', 'private events', r]), seed(r, ['hotel ballroom', r]),
        seed(r, ['brewery', 'winery', 'events', r]),
        seed(r, ['DJ night', r]), seed(r, ['Latin night', r]),
        seed(r, ['corporate event venue', r]), seed(r, ['event planner', r]),
        seed(r, ['promoter', 'events', r]),
        // Marketplace
        seed(r, ['site:craigslist.org', 'DJ gig', r]),
        seed(r, ['site:craigslist.org', 'DJ wanted', r]),
        seed(r, ['site:facebook.com/marketplace', 'DJ gig', r]),
        seed(r, ['site:facebook.com/marketplace', 'DJ wanted', r]),
        seed(r, ['site:gigsalad.com', 'DJ', r]),
        seed(r, ['site:thumbtack.com', 'DJ', r]),
    ]);
}

/** Generate Band seeds for given regions */
function bandSeeds(regions: string[]): QuerySeed[] {
    return regions.flatMap(r => [
        seed(r, ['live music venue', r]), seed(r, ['concert venue', r]),
        seed(r, ['bar live music', r]), seed(r, ['brewery live band', r]),
        seed(r, ['open mic night', r]), seed(r, ['music festival', r]),
        seed(r, ['outdoor concert', r]), seed(r, ['wedding band venue', r]),
        seed(r, ['corporate entertainment', 'live band', r]),
        seed(r, ['event space', 'live entertainment', r]),
        // Marketplace
        seed(r, ['site:craigslist.org', 'band wanted', r]),
        seed(r, ['site:craigslist.org', 'live band gig', r]),
        seed(r, ['site:facebook.com/marketplace', 'band wanted', r]),
        seed(r, ['site:gigsalad.com', 'live band', r]),
        seed(r, ['site:thumbtack.com', 'live band', r]),
        seed(r, ['site:bandmix.com', r]),
    ]);
}

/** Generate Solo Artist seeds for given regions */
function soloArtistSeeds(regions: string[]): QuerySeed[] {
    return regions.flatMap(r => [
        seed(r, ['restaurant live music', r]), seed(r, ['winery live music', r]),
        seed(r, ['coffee shop music', r]), seed(r, ['acoustic venue', r]),
        seed(r, ['wedding venue musician', r]), seed(r, ['private event entertainment', r]),
        seed(r, ['hotel lobby musician', r]), seed(r, ['cocktail hour entertainment', r]),
        seed(r, ['farmers market music', r]), seed(r, ['corporate reception musician', r]),
        // Marketplace
        seed(r, ['site:craigslist.org', 'musician wanted', r]),
        seed(r, ['site:craigslist.org', 'solo musician gig', r]),
        seed(r, ['site:facebook.com/marketplace', 'musician wanted', r]),
        seed(r, ['site:gigsalad.com', 'solo musician', r]),
        seed(r, ['site:thumbtack.com', 'musician', r]),
    ]);
}

/** Generate Music Instructor seeds for given regions */
function musicInstructorSeeds(regions: string[]): QuerySeed[] {
    return regions.flatMap(r => [
        // Schools & education
        seed(r, ['music school', r]), seed(r, ['music academy', r]),
        seed(r, ['school district music program', r]),
        seed(r, ['elementary school music instructor', r]),
        seed(r, ['middle school music instructor', r]),
        seed(r, ['after school music program', r]),
        seed(r, ['preschool music class', r]),
        seed(r, ['Montessori music program', r]),
        seed(r, ['homeschool co-op music', r]),
        seed(r, ['homeschool music classes', r]),
        // Community & recreation
        seed(r, ['community center music', r]),
        seed(r, ['parks and recreation music class', r]),
        seed(r, ['recreation department music lessons', r]),
        seed(r, ['library music program', r]),
        seed(r, ['YMCA music class', r]),
        seed(r, ['boys and girls club music', r]),
        // Religious & youth orgs
        seed(r, ['church music program', r]),
        seed(r, ['youth music program', r]),
        seed(r, ['summer camp music', r]),
        seed(r, ['vacation bible school music', r]),
        // Seniors & therapy
        seed(r, ['retirement home music program', r]),
        seed(r, ['assisted living entertainment', r]),
        seed(r, ['senior center music class', r]),
        seed(r, ['music therapy', r]),
        // Retail & studios
        seed(r, ['music store lessons', r]),
        seed(r, ['private music studio', r]),
        seed(r, ['guitar center lessons', r]),
        // Marketplace & platforms
        seed(r, ['site:craigslist.org', 'music instructor', r]),
        seed(r, ['site:craigslist.org', 'music lessons', r]),
        seed(r, ['site:facebook.com/marketplace', 'music instructor', r]),
        seed(r, ['site:thumbtack.com', 'music lessons', r]),
        seed(r, ['site:care.com', 'music instructor', r]),
        seed(r, ['site:takelessons.com', r]),
        seed(r, ['site:wyzant.com', 'music', r]),
        seed(r, ['site:lessonface.com', r]),
    ]);
}
/**
 * Get default seeds based on artist type and user's selected regions.
 */
export function getDefaultSeeds(artistType: ArtistType = 'dj', regions?: string[]): QuerySeed[] {
    const r = regions && regions.length > 0 ? regions : ['Orange County', 'Long Beach'];
    switch (artistType) {
        case 'band': return bandSeeds(r);
        case 'solo_artist': return soloArtistSeeds(r);
        case 'music_instructor': return musicInstructorSeeds(r);
        case 'dj':
        default: return djSeeds(r);
    }
}

/** @deprecated Use getDefaultSeeds(artistType, regions) instead */
export const DEFAULT_SEEDS = djSeeds(['Orange County', 'Long Beach']);

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
