import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { sendUserGuideEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const guard = await requireAdmin();
        if (guard instanceof NextResponse) return guard;

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
