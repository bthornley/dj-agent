import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendOutreachEmail } from '@/lib/email';
import { dbSaveSentEmail } from '@/lib/db';
import { SentEmail } from '@/lib/types';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { safeErrorResponse } from '@/lib/security';

export async function POST(request: Request) {
    const { userId } = await auth();

    try {
        const { type, id, to, subject, body } = await request.json();

        if (!to || !subject || !body) {
            return safeErrorResponse('Missing to, subject, or body', 400);
        }

        // Send via Resend
        const result = await sendOutreachEmail({
            to,
            subject,
            body,
            replyTo: 'blake@giglift.com',
        });

        if (!result.success) {
            return safeErrorResponse(result.error || 'Send failed', 500);
        }

        // Log to sent_emails so it appears on /emails page
        if (userId) {
            const sentEmail: SentEmail = {
                id: uuid(),
                eventId: '',
                toEmail: to,
                subject,
                body,
                status: 'sent',
                resendId: result.resendId || '',
                sentAt: new Date().toISOString(),
            };
            await dbSaveSentEmail(sentEmail, userId);
        }

        // Update status in the agent-specific table
        const db = getDb();

        if (type === 'investor' && id) {
            await db.execute({
                sql: `UPDATE outreach_drafts SET status = 'sent' WHERE id = ?`,
                args: [id],
            });
        } else if (type === 'education' && id) {
            await db.execute({
                sql: `UPDATE school_outreach_log SET status = 'sent' WHERE id = ?`,
                args: [id],
            });
        }

        return NextResponse.json({
            success: true,
            resendId: result.resendId,
            message: `Email sent to ${to}`,
        });
    } catch (error) {
        console.error('[admin/send-email] Error:', error);
        return safeErrorResponse('Failed to send email', 500);
    }
}
