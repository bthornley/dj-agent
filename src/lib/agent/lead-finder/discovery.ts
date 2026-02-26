import { QuerySeed } from '../../types';
import { runPipeline, PipelineResult } from './pipeline';
import { dbGetSearchQuota, dbIncrementSearchQuota } from '../../db';

// ============================================================
// Lead Finder — Auto-Discovery Module
// Searches the web using seed queries, finds venue URLs,
// then runs them through the full pipeline.
// Requires SERPAPI_KEY env var for web search.
// ============================================================

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const HIGH_VALUE_THRESHOLD = 40; // Only keep P1 (≥70) and P2 (≥40)

export interface DiscoveryResult {
    seed: QuerySeed;
    urlsFound: number;
    leadsCreated: number;
    leadsFiltered: number;
    results: PipelineResult[];
    errors: string[];
}

export interface BatchScanResult {
    totalUrls: number;
    processed: number;
    highValue: number;
    filtered: number;
    results: PipelineResult[];
    errors: string[];
}

/**
 * Run auto-discovery for a single seed query.
 * Searches the web, extracts venue URLs, runs pipeline on each.
 * Only keeps leads scoring ≥ threshold (high-value).
 */
export async function discoverFromSeed(seed: QuerySeed, userId: string = ''): Promise<DiscoveryResult> {
    const errors: string[] = [];
    const results: PipelineResult[] = [];

    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
        return {
            seed,
            urlsFound: 0,
            leadsCreated: 0,
            leadsFiltered: 0,
            results: [],
            errors: ['SERPAPI_KEY not configured. Set it in your environment variables.'],
        };
    }

    // Check quota before searching
    const quota = dbGetSearchQuota(userId);
    if (quota.remaining <= 0) {
        return {
            seed,
            urlsFound: 0,
            leadsCreated: 0,
            leadsFiltered: 0,
            results: [],
            errors: [`Monthly search limit reached (${quota.used}/${quota.limit}). Resets next month.`],
        };
    }

    // Build search query from seed keywords + region
    const query = [...seed.keywords, seed.region].join(' ');

    try {
        // Increment quota for this search
        const quotaCheck = dbIncrementSearchQuota(userId, 1);
        if (!quotaCheck.allowed) {
            return {
                seed,
                urlsFound: 0,
                leadsCreated: 0,
                leadsFiltered: 0,
                results: [],
                errors: [`Monthly search limit reached (${quotaCheck.used}/${quota.limit}).`],
            };
        }

        // Search via SerpAPI
        const searchUrl = new URL(SERPAPI_BASE);
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('api_key', apiKey);
        searchUrl.searchParams.set('engine', 'google');
        searchUrl.searchParams.set('num', '10');
        searchUrl.searchParams.set('gl', 'us');

        const res = await fetch(searchUrl.toString(), {
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
            errors.push(`SerpAPI returned ${res.status}: ${res.statusText}`);
            return { seed, urlsFound: 0, leadsCreated: 0, leadsFiltered: 0, results, errors };
        }

        const data = await res.json();
        const organicResults = data.organic_results || [];

        // Also grab local results (Google Maps pack) if available
        const localResults = data.local_results?.places || [];

        // Extract URLs from search results
        const urls: { url: string; title: string }[] = [];

        for (const result of organicResults) {
            if (result.link && !isExcludedDomain(result.link)) {
                urls.push({ url: result.link, title: result.title || '' });
            }
        }

        for (const place of localResults) {
            if (place.links?.website && !isExcludedDomain(place.links.website)) {
                urls.push({ url: place.links.website, title: place.title || '' });
            }
        }

        // Deduplicate URLs by domain
        const seen = new Set<string>();
        const uniqueUrls = urls.filter(u => {
            try {
                const domain = new URL(u.url).hostname;
                if (seen.has(domain)) return false;
                seen.add(domain);
                return true;
            } catch {
                return false;
            }
        });

        let leadsFiltered = 0;

        // Run pipeline on each URL (with rate limiting)
        for (const { url, title } of uniqueUrls) {
            try {
                // Rate limit: wait 1s between requests
                await sleep(1000);

                const result = await runPipeline({
                    url,
                    entity_name: title || undefined,
                    city: extractCityFromSeed(seed),
                    state: 'CA',
                    userId,
                });

                // Only keep high-value leads
                if (result.lead.lead_score >= HIGH_VALUE_THRESHOLD) {
                    results.push(result);
                } else {
                    leadsFiltered++;
                }
            } catch (err) {
                errors.push(`Failed to scan ${url}: ${err instanceof Error ? err.message : 'unknown'}`);
            }
        }

        return {
            seed,
            urlsFound: uniqueUrls.length,
            leadsCreated: results.length,
            leadsFiltered,
            results,
            errors,
        };

    } catch (err) {
        errors.push(`Search failed: ${err instanceof Error ? err.message : 'unknown'}`);
        return { seed, urlsFound: 0, leadsCreated: 0, leadsFiltered: 0, results, errors };
    }
}

/**
 * Run auto-discovery across multiple seeds.
 */
export async function discoverFromSeeds(seeds: QuerySeed[], userId: string = ''): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    for (const seed of seeds) {
        if (!seed.active) continue;
        const result = await discoverFromSeed(seed, userId);
        results.push(result);
        // Rate limit between seeds
        await sleep(2000);
    }
    return results;
}

/**
 * Batch scan multiple URLs. Only keeps high-value leads (score ≥ threshold).
 */
export async function batchScanUrls(
    urls: { url: string; entity_name?: string; city?: string }[],
    userId: string = ''
): Promise<BatchScanResult> {
    const results: PipelineResult[] = [];
    const errors: string[] = [];
    let filtered = 0;

    for (const input of urls) {
        try {
            await sleep(800); // Rate limit

            const result = await runPipeline({
                url: input.url,
                entity_name: input.entity_name,
                city: input.city,
                state: 'CA',
                userId,
            });

            if (result.lead.lead_score >= HIGH_VALUE_THRESHOLD) {
                results.push(result);
            } else {
                filtered++;
            }
        } catch (err) {
            errors.push(`${input.url}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
    }

    return {
        totalUrls: urls.length,
        processed: results.length + filtered,
        highValue: results.length,
        filtered,
        results,
        errors,
    };
}

// ---- Helpers ----

function isExcludedDomain(url: string): boolean {
    const excluded = [
        'yelp.com', 'tripadvisor.com', 'facebook.com', 'instagram.com',
        'twitter.com', 'x.com', 'tiktok.com', 'youtube.com',
        'google.com', 'wikipedia.org', 'reddit.com',
        'linkedin.com', 'pinterest.com', 'mapquest.com',
        'yellowpages.com', 'bbb.org', 'menuism.com',
    ];
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        return excluded.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

function extractCityFromSeed(seed: QuerySeed): string {
    const region = seed.region;
    // Check if one of the keywords is a city name in our targets
    const cities = seed.keywords.filter(k =>
        ['long beach', 'anaheim', 'santa ana', 'irvine', 'costa mesa',
            'huntington beach', 'newport beach', 'fullerton', 'garden grove',
            'tustin', 'laguna beach', 'dana point'].some(c =>
                k.toLowerCase().includes(c)
            )
    );
    if (cities.length > 0) return cities[0];
    return region;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
