import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetFlyers, dbSaveFlyer, dbDeleteFlyer } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const VALID_STYLES = ['neon-club', 'elegant', 'retro', 'minimal', 'festival'];
const VALID_RATIOS = ['1:1', '9:16', '16:9'];

// GET /api/flyer — List user's flyers
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const flyers = await dbGetFlyers(userId);
    return NextResponse.json(flyers);
}

// POST /api/flyer — Create or update a flyer
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = rateLimit(`flyer:${userId}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();

    // Validate style preset
    if (body.style && !VALID_STYLES.includes(body.style)) {
        body.style = 'neon-club';
    }
    // Validate aspect ratio
    if (body.aspectRatio && !VALID_RATIOS.includes(body.aspectRatio)) {
        body.aspectRatio = '1:1';
    }
    // Cap string field lengths
    const maxLen = 10000;
    for (const key of Object.keys(body)) {
        if (typeof body[key] === 'string' && body[key].length > maxLen) {
            body[key] = body[key].substring(0, maxLen);
        }
    }

    const flyer = await dbSaveFlyer(userId, body);
    return NextResponse.json(flyer);
}

// DELETE /api/flyer — Delete a flyer
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await dbDeleteFlyer(id, userId);
    return NextResponse.json({ success: true });
}
