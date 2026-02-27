import { NextRequest, NextResponse } from 'next/server';
import { dbGetBrandProfile, dbGetAllEvents, dbGetAllMediaAssets, dbGetUserStats, dbGetEPKConfig } from '@/lib/db';

// GET /api/epk/[id] — Public EPK data for a user
// No auth required — this is a shareable public endpoint
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: userId } = await params;

    try {
        const [brand, events, media, stats, epkConfig] = await Promise.all([
            dbGetBrandProfile(userId).catch(() => null),
            dbGetAllEvents(userId).catch(() => []),
            dbGetAllMediaAssets(userId).catch(() => []),
            dbGetUserStats(userId).catch(() => ({ events: 0, leads: 0, posts: 0, plans: 0, mediaAssets: 0, hasBrand: false })),
            dbGetEPKConfig(userId).catch(() => null),
        ]);

        if (!brand || !brand.djName) {
            return NextResponse.json({ error: 'EPK not found' }, { status: 404 });
        }

        // Apply EPK config overrides
        const publicBrand = {
            djName: epkConfig?.headline || brand.djName,
            tagline: epkConfig?.tagline || '',
            bio: epkConfig?.bio || brand.bio,
            vibeWords: brand.vibeWords || [],
            locations: brand.locations || [],
            typicalVenues: brand.typicalVenues || [],
            brandColors: brand.brandColors || [],
            emojis: brand.emojis || [],
            connectedAccounts: (brand.connectedAccounts || []).map(a => ({
                platform: a.platform,
                handle: a.handle,
            })),
        };

        // Public events (only confirmed/completed)
        let publicEvents = events
            .filter(e => e.status === 'confirmed' || e.status === 'completed')
            .slice(0, 10)
            .map(e => ({
                id: e.id,
                eventType: e.eventType,
                venueName: e.venueName,
                clientName: e.clientName,
                date: e.date,
                status: e.status,
            }));

        // Apply curated event selection
        if (epkConfig?.selectedEvents && epkConfig.selectedEvents.length > 0) {
            const sel = new Set(epkConfig.selectedEvents);
            publicEvents = publicEvents.filter(e => sel.has(e.id));
        }

        // Public media (images and videos, limit 12)
        let publicMedia = media
            .filter(m => m.mediaType === 'image' || m.mediaType === 'video')
            .slice(0, 12)
            .map(m => ({
                id: m.id,
                url: m.url,
                thumbnailUrl: m.thumbnailUrl,
                mediaType: m.mediaType,
                fileName: m.fileName,
            }));

        // Apply curated media selection
        if (epkConfig?.selectedMedia && epkConfig.selectedMedia.length > 0) {
            const sel = new Set(epkConfig.selectedMedia);
            publicMedia = publicMedia.filter(m => sel.has(m.id));
        }

        return NextResponse.json({
            brand: publicBrand,
            events: publicEvents,
            media: publicMedia,
            stats: {
                totalEvents: stats.events,
                totalPosts: stats.posts,
            },
            config: epkConfig ? {
                theme: epkConfig.theme,
                accentColor: epkConfig.accentColor,
                sectionOrder: epkConfig.sectionOrder,
                hiddenSections: epkConfig.hiddenSections,
                customSections: epkConfig.customSections,
            } : null,
        });
    } catch (err) {
        console.error('EPK fetch error:', err);
        return NextResponse.json({ error: 'Failed to load EPK' }, { status: 500 });
    }
}
