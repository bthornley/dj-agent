import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendUserGuideEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userId = session.userId;
        const role = (session.sessionClaims?.metadata as { role?: string })?.role;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));

        if (!body.email || typeof body.email !== 'string') {
            return NextResponse.json({ error: 'Invalid request data', details: 'Email is required' }, { status: 400 });
        }

        const email = body.email;
        const firstName = typeof body.firstName === 'string' ? body.firstName : 'there';

        await sendUserGuideEmail({
            to: email,
            firstName: firstName,
        });

        return NextResponse.json({ success: true, message: `User guide sent to ${email}` });
    } catch (error: unknown) {
        console.error('[API] Error in resend-guide:', error);
        return NextResponse.json({ error: 'Failed to send user guide' }, { status: 500 });
    }
}
