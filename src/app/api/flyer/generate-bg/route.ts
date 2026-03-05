import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Style-to-prompt mapping for better AI results
const STYLE_PROMPTS: Record<string, string> = {
    'neon-club': 'neon lights, nightclub atmosphere, purple and pink glow, laser beams, dark moody lighting, DJ booth silhouette, smoke machine haze',
    'elegant': 'luxurious dark venue, gold and champagne tones, crystal chandelier bokeh, velvet curtains, sophisticated event space',
    'retro': 'retro 80s synthwave sunset, palm trees silhouette, orange and teal gradient sky, vintage VHS aesthetic, neon grid',
    'minimal': 'abstract dark geometric shapes, clean modern architecture, subtle gradient, minimalist dark background, architectural lines',
    'festival': 'outdoor music festival at sunset, colorful stage lights, crowd silhouette, confetti, vibrant sky, wide angle concert',
};

function buildPrompt(body: { style: string; eventType?: string; vibeWords?: string[]; headline?: string; customPrompt?: string }): string {
    const styleHint = STYLE_PROMPTS[body.style] || STYLE_PROMPTS['neon-club'];
    const parts: string[] = [
        'Create a stunning event flyer background image',
        styleHint,
    ];

    if (body.eventType && body.eventType !== 'other') {
        parts.push(`event type: ${body.eventType}`);
    }
    if (body.vibeWords?.length) {
        parts.push(`vibe: ${body.vibeWords.slice(0, 5).join(', ')}`);
    }
    if (body.customPrompt) {
        parts.push(body.customPrompt);
    }

    parts.push('no text or lettering on the image, background only, high quality, cinematic lighting, 4K resolution');

    return parts.join('. ');
}

// POST /api/flyer/generate-bg
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 3 AI generations per minute per user
    const rl = await rateLimit(`flyer-bg:${userId}`, 3, 60_000);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many AI generation requests. Please wait.' }, { status: 429 });
    }

    if (!OPENAI_API_KEY) {
        return NextResponse.json({
            error: 'AI background generation requires an OPENAI_API_KEY environment variable. Add it to your .env.local to enable this feature.',
        }, { status: 501 });
    }

    const body = await request.json();

    // Cap custom prompt length to prevent prompt injection abuse
    if (body.customPrompt && typeof body.customPrompt === 'string') {
        body.customPrompt = body.customPrompt.substring(0, 500);
    }

    const prompt = buildPrompt(body);
    const size = body.aspectRatio === '16:9' ? '1792x1024'
        : body.aspectRatio === '9:16' ? '1024x1792'
            : '1024x1024';

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt,
                n: 1,
                size,
                quality: 'standard',
                response_format: 'url',
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('DALL-E error:', err);
            return NextResponse.json({
                error: `OpenAI error: ${err?.error?.message || response.statusText}`,
            }, { status: response.status });
        }

        const data = await response.json();
        const imageUrl = data?.data?.[0]?.url;
        const revisedPrompt = data?.data?.[0]?.revised_prompt;

        if (!imageUrl) {
            return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        return NextResponse.json({
            url: imageUrl,
            prompt,
            revisedPrompt,
        });
    } catch (err) {
        console.error('AI generation error:', err);
        return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
}
