import { WeeklyReport, SocialPost } from '../../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Analytics Agent — The Coach
// Generates weekly reports with insights and recommendations.
// Accepts manually entered stats (no API in v1).
// ============================================================

export interface StatsInput {
    reach: number;
    impressions: number;
    saves: number;
    shares: number;
    comments: number;
    followerGrowth: number;
    profileVisits: number;
    linkClicks: number;
    topPostIds?: string[];
}

/**
 * Generate a weekly report from manually entered stats.
 * Compares to previous week if available.
 */
export function generateWeeklyReport(
    weekOf: string,
    stats: StatsInput,
    posts: SocialPost[],
    previousReport?: WeeklyReport | null,
): WeeklyReport {
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Compute engagement rate
    const totalEngagement = stats.saves + stats.shares + stats.comments;
    const engagementRate = stats.reach > 0 ? (totalEngagement / stats.reach * 100) : 0;

    // Week-over-week comparisons
    if (previousReport) {
        const prevEngagement = previousReport.saves + previousReport.shares + previousReport.comments;
        const prevRate = previousReport.reach > 0 ? (prevEngagement / previousReport.reach * 100) : 0;

        if (engagementRate > prevRate) {
            insights.push(`📈 Engagement rate up ${(engagementRate - prevRate).toFixed(1)}% vs last week (${engagementRate.toFixed(1)}% vs ${prevRate.toFixed(1)}%)`);
        } else if (engagementRate < prevRate) {
            insights.push(`📉 Engagement rate down ${(prevRate - engagementRate).toFixed(1)}% vs last week`);
            recommendations.push('Try more interactive content (polls, questions, "help me pick") to boost engagement');
        }

        if (stats.followerGrowth > previousReport.followerGrowth) {
            insights.push(`🚀 Follower growth accelerating: +${stats.followerGrowth} vs +${previousReport.followerGrowth} last week`);
        }

        if (stats.saves > previousReport.saves * 1.2) {
            insights.push(`📌 Save rate up significantly — your content has lasting value`);
        }

        if (stats.reach > previousReport.reach * 1.5) {
            insights.push(`🔥 Reach exploded — one or more posts likely hit the explore page`);
            recommendations.push('Double down on the type of content that went viral');
        }
    }

    // General insights based on current stats
    if (stats.saves > stats.shares) {
        insights.push('📌 Saves outperform shares — your audience treats your content as reference material');
        recommendations.push('Lean into educational and "save this" content (tips, track lists, event details)');
    } else if (stats.shares > stats.saves) {
        insights.push('📤 Shares outperform saves — your content has viral/social proof qualities');
        recommendations.push('Create more shareable content (crowd moments, reaction clips, collab posts)');
    }

    if (engagementRate > 5) {
        insights.push(`🎯 Engagement rate of ${engagementRate.toFixed(1)}% is excellent (industry avg is 1-3%)`);
    } else if (engagementRate < 1) {
        recommendations.push('Engagement is below average — try stronger hooks and clear CTAs in first 2 lines');
    }

    if (stats.linkClicks > 0 && stats.reach > 0) {
        const clickRate = (stats.linkClicks / stats.reach * 100);
        if (clickRate > 1) {
            insights.push(`🔗 Link click rate of ${clickRate.toFixed(1)}% is strong — your CTAs are working`);
        } else {
            recommendations.push('Consider stronger link CTAs — "DM me TICKETS" tends to outperform "link in bio"');
        }
    }

    if (stats.profileVisits > 0 && stats.followerGrowth > 0) {
        const conversionRate = (stats.followerGrowth / stats.profileVisits * 100);
        insights.push(`Profile → follower conversion: ${conversionRate.toFixed(1)}%`);
        if (conversionRate < 10) {
            recommendations.push('Optimize your bio — make it clear what you do and where you play');
        }
    }

    // Post type analysis
    const postsByType = groupBy(posts.filter(p => p.status === 'posted'), p => p.postType);
    if (postsByType.reel && postsByType.carousel) {
        insights.push(`Posted ${postsByType.reel.length} reels and ${postsByType.carousel.length} carousels this week`);
    }

    // Pillar analysis
    const postsByPillar = groupBy(posts.filter(p => p.status === 'posted'), p => p.pillar);
    const pillarNames = Object.keys(postsByPillar);
    if (pillarNames.length < 3) {
        recommendations.push(`Only used ${pillarNames.length} content pillars — try mixing in more variety next week`);
    }

    // Ensure we always have at least one insight + recommendation
    if (insights.length === 0) {
        insights.push(`Week of ${weekOf}: ${stats.reach.toLocaleString()} reach, ${totalEngagement} engagements, +${stats.followerGrowth} followers`);
    }
    if (recommendations.length === 0) {
        recommendations.push('Keep the current posting cadence — consistency is key to growth');
    }

    return {
        id: uuid(),
        weekOf,
        reach: stats.reach,
        impressions: stats.impressions,
        saves: stats.saves,
        shares: stats.shares,
        comments: stats.comments,
        followerGrowth: stats.followerGrowth,
        profileVisits: stats.profileVisits,
        linkClicks: stats.linkClicks,
        topPostIds: stats.topPostIds || [],
        insights,
        recommendations,
        createdAt: new Date().toISOString(),
    };
}

// ---- Helpers ----

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of arr) {
        const key = keyFn(item);
        if (!result[key]) result[key] = [];
        result[key].push(item);
    }
    return result;
}
