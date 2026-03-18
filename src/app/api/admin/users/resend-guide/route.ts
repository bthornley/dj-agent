import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { sendUserGuideEmail } from '@/lib/email';

const ResendGuideSchema = z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userId = session.userId;
        const role = (session.sessionClaims?.metadata as any)?.role;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const parsed = ResendGuideSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request data', details: parsed.error.issues }, { status: 400 });
        }

        const { email, firstName } = parsed.data;

        await sendUserGuideEmail({
            to: email,
            firstName: firstName || 'there',
        });

        return NextResponse.json({ success: true, message: `User guide sent to ${email}` });
    } catch (error: any) {
        console.error('[API] Error in resend-guide:', error);
        return NextResponse.json({ error: 'Failed to send user guide' }, { status: 500 });
    }
}
