import { createClient, Client } from '@libsql/client';
import { randomUUID as uuid } from 'crypto';

// ============================================================
// Instagram Brand Agent — @gigliftapp Account Management
// Auto-generates, schedules, and publishes branded content
// to the GigLift company Instagram account via Meta Graph API.
// ============================================================

let _db: Client | null = null;
function getDb(): Client {
    if (!_db) {
        _db = createClient({
            url: process.env.TURSO_DATABASE_URL || 'file:data/giglift.db',
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    }
    return _db;
}

let _migrated = false;
async function ensureIGSchema(): Promise<Client> {
    const db = getDb();
    if (!_migrated) {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS ig_brand_posts (
                id TEXT PRIMARY KEY,
                caption TEXT NOT NULL,
                hashtags TEXT DEFAULT '',
                media_url TEXT DEFAULT '',
                media_type TEXT DEFAULT 'image',
                pillar TEXT DEFAULT 'product',
                status TEXT DEFAULT 'draft',
                scheduled_for TEXT DEFAULT '',
                published_at TEXT DEFAULT '',
                ig_media_id TEXT DEFAULT '',
                ig_permalink TEXT DEFAULT '',
                reach INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                saves INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS ig_brand_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
        _migrated = true;
    }
    return db;
}

// ── Types ──

export interface IGPost {
    id: string;
    caption: string;
    hashtags: string;
    media_url: string;
    media_type: 'image' | 'carousel' | 'video';
    pillar: string;
    status: 'draft' | 'approved' | 'scheduled' | 'published' | 'failed';
    scheduled_for: string;
    published_at: string;
    ig_media_id: string;
    ig_permalink: string;
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    created_at: string;
}

export interface IGAgentReport {
    posts_generated: number;
    posts_published: number;
    posts_failed: number;
    analytics_updated: number;
    queue_size: number;
    next_scheduled: string | null;
}

// ── Content Pillars & Templates ──

const CONTENT_PILLARS = [
    { pillar: 'product', weight: 25, label: 'Product Features' },
    { pillar: 'educational', weight: 30, label: 'Tips & Education' },
    { pillar: 'community', weight: 20, label: 'Community & Artists' },
    { pillar: 'bts', weight: 15, label: 'Behind the Scenes' },
    { pillar: 'promo', weight: 10, label: 'Promotional' },
];

const POST_TEMPLATES: Array<{ pillar: string; caption: string; hashtags: string }> = [
    // Product
    {
        pillar: 'product',
        caption: "🤖 Your AI agents never sleep.\n\nGigLift's Lead Scout is scanning venues, clubs, and events 24/7 — finding opportunities you'd never find manually.\n\nSet your region. Add keywords. Let AI do the rest.\n\nStart free → link in bio 🔗",
        hashtags: '#GigLift #MusicTech #AIforMusicians #LeadGeneration #DJLife',
    },
    {
        pillar: 'product',
        caption: "✍️ Cold outreach that doesn't feel cold.\n\nGigLift's Outreach Writer generates 3 personalized email variants per lead — using real data from the venue's website.\n\nNo more copy-paste templates. Every email is unique.\n\nTry it free → link in bio 🔗",
        hashtags: '#GigLift #MusicBusiness #ColdOutreach #BookMoreGigs #DJBookings',
    },
    {
        pillar: 'product',
        caption: "📱 Your Social Hype agent just generated next week's content plan.\n\n• 3 Reels\n• 2 Carousels  \n• 4 Stories\n• 1 Live session\n\nAll captions written. All hashtags optimized. All you do is post.\n\nYour AI content team → link in bio 🔗",
        hashtags: '#GigLift #SocialMediaStrategy #ContentPlanning #MusicMarketing #AITools',
    },
    {
        pillar: 'product',
        caption: "🎨 AI-powered flyer creator.\n\nDrop in your event details. DALL·E generates a custom background. Add your logo + QR code.\n\nDownload in seconds. No design skills needed.\n\nFree with every account 🔗",
        hashtags: '#GigLift #FlyerDesign #EventPromotion #DJFlyer #AIArt',
    },
    // Educational
    {
        pillar: 'educational',
        caption: "📊 How to score your leads (and why it matters):\n\n🟢 P1 (Hot) — Contact info + events + good fit\n🟡 P2 (Warm) — Some data, needs research\n🟠 P3 (Cool) — Potential, limited info\n🔴 P4 (Cold) — Low relevance\n\nGigLift scores every lead 0-100 automatically so you focus on what's most likely to book.\n\nWork smarter, not harder. 💡",
        hashtags: '#MusicBusiness #LeadScoring #DJTips #GigLift #BookMoreGigs',
    },
    {
        pillar: 'educational',
        caption: "5 things every musician's EPK needs:\n\n1️⃣ Professional bio (AI writes it for you)\n2️⃣ High-quality photos & video\n3️⃣ Upcoming + past events\n4️⃣ Social links & contact info\n5️⃣ A shareable URL (not a PDF!)\n\nGigLift's EPK Builder creates all of this in minutes.\n\nFree → link in bio 🔗",
        hashtags: '#EPK #MusicCareer #DJTips #GigLift #PressKit',
    },
    {
        pillar: 'educational',
        caption: "Stop doing this in booking emails ❌\n\n❌ \"Hey I'm a DJ looking for gigs\"\n❌ Sending the same email to every venue\n❌ No personalization\n❌ No follow-up\n\nDo this instead ✅\n\n✅ Reference their venue by name\n✅ Mention specific events they host\n✅ Explain your unique value\n✅ Include your EPK link\n\nGigLift does all of this automatically.",
        hashtags: '#DJTips #MusicBusiness #ColdEmail #BookMoreGigs #GigLift',
    },
    {
        pillar: 'educational',
        caption: "The 4 discovery modes every musician should know:\n\n🎤 Performer — Venues, events, residencies\n🎓 Instructor — Music schools, workshops\n🎙 Studio — Recording, session work\n🌎 Touring — Multi-city venue discovery\n\nSwitch modes anytime. Your AI agents adapt instantly.\n\nWhich mode are you? 👇",
        hashtags: '#MusicCareer #DJLife #IndieArtist #GigLift #MusicTech',
    },
    // Community
    {
        pillar: 'community',
        caption: "🎤 ARTIST SPOTLIGHT ✨\n\nWe're building GigLift for musicians like YOU.\n\nDJ, band, solo artist, instructor — if you're grinding to book gigs, we want to hear your story.\n\nDM us:\n• Your name & genre\n• Biggest booking challenge\n• Link to your music\n\nWe'll feature you on our page. 🔥",
        hashtags: '#ArtistSpotlight #MusicCommunity #IndieArtist #DJLife #GigLift',
    },
    {
        pillar: 'community',
        caption: "Quick poll for musicians 🎵\n\nWhat's your BIGGEST challenge right now?\n\nA) Finding new venues to play\nB) Getting responses to cold outreach\nC) Managing bookings & calendar\nD) Growing on social media\n\nDrop your letter below 👇",
        hashtags: '#MusicianLife #DJLife #GigEconomy #GigLift #MusicPoll',
    },
    // Behind the Scenes
    {
        pillar: 'bts',
        caption: "🛠 What we shipped this week:\n\n✅ AI lead scoring improvements\n✅ New OWASP-compliant security headers\n✅ Magic-byte file upload validation\n✅ Rate limiting on all write endpoints\n✅ Updated content planner\n\nBuilding in public. Shipping for musicians.\n\nWhat should we build next? 👇",
        hashtags: '#BuildInPublic #StartupLife #MusicTech #GigLift #SaaS',
    },
    {
        pillar: 'bts',
        caption: "Why we built GigLift 🎵\n\nAs musicians ourselves, we know the grind:\n• Hours searching Google for venues\n• Copy-pasting the same cold email\n• Losing track of who you contacted\n• No time to actually make music\n\nSo we built an AI team that handles the business side.\n\n7 agents. 4 modes. One mission:\nLift your gigs to the next level. 🚀",
        hashtags: '#FounderStory #MusicTech #GigLift #BuildInPublic #Startup',
    },
    // Promo
    {
        pillar: 'promo',
        caption: "🚀 GigLift is LIVE.\n\nAI-powered gig discovery for musicians.\n\n🔍 Lead Scout finds venues automatically\n✍️ Outreach Writer drafts personalized emails\n📱 Social Hype plans your content\n📊 Analytics tracks your growth\n\nFree to start. No credit card required.\n\nLink in bio 🔗",
        hashtags: '#GigLift #MusicTech #AIforMusicians #LaunchDay #GigEconomy',
    },
    {
        pillar: 'promo',
        caption: "What you get FREE on GigLift:\n\n✅ 5 scans per month\n✅ 25 lead storage\n✅ Basic EPK page\n✅ Calendar view\n✅ 3 AI flyer backgrounds/mo\n\nUpgrade to Pro ($33/mo) for:\n🚀 50 auto-scans\n🚀 Unlimited leads\n🚀 AI outreach\n🚀 Full Social Suite\n\nStart free → link in bio 🔗",
        hashtags: '#GigLift #FreeTrial #MusicTech #DJTools #MusicBusiness',
    },
];

// ── Config Helpers ──

async function getConfig(key: string): Promise<string | null> {
    const db = await ensureIGSchema();
    const result = await db.execute({ sql: 'SELECT value FROM ig_brand_config WHERE key = ?', args: [key] });
    return result.rows.length > 0 ? String(result.rows[0].value) : null;
}

async function setConfig(key: string, value: string): Promise<void> {
    const db = await ensureIGSchema();
    await db.execute({
        sql: `INSERT INTO ig_brand_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [key, value],
    });
}

// ── Content Generation ──

function pickPillar(): string {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const p of CONTENT_PILLARS) {
        cumulative += p.weight;
        if (rand <= cumulative) return p.pillar;
    }
    return 'product';
}

async function getRecentPillars(limit: number = 5): Promise<string[]> {
    const db = await ensureIGSchema();
    const result = await db.execute({
        sql: 'SELECT pillar FROM ig_brand_posts ORDER BY created_at DESC LIMIT ?',
        args: [limit],
    });
    return result.rows.map(r => String(r.pillar));
}

export async function generatePosts(count: number = 3): Promise<IGPost[]> {
    const db = await ensureIGSchema();
    const recentPillars = await getRecentPillars(5);
    const generated: IGPost[] = [];

    // Find templates not recently used
    const usedCaptions = await db.execute({
        sql: `SELECT caption FROM ig_brand_posts ORDER BY created_at DESC LIMIT 20`,
        args: [],
    });
    const recentCaptions = new Set(usedCaptions.rows.map(r => String(r.caption).substring(0, 50)));

    for (let i = 0; i < count; i++) {
        // Pick pillar, avoiding repeats
        let pillar = pickPillar();
        let attempts = 0;
        while (recentPillars.filter(p => p === pillar).length >= 2 && attempts < 5) {
            pillar = pickPillar();
            attempts++;
        }

        // Find a template for this pillar that hasn't been used recently
        const templates = POST_TEMPLATES.filter(t => t.pillar === pillar);
        const available = templates.filter(t => !recentCaptions.has(t.caption.substring(0, 50)));
        const template = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : templates[Math.floor(Math.random() * templates.length)];

        const now = new Date().toISOString();
        const post: IGPost = {
            id: uuid(),
            caption: template.caption,
            hashtags: template.hashtags,
            media_url: '',
            media_type: 'image',
            pillar,
            status: 'draft',
            scheduled_for: '',
            published_at: '',
            ig_media_id: '',
            ig_permalink: '',
            reach: 0,
            impressions: 0,
            likes: 0,
            comments: 0,
            saves: 0,
            shares: 0,
            created_at: now,
        };

        await db.execute({
            sql: `INSERT INTO ig_brand_posts (id, caption, hashtags, media_url, media_type, pillar, status, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [post.id, post.caption, post.hashtags, post.media_url, post.media_type, post.pillar, post.status, now, now],
        });

        generated.push(post);
        recentPillars.push(pillar);
    }

    return generated;
}

// ── Meta Graph API — Publishing ──

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

async function getAccessToken(): Promise<string | null> {
    return process.env.META_PAGE_ACCESS_TOKEN || await getConfig('access_token');
}

async function getIGUserId(): Promise<string | null> {
    return process.env.META_IG_USER_ID || await getConfig('ig_user_id');
}

export async function publishToInstagram(post: IGPost): Promise<{ success: boolean; ig_media_id?: string; permalink?: string; error?: string }> {
    const accessToken = await getAccessToken();
    const igUserId = await getIGUserId();

    if (!accessToken || !igUserId) {
        return { success: false, error: 'Meta API credentials not configured. Set META_PAGE_ACCESS_TOKEN and META_IG_USER_ID.' };
    }

    if (!post.media_url) {
        return { success: false, error: 'No media_url set. Instagram requires an image to publish.' };
    }

    const fullCaption = post.caption + (post.hashtags ? `\n\n${post.hashtags}` : '');

    try {
        // Step 1: Create container
        const containerResponse = await fetch(`${META_GRAPH_URL}/${igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: post.media_url,
                caption: fullCaption,
                access_token: accessToken,
            }),
        });

        if (!containerResponse.ok) {
            const err = await containerResponse.json();
            return { success: false, error: `Container creation failed: ${JSON.stringify(err)}` };
        }

        const container = await containerResponse.json() as { id: string };

        // Step 2: Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 3: Publish container
        const publishResponse = await fetch(`${META_GRAPH_URL}/${igUserId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: container.id,
                access_token: accessToken,
            }),
        });

        if (!publishResponse.ok) {
            const err = await publishResponse.json();
            return { success: false, error: `Publish failed: ${JSON.stringify(err)}` };
        }

        const published = await publishResponse.json() as { id: string };

        // Step 4: Get permalink
        let permalink = '';
        try {
            const mediaResponse = await fetch(
                `${META_GRAPH_URL}/${published.id}?fields=permalink&access_token=${accessToken}`
            );
            if (mediaResponse.ok) {
                const media = await mediaResponse.json() as { permalink: string };
                permalink = media.permalink || '';
            }
        } catch { /* permalink is optional */ }

        // Update DB
        const db = await ensureIGSchema();
        const now = new Date().toISOString();
        await db.execute({
            sql: `UPDATE ig_brand_posts SET status = 'published', ig_media_id = ?, ig_permalink = ?, published_at = ?, updated_at = ? WHERE id = ?`,
            args: [published.id, permalink, now, now, post.id],
        });

        return { success: true, ig_media_id: published.id, permalink };

    } catch (err) {
        console.error('[ig-agent] Publish error:', err);
        const db = await ensureIGSchema();
        await db.execute({
            sql: `UPDATE ig_brand_posts SET status = 'failed', updated_at = datetime('now') WHERE id = ?`,
            args: [post.id],
        });
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

// ── Publish Scheduled Posts ──

export async function publishScheduledPosts(): Promise<{ published: number; failed: number }> {
    const db = await ensureIGSchema();
    const now = new Date().toISOString();

    // Find posts that are scheduled and due
    const result = await db.execute({
        sql: `SELECT * FROM ig_brand_posts WHERE status = 'scheduled' AND scheduled_for <= ? AND scheduled_for != ''`,
        args: [now],
    });

    let published = 0;
    let failed = 0;

    for (const row of result.rows) {
        const post: IGPost = {
            id: String(row.id),
            caption: String(row.caption),
            hashtags: String(row.hashtags),
            media_url: String(row.media_url),
            media_type: String(row.media_type) as IGPost['media_type'],
            pillar: String(row.pillar),
            status: 'scheduled',
            scheduled_for: String(row.scheduled_for),
            published_at: '',
            ig_media_id: '',
            ig_permalink: '',
            reach: 0,
            impressions: 0,
            likes: 0,
            comments: 0,
            saves: 0,
            shares: 0,
            created_at: String(row.created_at),
        };

        const result = await publishToInstagram(post);
        if (result.success) {
            published++;
            console.log(`[ig-agent] Published: ${post.id} → ${result.permalink}`);
        } else {
            failed++;
            console.error(`[ig-agent] Failed to publish ${post.id}: ${result.error}`);
        }
    }

    return { published, failed };
}

// ── Analytics Collection ──

export async function collectAnalytics(): Promise<number> {
    const accessToken = await getAccessToken();
    if (!accessToken) return 0;

    const db = await ensureIGSchema();
    // Get published posts with IG media IDs
    const posts = await db.execute({
        sql: `SELECT id, ig_media_id FROM ig_brand_posts WHERE status = 'published' AND ig_media_id != '' ORDER BY published_at DESC LIMIT 25`,
        args: [],
    });

    let updated = 0;
    for (const row of posts.rows) {
        const igMediaId = String(row.ig_media_id);
        const postId = String(row.id);

        try {
            const response = await fetch(
                `${META_GRAPH_URL}/${igMediaId}/insights?metric=reach,impressions,likes,comments,saved,shares&access_token=${accessToken}`
            );

            if (!response.ok) continue;

            const data = await response.json() as { data: Array<{ name: string; values: Array<{ value: number }> }> };
            const metrics: Record<string, number> = {};
            for (const metric of data.data || []) {
                metrics[metric.name] = metric.values?.[0]?.value || 0;
            }

            await db.execute({
                sql: `UPDATE ig_brand_posts SET reach = ?, impressions = ?, likes = ?, comments = ?, saves = ?, shares = ?, updated_at = datetime('now') WHERE id = ?`,
                args: [
                    metrics.reach || 0,
                    metrics.impressions || 0,
                    metrics.likes || 0,
                    metrics.comments || 0,
                    metrics.saved || 0,
                    metrics.shares || 0,
                    postId,
                ],
            });
            updated++;
        } catch (err) {
            console.error(`[ig-agent] Analytics fetch failed for ${igMediaId}:`, err);
        }
    }

    return updated;
}

// ── Token Refresh ──

export async function refreshAccessToken(): Promise<boolean> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const currentToken = await getAccessToken();

    if (!appId || !appSecret || !currentToken) return false;

    try {
        const response = await fetch(
            `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`
        );

        if (!response.ok) return false;

        const data = await response.json() as { access_token: string };
        if (data.access_token) {
            await setConfig('access_token', data.access_token);
            await setConfig('token_refreshed_at', new Date().toISOString());
            console.log('[ig-agent] Access token refreshed successfully');
            return true;
        }
    } catch (err) {
        console.error('[ig-agent] Token refresh failed:', err);
    }

    return false;
}

// ── Queue Management ──

export async function getPostQueue(status?: string, limit: number = 20): Promise<IGPost[]> {
    const db = await ensureIGSchema();
    let sql = 'SELECT * FROM ig_brand_posts';
    const args: (string | number)[] = [];

    if (status) {
        sql += ' WHERE status = ?';
        args.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    args.push(limit);

    const result = await db.execute({ sql, args });
    return result.rows.map(row => ({
        id: String(row.id),
        caption: String(row.caption),
        hashtags: String(row.hashtags),
        media_url: String(row.media_url),
        media_type: String(row.media_type) as IGPost['media_type'],
        pillar: String(row.pillar),
        status: String(row.status) as IGPost['status'],
        scheduled_for: String(row.scheduled_for || ''),
        published_at: String(row.published_at || ''),
        ig_media_id: String(row.ig_media_id || ''),
        ig_permalink: String(row.ig_permalink || ''),
        reach: Number(row.reach || 0),
        impressions: Number(row.impressions || 0),
        likes: Number(row.likes || 0),
        comments: Number(row.comments || 0),
        saves: Number(row.saves || 0),
        shares: Number(row.shares || 0),
        created_at: String(row.created_at),
    }));
}

export async function updatePost(id: string, updates: Partial<Pick<IGPost, 'caption' | 'hashtags' | 'media_url' | 'status' | 'scheduled_for'>>): Promise<void> {
    const db = await ensureIGSchema();
    const sets: string[] = [];
    const args: (string | number)[] = [];

    if (updates.caption !== undefined) { sets.push('caption = ?'); args.push(updates.caption); }
    if (updates.hashtags !== undefined) { sets.push('hashtags = ?'); args.push(updates.hashtags); }
    if (updates.media_url !== undefined) { sets.push('media_url = ?'); args.push(updates.media_url); }
    if (updates.status !== undefined) { sets.push('status = ?'); args.push(updates.status); }
    if (updates.scheduled_for !== undefined) { sets.push('scheduled_for = ?'); args.push(updates.scheduled_for); }
    sets.push("updated_at = datetime('now')");

    if (sets.length > 1) {
        args.push(id);
        await db.execute({
            sql: `UPDATE ig_brand_posts SET ${sets.join(', ')} WHERE id = ?`,
            args,
        });
    }
}

export async function deletePost(id: string): Promise<void> {
    const db = await ensureIGSchema();
    await db.execute({ sql: 'DELETE FROM ig_brand_posts WHERE id = ? AND status != ?', args: [id, 'published'] });
}

// ── Main Agent Entrypoint ──

export async function runInstagramAgent(): Promise<IGAgentReport> {
    console.log('[ig-agent] Starting Instagram brand agent run...');

    // 1. Refresh token if needed (every 50 days)
    const lastRefresh = await getConfig('token_refreshed_at');
    if (lastRefresh) {
        const daysSinceRefresh = (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceRefresh > 50) {
            await refreshAccessToken();
        }
    }

    // 2. Generate new posts (keep 5 drafts in queue)
    const drafts = await getPostQueue('draft');
    let postsGenerated = 0;
    if (drafts.length < 5) {
        const needed = 5 - drafts.length;
        const generated = await generatePosts(needed);
        postsGenerated = generated.length;
        console.log(`[ig-agent] Generated ${postsGenerated} new draft posts`);
    }

    // 3. Publish scheduled posts
    const { published: postsPublished, failed: postsFailed } = await publishScheduledPosts();
    if (postsPublished > 0) {
        console.log(`[ig-agent] Published ${postsPublished} posts`);
    }

    // 4. Collect analytics on published posts
    const analyticsUpdated = await collectAnalytics();
    if (analyticsUpdated > 0) {
        console.log(`[ig-agent] Updated analytics for ${analyticsUpdated} posts`);
    }

    // 5. Get queue stats
    const queue = await getPostQueue();
    const scheduled = queue.filter(p => p.status === 'scheduled');
    const nextScheduled = scheduled.length > 0
        ? scheduled.sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))[0].scheduled_for
        : null;

    const report: IGAgentReport = {
        posts_generated: postsGenerated,
        posts_published: postsPublished,
        posts_failed: postsFailed,
        analytics_updated: analyticsUpdated,
        queue_size: queue.length,
        next_scheduled: nextScheduled,
    };

    console.log('[ig-agent] Run complete:', report);
    return report;
}
