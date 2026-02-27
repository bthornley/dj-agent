import { Event, ContentPlan, ContentPlanTargets, SocialPost, ContentPillar, PostType, BrandProfile } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Strategy Agent — The Brain
// Generates weekly content plans based on upcoming events,
// brand profile, and content pillar rotation.
// ============================================================

const DEFAULT_TARGETS: ContentPlanTargets = {
    reels: 3,
    carousels: 2,
    stories: 5,    // daily Mon-Fri
    fbEvents: 1,
    fbPosts: 2,
    lives: 0,      // monthly, not every week
};

const WEEKLY_THEMES = [
    'Event Hype Week',
    'Behind the Scenes',
    'Crowd Energy',
    'Taste & Identity',
    'Community Spotlight',
    'Throwback / Best Of',
    'Collab Week',
    'Crate Digging',
];

const PILLAR_ROTATION: ContentPillar[] = [
    'event', 'proof_of_party', 'taste_identity', 'education', 'credibility',
];

/**
 * Generate a weekly content plan.
 * If there are upcoming events, the plan centers around event hype.
 * Otherwise, it rotates through content pillars.
 */
export function generateWeeklyPlan(
    events: Event[],
    brand: BrandProfile | null,
    weekOf?: string,
): { plan: ContentPlan; posts: SocialPost[] } {
    const now = new Date();
    const monday = weekOf || getMonday(now);
    const planId = uuid();
    const posts: SocialPost[] = [];

    // Determine theme based on upcoming events
    const upcomingEvents = events.filter(e => {
        if (!e.date || e.status === 'cancelled') return false;
        const eventDate = new Date(e.date);
        const weekEnd = new Date(monday);
        weekEnd.setDate(weekEnd.getDate() + 14); // look 2 weeks ahead
        return eventDate >= now && eventDate <= weekEnd;
    });

    const hasUpcomingEvent = upcomingEvents.length > 0;
    const theme = hasUpcomingEvent
        ? `Event Hype: ${upcomingEvents[0].clientName || upcomingEvents[0].venueName || 'Upcoming Gig'}`
        : WEEKLY_THEMES[getWeekNumber(now) % WEEKLY_THEMES.length];

    const targets = { ...DEFAULT_TARGETS };
    if (hasUpcomingEvent) {
        targets.fbEvents = Math.min(upcomingEvents.length, 2);
    }

    // Generate post shells for each target slot
    let pillarIdx = 0;

    // Reels
    for (let i = 0; i < targets.reels; i++) {
        const pillar = hasUpcomingEvent && i === 0
            ? 'event' as ContentPillar
            : PILLAR_ROTATION[pillarIdx++ % PILLAR_ROTATION.length];
        const eventId = pillar === 'event' && upcomingEvents[0] ? upcomingEvents[0].id : '';
        posts.push(createPostShell(planId, pillar, 'reel', 'both', eventId, i));
    }

    // Carousels
    for (let i = 0; i < targets.carousels; i++) {
        const pillar = PILLAR_ROTATION[pillarIdx++ % PILLAR_ROTATION.length];
        posts.push(createPostShell(planId, pillar, 'carousel', 'instagram', '', i));
    }

    // Stories (daily prompts)
    for (let i = 0; i < targets.stories; i++) {
        const pillar = i < 2
            ? 'event' as ContentPillar
            : PILLAR_ROTATION[pillarIdx++ % PILLAR_ROTATION.length];
        const eventId = pillar === 'event' && upcomingEvents[0] ? upcomingEvents[0].id : '';
        posts.push(createPostShell(planId, pillar, 'story', 'instagram', eventId, i));
    }

    // FB Event posts
    for (let i = 0; i < targets.fbEvents; i++) {
        const eventId = upcomingEvents[i] ? upcomingEvents[i].id : '';
        posts.push(createPostShell(planId, 'event', 'fb_event', 'facebook', eventId, i));
    }

    // FB Posts
    for (let i = 0; i < targets.fbPosts; i++) {
        const pillar = PILLAR_ROTATION[pillarIdx++ % PILLAR_ROTATION.length];
        posts.push(createPostShell(planId, pillar, 'fb_post', 'facebook', '', i));
    }

    const strategyNotes = hasUpcomingEvent
        ? `Focus on driving RSVPs and ticket clicks for ${upcomingEvents.map(e => e.venueName || e.clientName).join(', ')}. Mix in social proof and taste content to keep non-event followers engaged.`
        : `No upcoming events this window — rotating through content pillars to maintain engagement and grow followers. Theme: "${theme}".`;

    const plan: ContentPlan = {
        id: planId,
        weekOf: monday,
        theme,
        targets,
        postIds: posts.map(p => p.id),
        status: 'draft',
        strategyNotes,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };

    return { plan, posts };
}

// ---- Helpers ----

function createPostShell(
    planId: string,
    pillar: ContentPillar,
    postType: PostType,
    platform: 'instagram' | 'facebook' | 'both',
    eventId: string,
    index: number,
): SocialPost {
    const now = new Date().toISOString();
    return {
        id: uuid(),
        pillar,
        postType,
        platform,
        hookText: '',
        caption: '',
        hashtags: [],
        cta: '',
        mediaRefs: [],
        status: 'idea',
        scheduledFor: '',
        postedAt: '',
        variant: 'A',
        variantPairId: '',
        eventId,
        planId,
        notes: `Auto-generated slot #${index + 1} — ${postType} / ${pillar}`,
        createdAt: now,
        updatedAt: now,
    };
}

function getMonday(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
}

function getWeekNumber(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime();
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}
