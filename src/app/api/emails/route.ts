import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetSentEmails } from '@/lib/db';

// GET /api/emails — Get all sent emails for the current user
export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await dbGetSentEmails(userId);
        return NextResponse.json(result);
    } catch (err) {
        console.error('[emails] Error:', err);
        return NextResponse.json({ error: 'Failed to fetch sent emails' }, { status: 500 });
    }
}
