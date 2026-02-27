import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetEPKConfig, dbSaveEPKConfig, dbGetBrandProfile } from '@/lib/db';
import { generateBioVariants, generateTaglineVariants, getDefaultEPKConfig } from '@/lib/agent/epk-writer';
import { EPKConfig } from '@/lib/types';

// GET /api/epk/builder — Get user's EPK config (or defaults)
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const [config, brand] = await Promise.all([
            dbGetEPKConfig(userId),
            dbGetBrandProfile(userId).catch(() => null),
        ]);

        if (config) {
            return NextResponse.json({ config, isNew: false });
        }

        // Return defaults based on brand profile
        const defaults = getDefaultEPKConfig(brand);
        return NextResponse.json({ config: defaults, isNew: true });
    } catch (err) {
        console.error('EPK builder GET error:', err);
        return NextResponse.json({ error: 'Failed to load EPK config' }, { status: 500 });
    }
}

// PUT /api/epk/builder — Save EPK config
export async function PUT(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const config: EPKConfig = await request.json();
        await dbSaveEPKConfig(config, userId);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('EPK builder PUT error:', err);
        return NextResponse.json({ error: 'Failed to save EPK config' }, { status: 500 });
    }
}

// POST /api/epk/builder — Generate AI content (bio/tagline variants)
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { type } = await request.json(); // 'bio' | 'tagline'
        const brand = await dbGetBrandProfile(userId);
        if (!brand) {
            return NextResponse.json({ error: 'Set up your brand profile first' }, { status: 400 });
        }

        if (type === 'bio') {
            return NextResponse.json({ variants: generateBioVariants(brand) });
        } else if (type === 'tagline') {
            return NextResponse.json({ variants: generateTaglineVariants(brand) });
        } else {
            return NextResponse.json({ error: 'Invalid type — use "bio" or "tagline"' }, { status: 400 });
        }
    } catch (err) {
        console.error('EPK builder POST error:', err);
        return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }
}
