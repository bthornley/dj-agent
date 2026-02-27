import { SocialPost, EngagementTask, BrandProfile, Event } from '../../types';

// ============================================================
// Social Guardrails — Safety checks for all social content
// ============================================================

export interface SocialGuardrailResult {
    passed: boolean;
    warnings: string[];
    blockers: string[];
}

/**
 * Check a social post against all guardrails.
 */
export function checkPostGuardrails(
    post: SocialPost,
    brand: BrandProfile | null,
    confirmedEvents: Event[],
): SocialGuardrailResult {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // 1) Never invent gigs — if post references an event, verify it exists
    if (post.eventId) {
        const eventExists = confirmedEvents.some(e => e.id === post.eventId);
        if (!eventExists) {
            blockers.push(`Post references event ID "${post.eventId}" which doesn't exist in your confirmed events. Never invent gigs.`);
        }
    }

    // 2) Check event details in caption match actual event
    if (post.eventId && post.caption) {
        const event = confirmedEvents.find(e => e.id === post.eventId);
        if (event) {
            // Check for date mentions that don't match
            if (event.date && post.caption.includes('/') && !post.caption.includes(event.date)) {
                warnings.push('Caption may contain a date that doesn\'t match the event. Double-check dates before posting.');
            }
        }
    }

    // 3) Check post timing — no posting between 1 AM and 6 AM
    if (post.scheduledFor) {
        try {
            const scheduled = new Date(post.scheduledFor);
            const hour = scheduled.getHours();
            if (hour >= 1 && hour < 6) {
                warnings.push(`Post scheduled for ${hour}:${String(scheduled.getMinutes()).padStart(2, '0')} AM — not ideal. Best times are 11 AM–1 PM or 7–9 PM.`);
            }
        } catch { /* skip */ }
    }

    // 4) Hashtag count
    if (post.hashtags.length > 15) {
        warnings.push(`${post.hashtags.length} hashtags — consider trimming to 6–15 to avoid looking spammy.`);
    }
    if (post.hashtags.length > 0 && post.hashtags.length < 3) {
        warnings.push('Only using 1-2 hashtags — add at least 3–6 for discoverability.');
    }

    // 5) Check against brand boundaries
    if (brand) {
        const captionLower = post.caption.toLowerCase();

        // Avoided topics
        for (const topic of brand.avoidTopics) {
            if (captionLower.includes(topic.toLowerCase())) {
                blockers.push(`Caption contains "${topic}" which is in your avoid list. Remove or rephrase.`);
            }
        }

        // Profanity check
        if (brand.profanityLevel === 'none') {
            const profanity = /\b(shit|fuck|damn|ass|bitch|hell|crap)\b/i;
            if (profanity.test(post.caption) || profanity.test(post.hookText)) {
                blockers.push('Caption contains profanity but your brand profile is set to "none". Clean it up.');
            }
        }

        // Politics check
        if (!brand.politicsAllowed) {
            const political = /\b(democrat|republican|trump|biden|vote|election|congress|liberal|conservative|political)\b/i;
            if (political.test(post.caption)) {
                blockers.push('Caption contains political references but your brand profile has politics disabled.');
            }
        }
    }

    // 6) Caption length checks
    if (post.caption.length > 2200) {
        warnings.push('Caption exceeds Instagram\'s 2,200 character limit. Trim it down.');
    }
    if (post.hookText.length > 125) {
        warnings.push('Hook text is long — only the first ~125 characters show before "more". Keep it punchy.');
    }

    // 7) Empty content check
    if (!post.hookText && !post.caption) {
        blockers.push('Post has no hook or caption. Fill in content before approving.');
    }

    return {
        passed: blockers.length === 0,
        warnings,
        blockers,
    };
}

/**
 * Check an engagement task against guardrails.
 */
export function checkEngagementGuardrails(
    task: EngagementTask,
): SocialGuardrailResult {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // 1) Booking/money DMs always need approval
    const moneyKeywords = /book|rate|price|cost|quote|fee|deposit|payment|invoice/i;
    if (moneyKeywords.test(task.draftReply) || moneyKeywords.test(task.context)) {
        if (!task.requiresApproval) {
            blockers.push('This message involves booking/money topics but isn\'t flagged for approval. Set requiresApproval to true.');
        }
    }

    // 2) No aggressive auto-DMs to strangers
    if (task.type === 'reply_dm' && !task.context.includes('responded to')) {
        warnings.push('Unsolicited DM — make sure this is a genuine connection, not spam.');
    }

    // 3) Draft reply shouldn't be empty
    if (!task.draftReply.trim()) {
        blockers.push('Reply draft is empty. Add a response before sending.');
    }

    // 4) No follow/unfollow spam patterns
    if (task.draftReply.toLowerCase().includes('follow for follow') ||
        task.draftReply.toLowerCase().includes('f4f')) {
        blockers.push('Follow-for-follow is spam. Remove this language.');
    }

    return {
        passed: blockers.length === 0,
        warnings,
        blockers,
    };
}
