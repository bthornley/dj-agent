import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendOutreachEmail } from '@/lib/email';
import { dbSaveSentEmail, dbGetEvent, dbSaveEvent } from '@/lib/db';
import { SentEmail } from '@/lib/types';
import { v4 as uuid } from 'uuid';
import { safeErrorResponse } from '@/lib/security';

// POST /api/emails/send — Send an outreach email draft
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { eventId, to, subject, emailBody, replyTo } = body;

        if (!to || !subject || !emailBody) {
            return safeErrorResponse('Missing required fields: to, subject, emailBody', 400);
        }

        // Send via Resend
        const result = await sendOutreachEmail({
            to,
            subject,
            body: emailBody,
            replyTo: replyTo || to,
        });

        // Save to DB
        const sentEmail: SentEmail = {
            id: uuid(),
            eventId: eventId || '',
            toEmail: to,
            subject,
            body: emailBody,
            status: result.success ? 'sent' : 'failed',
            resendId: result.resendId || '',
            sentAt: new Date().toISOString(),
        };
        await dbSaveSentEmail(sentEmail, userId);

        // Update event deliverable status to 'sent' if linked
        if (eventId && result.success) {
            try {
                const event = await dbGetEvent(eventId, userId);
                if (event && event.deliverables) {
                    const updated = {
                        ...event,
                        deliverables: event.deliverables.map(d =>
                            d.type === 'email_draft' ? { ...d, status: 'sent' as const } : d
                        ),
                    };
                    await dbSaveEvent(updated, userId);
                }
            } catch (err) {
                console.error('[emails/send] Failed to update event deliverable:', err);
            }
        }

        if (!result.success) {
            return safeErrorResponse(result.error || 'Send failed', 500);
        }

        return NextResponse.json({ success: true, emailId: sentEmail.id, resendId: result.resendId });
    } catch (err) {
        console.error('[emails/send] Error:', err);
        return safeErrorResponse('Failed to send email', 500);
    }
}
