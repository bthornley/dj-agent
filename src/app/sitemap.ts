import { MetadataRoute } from 'next';

// ============================================================
// Sitemap — Helps Google index all public pages
// ============================================================

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://giglift.com';

    // Static pages
    const staticPages = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
        { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.9 },
        { url: `${baseUrl}/sign-in`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
        { url: `${baseUrl}/sign-up`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    ];

    // City gig pages — top 30 US cities for music
    const cities = [
        'los-angeles', 'new-york', 'miami', 'chicago', 'austin', 'nashville',
        'atlanta', 'san-francisco', 'dallas', 'houston', 'seattle', 'denver',
        'portland', 'las-vegas', 'phoenix', 'san-diego', 'detroit', 'minneapolis',
        'philadelphia', 'boston', 'new-orleans', 'memphis', 'charlotte', 'tampa',
        'orlando', 'sacramento', 'san-antonio', 'baltimore', 'st-louis', 'kansas-city',
    ];

    const cityPages = cities.map(city => ({
        url: `${baseUrl}/gigs/${city}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
    }));

    return [...staticPages, ...cityPages];
}
