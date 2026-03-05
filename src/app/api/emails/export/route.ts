import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetSentEmails } from '@/lib/db';

// GET /api/emails/export — CSV export of sent emails
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await dbGetSentEmails(userId);
    const emails = result.data;

    const headers = ['sent_at', 'to', 'subject', 'status', 'resend_id', 'event_id'];
    const rows = emails.map(email => {
        const vals: Record<string, string> = {
            sent_at: email.sentAt,
            to: email.toEmail,
            subject: email.subject,
            status: email.status,
            resend_id: email.resendId || '',
            event_id: email.eventId || '',
        };
        return headers.map(h => {
            const val = vals[h] || '';
            if (val.includes(',') || val.includes('\n') || val.includes('"')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="giglift-emails-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
    });
}
