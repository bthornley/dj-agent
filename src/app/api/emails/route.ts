import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetSentEmails } from '@/lib/db';
import { safeErrorResponse } from '@/lib/security';

// GET /api/emails — Get all sent emails for the current user
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!) : undefined;
        const offset = searchParams.has('offset') ? parseInt(searchParams.get('offset')!) : undefined;

        const result = await dbGetSentEmails(userId, { limit, offset });
        return NextResponse.json(result);
    } catch (err) {
        console.error('[emails] Error:', err);
        return safeErrorResponse('Failed to fetch sent emails', 500);
    }
}
