import { EngagementTask, BrandProfile, Lead } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Community Agent — The Connector
// Generates engagement tasks: reply drafts, DM responses,
// outbound comments, and collab suggestions.
// ============================================================

// ---- Reply templates by comment type ----
const REPLY_TEMPLATES = {
    compliment: [
        'Appreciate the love 🙏🔥',
        'Means a lot! See you at the next one 🎧',
        'Thank you!! More coming soon 💪',
        'You already know 🫡 Thanks for the support!',
    ],
    question: [
        'Great question! {answer}',
        "DM me and I'll get you the details 📩",
        'Check the link in bio for more info 👆',
    ],
    trackId: [
        'That one is: {track} 🎵 Good ear!',
        "Ahh you caught that one 👀 It's {track}",
        'Adding it to the comments now: {track} 🔊',
    ],
    booking: [
        "💬 DM sent! Let's talk details.",
        'Appreciate the interest! Shooting you a DM now.',
        'Let me send you my availability — check your DMs 📩',
    ],
    generic: [
        '🔥🔥🔥',
        'Let\'s gooo 🎧',
        'More of this coming soon 💪',
        'Appreciate you! 🙏',
    ],
};

/**
 * Generate engagement tasks for the day.
 * Creates reply drafts, outbound comment suggestions, and collab ideas.
 */
export function generateDailyEngagement(
    brand: BrandProfile | null,
    leads: Lead[],
): EngagementTask[] {
    const now = new Date().toISOString();
    const tasks: EngagementTask[] = [];

    // 1) Sample reply drafts (common comment types)
    tasks.push(
        createReplyTask('compliment', '@fan_username', 'Great vibes on your last reel!', brand, now),
        createReplyTask('trackId', '@curious_listener', 'What\'s the track at 0:45?', brand, now),
        createReplyTask('generic', '@supporter', '🔥🔥 so fire', brand, now),
    );

    // 2) Outbound engagement targets (10 local accounts)
    const outboundTargets = generateOutboundTargets(brand, leads);
    for (const target of outboundTargets.slice(0, 10)) {
        tasks.push({
            id: uuid(),
            type: 'outbound_comment',
            target: target.handle,
            context: target.reason,
            draftReply: target.comment,
            status: 'pending',
            requiresApproval: false,
            handoffReason: '',
            createdAt: now,
            updatedAt: now,
        });
    }

    // 3) Collab suggestions from leads
    const collabLeads = leads
        .filter(l => l.lead_score >= 60 && l.instagram_handle)
        .slice(0, 3);

    for (const lead of collabLeads) {
        tasks.push({
            id: uuid(),
            type: 'collab_outreach',
            target: `@${lead.instagram_handle}`,
            context: `${lead.entity_name} — ${lead.entity_type} in ${lead.city}. Score: ${lead.lead_score}. ${lead.notes}`,
            draftReply: `Hey! Love what you're doing at ${lead.entity_name}. Would love to connect about a potential collab — DM me if you're interested 🎧🙏`,
            status: 'pending',
            requiresApproval: false,
            handoffReason: '',
            createdAt: now,
            updatedAt: now,
        });
    }

    return tasks;
}

/**
 * Classify an incoming DM/comment and generate a response.
 * Booking/money DMs are flagged for approval.
 */
export function classifyAndDraft(
    messageText: string,
    senderHandle: string,
    brand: BrandProfile | null,
): EngagementTask {
    const now = new Date().toISOString();
    const lower = messageText.toLowerCase();

    // Check if it's a booking/money inquiry
    const isBooking = /book|rate|price|cost|available|availability|hire|gig|event|quote|how much/i.test(lower);

    if (isBooking) {
        return {
            id: uuid(),
            type: 'reply_dm',
            target: senderHandle,
            context: `Booking inquiry: "${messageText}"`,
            draftReply: `Hey ${senderHandle}! Thanks for reaching out about booking. Let me check my availability and get back to you with details and rates. 🎧`,
            status: 'pending',
            requiresApproval: true,
            handoffReason: 'Booking/money inquiry — requires your personal review before sending.',
            createdAt: now,
            updatedAt: now,
        };
    }

    // Classify comment type
    let type: keyof typeof REPLY_TEMPLATES = 'generic';
    if (/track id|what.?s (the|this) (song|track)|id\?/i.test(lower)) type = 'trackId';
    else if (/love|fire|amazing|incredible|insane|sick|hard|goes off/i.test(lower)) type = 'compliment';
    else if (/\?/.test(messageText)) type = 'question';

    const templates = REPLY_TEMPLATES[type];
    const draft = templates[Math.floor(Math.random() * templates.length)]
        .replace('{track}', '[track name]')
        .replace('{answer}', '[your answer here]');

    return {
        id: uuid(),
        type: 'reply_comment',
        target: senderHandle,
        context: `Comment: "${messageText}"`,
        draftReply: draft,
        status: 'pending',
        requiresApproval: false,
        handoffReason: '',
        createdAt: now,
        updatedAt: now,
    };
}

// ---- Internal helpers ----

function createReplyTask(
    commentType: keyof typeof REPLY_TEMPLATES,
    target: string,
    context: string,
    brand: BrandProfile | null,
    now: string,
): EngagementTask {
    const templates = REPLY_TEMPLATES[commentType];
    const draft = templates[Math.floor(Math.random() * templates.length)]
        .replace('{track}', '[track name]')
        .replace('{answer}', '[your answer here]');

    return {
        id: uuid(),
        type: 'reply_comment',
        target,
        context,
        draftReply: draft,
        status: 'pending',
        requiresApproval: commentType === 'booking',
        handoffReason: commentType === 'booking' ? 'Booking inquiry — needs your review.' : '',
        createdAt: now,
        updatedAt: now,
    };
}

interface OutboundTarget {
    handle: string;
    reason: string;
    comment: string;
}

function generateOutboundTargets(brand: BrandProfile | null, leads: Lead[]): OutboundTarget[] {
    const targets: OutboundTarget[] = [];
    const cities = brand?.locations || ['your city'];

    // From leads with instagram handles
    for (const lead of leads.filter(l => l.instagram_handle).slice(0, 5)) {
        targets.push({
            handle: `@${lead.instagram_handle}`,
            reason: `${lead.entity_type} in ${lead.city} — builds local presence`,
            comment: `Love the vibes here! 🔥 Always a great time at ${lead.entity_name}`,
        });
    }

    // Generic local targets
    const genericTargets = [
        { suffix: 'nightlife', comment: 'The scene here is unmatched 🔥' },
        { suffix: 'events', comment: 'This looks like an incredible event! 👏' },
        { suffix: 'music', comment: 'Great taste 🎵' },
        { suffix: 'foodie', comment: 'Need to check this place out! The vibes look right 🔥' },
        { suffix: 'venue', comment: 'Beautiful space! Would love to play here someday 🎧' },
    ];

    for (const gt of genericTargets) {
        targets.push({
            handle: `@${cities[0].toLowerCase().replace(/\s+/g, '')}${gt.suffix}`,
            reason: `Local ${gt.suffix} account — engagement boost`,
            comment: gt.comment,
        });
    }

    return targets;
}
