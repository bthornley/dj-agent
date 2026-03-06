import { NextResponse } from 'next/server';
import { sendOutreachEmail } from '@/lib/email';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { type, id, to, subject, body } = await request.json();

        if (!to || !subject || !body) {
            return NextResponse.json({ error: 'Missing to, subject, or body' }, { status: 400 });
        }

        // Send via Resend
        const result = await sendOutreachEmail({
            to,
            subject,
            body,
            replyTo: 'blake@giglift.com',
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Send failed' }, { status: 500 });
        }

        // Update status in the appropriate table
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
        return NextResponse.json({
            error: 'Failed to send email',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
