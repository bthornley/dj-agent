import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { parseInquiry, parseInquiryAI } from '@/lib/agent/intake';

// POST /api/intake — Parse inquiry text using AI (with regex fallback)
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { rawText } = await request.json();
        if (!rawText || typeof rawText !== 'string') {
            return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
        }

        // Try AI parsing first, fall back to regex
        const aiResult = await parseInquiryAI(rawText);
        const result = aiResult || parseInquiry(rawText);

        return NextResponse.json({
            ...result,
            method: aiResult ? 'ai' : 'template',
        });
    } catch (err) {
        console.error('Intake parsing error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Failed: ${message}` }, { status: 500 });
    }
}
