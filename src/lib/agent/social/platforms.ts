import { SocialPost, ConnectedAccount } from '../../types';

// ============================================================
// Platform Publishing Service
// Handles creating draft/unpublished posts on connected platforms.
//
// Instagram: Uses Meta Graph API 2-step flow (create container,
//   hold at container stage = unpublished draft)
// Facebook: Uses Graph API to create unpublished page posts
// TikTok: Uses Content Posting API inbox/draft mode
// ============================================================

export interface PublishResult {
    success: boolean;
    platform: string;
    externalId: string;      // container ID (IG), post ID (FB), or publish_id (TikTok)
    status: 'draft_created' | 'published' | 'error';
    message: string;
    url: string;             // link to the draft/post if available
}

// ---- Instagram (Meta Graph API) ----

/**
 * Create an unpublished media container on Instagram.
 * This creates the content server-side without publishing it.
 * The user can then publish from the IG app or via a follow-up API call.
 */
export async function createInstagramDraft(
    post: SocialPost,
    account: ConnectedAccount,
): Promise<PublishResult> {
    if (!account.accessToken || !account.pageId) {
        return { success: false, platform: 'instagram', externalId: '', status: 'error', message: 'Missing access token or Instagram Business Account ID', url: '' };
    }

    try {
        // Step 1: Create media container (without publishing)
        const caption = buildCaption(post);
        const params = new URLSearchParams({
            caption,
            access_token: account.accessToken,
        });

        // If there's a media URL, include it (image_url for images)
        if (post.mediaRefs.length > 0 && post.mediaRefs[0].startsWith('http')) {
            params.set('image_url', post.mediaRefs[0]);
        }

        const containerRes = await fetch(
            `https://graph.facebook.com/v21.0/${account.pageId}/media`,
            { method: 'POST', body: params }
        );
        const containerData = await containerRes.json();

        if (containerData.error) {
            return {
                success: false,
                platform: 'instagram',
                externalId: '',
                status: 'error',
                message: `IG API Error: ${containerData.error.message}`,
                url: '',
            };
        }

        // Container created but NOT published — this is our "draft"
        return {
            success: true,
            platform: 'instagram',
            externalId: containerData.id,
            status: 'draft_created',
            message: `Instagram media container created (ID: ${containerData.id}). Ready to publish when you choose.`,
            url: `https://www.instagram.com/${account.handle}/`,
        };
    } catch (err) {
        return {
            success: false,
            platform: 'instagram',
            externalId: '',
            status: 'error',
            message: `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
            url: '',
        };
    }
}

// ---- Facebook (Graph API) ----

/**
 * Create an unpublished post on a Facebook Page.
 * Uses published=false to create draft.
 */
export async function createFacebookDraft(
    post: SocialPost,
    account: ConnectedAccount,
): Promise<PublishResult> {
    if (!account.accessToken || !account.pageId) {
        return { success: false, platform: 'facebook', externalId: '', status: 'error', message: 'Missing access token or Page ID', url: '' };
    }

    try {
        const caption = buildCaption(post);
        const params: Record<string, string> = {
            message: caption,
            published: 'false',  // Creates as unpublished/draft
            access_token: account.accessToken,
        };

        // Add link if present in media refs
        const linkRef = post.mediaRefs.find(r => r.startsWith('http'));
        if (linkRef) params.link = linkRef;

        const res = await fetch(
            `https://graph.facebook.com/v21.0/${account.pageId}/feed`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            }
        );
        const data = await res.json();

        if (data.error) {
            return {
                success: false,
                platform: 'facebook',
                externalId: '',
                status: 'error',
                message: `FB API Error: ${data.error.message}`,
                url: '',
            };
        }

        return {
            success: true,
            platform: 'facebook',
            externalId: data.id,
            status: 'draft_created',
            message: `Facebook draft post created (ID: ${data.id}). Find it in Publishing Tools on your Page.`,
            url: `https://www.facebook.com/${account.pageId}/publishing_tools/`,
        };
    } catch (err) {
        return {
            success: false,
            platform: 'facebook',
            externalId: '',
            status: 'error',
            message: `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
            url: '',
        };
    }
}

// ---- TikTok (Content Posting API) ----

/**
 * Create a draft post on TikTok using inbox/draft mode.
 * Requires a video URL — TikTok doesn't support image-only posts.
 */
export async function createTikTokDraft(
    post: SocialPost,
    account: ConnectedAccount,
): Promise<PublishResult> {
    if (!account.accessToken) {
        return { success: false, platform: 'tiktok', externalId: '', status: 'error', message: 'Missing TikTok access token', url: '' };
    }

    // TikTok requires video content
    const videoUrl = post.mediaRefs.find(r => r.startsWith('http') && /\.(mp4|mov|webm)/i.test(r));

    try {
        // Step 1: Initialize upload
        const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${account.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_info: {
                    title: post.hookText || post.caption.slice(0, 150),
                    privacy_level: 'SELF_ONLY',  // Draft = private initially
                    disable_comment: false,
                    disable_duet: false,
                    disable_stitch: false,
                },
                source_info: videoUrl ? {
                    source: 'PULL_FROM_URL',
                    video_url: videoUrl,
                } : undefined,
            }),
        });

        const initData = await initRes.json();

        if (initData.error?.code) {
            return {
                success: false,
                platform: 'tiktok',
                externalId: '',
                status: 'error',
                message: `TikTok API Error: ${initData.error.message || initData.error.code}`,
                url: '',
            };
        }

        return {
            success: true,
            platform: 'tiktok',
            externalId: initData.data?.publish_id || '',
            status: 'draft_created',
            message: videoUrl
                ? `TikTok draft created. Check your TikTok inbox to review and publish.`
                : `TikTok draft initialized. Upload a video through the TikTok app to complete.`,
            url: `https://www.tiktok.com/@${account.handle}`,
        };
    } catch (err) {
        return {
            success: false,
            platform: 'tiktok',
            externalId: '',
            status: 'error',
            message: `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
            url: '',
        };
    }
}

// ---- Dispatcher ----

/**
 * Push an approved post as a draft to the specified platform.
 */
export async function pushDraftToplatform(
    post: SocialPost,
    account: ConnectedAccount,
): Promise<PublishResult> {
    switch (account.platform) {
        case 'instagram':
            return createInstagramDraft(post, account);
        case 'facebook':
            return createFacebookDraft(post, account);
        case 'tiktok':
            return createTikTokDraft(post, account);
        default:
            return { success: false, platform: account.platform, externalId: '', status: 'error', message: `Unknown platform: ${account.platform}`, url: '' };
    }
}

/**
 * Push to all connected platforms for this post.
 */
export async function pushDraftToAllPlatforms(
    post: SocialPost,
    accounts: ConnectedAccount[],
): Promise<PublishResult[]> {
    const connected = accounts.filter(a => a.connected && a.accessToken);

    // Filter by post's target platform
    const targets = connected.filter(a => {
        if (post.platform === 'both') return a.platform === 'instagram' || a.platform === 'facebook';
        return a.platform === post.platform;
    });

    if (targets.length === 0) {
        return [{ success: false, platform: post.platform, externalId: '', status: 'error', message: 'No connected accounts for this platform', url: '' }];
    }

    return Promise.all(targets.map(account => pushDraftToplatform(post, account)));
}

// ---- Helpers ----

function buildCaption(post: SocialPost): string {
    let caption = post.caption || post.hookText || '';
    if (post.hashtags.length > 0) {
        caption += '\n\n' + post.hashtags.join(' ');
    }
    return caption;
}
