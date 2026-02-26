import { QuerySeed } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Lead Finder — Seed Queries & Source Definitions
// Target regions: Orange County, Long Beach
// Excluded: weddings
// ============================================================

export const TARGET_REGIONS = ['Orange County', 'Long Beach'] as const;

export const DEFAULT_SEEDS: QuerySeed[] = [
    // — Orange County: Nightlife / Clubs —
    { id: uuid(), region: 'Orange County', keywords: ['nightclub', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['lounge', 'cocktail bar', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['rooftop bar', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['live music venue', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Orange County: Event Spaces —
    { id: uuid(), region: 'Orange County', keywords: ['event space', 'private events', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['hotel ballroom', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['brewery', 'winery', 'events', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Orange County: DJ-Specific —
    { id: uuid(), region: 'Orange County', keywords: ['DJ night', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['Latin night', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Orange County: Corporate / Events —
    { id: uuid(), region: 'Orange County', keywords: ['corporate event venue', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['event planner', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['promoter', 'events', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Long Beach: Nightlife / Clubs —
    { id: uuid(), region: 'Long Beach', keywords: ['nightclub', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['lounge', 'cocktail bar', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['rooftop bar', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['live music venue', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Long Beach: Event Spaces —
    { id: uuid(), region: 'Long Beach', keywords: ['event space', 'private events', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['hotel ballroom', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['brewery', 'winery', 'events', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Long Beach: DJ-Specific —
    { id: uuid(), region: 'Long Beach', keywords: ['DJ night', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['Latin night', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Long Beach: Corporate / Events —
    { id: uuid(), region: 'Long Beach', keywords: ['corporate event venue', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['event planner', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },

    // — Seasonal (both regions) —
    { id: uuid(), region: 'Orange County', keywords: ['holiday party venue', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['new year event venue', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Orange County', keywords: ['summer pool party', 'Orange County'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['holiday party venue', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
    { id: uuid(), region: 'Long Beach', keywords: ['charity gala venue', 'Long Beach'], source: 'web_search', active: true, created_at: new Date().toISOString() },
];

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
