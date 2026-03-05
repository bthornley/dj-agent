import { SentEmail } from '../types';
import { getDb, clampPageSize, PaginationOptions, PaginatedResult } from './connection';

// ---- Sent Emails ----

export async function dbSaveSentEmail(email: SentEmail, userId: string): Promise<void> {
    const db = getDb();
    await db.execute({
        sql: `INSERT INTO sent_emails (id, user_id, event_id, to_email, subject, body, status, resend_id, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [email.id, userId, email.eventId || '', email.toEmail, email.subject, email.body, email.status, email.resendId || '', email.sentAt],
    });
}

export async function dbGetSentEmails(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<SentEmail>> {
    const db = getDb();
    const limit = clampPageSize(pagination?.limit);
    const offset = pagination?.offset ?? 0;

    const [countResult, result] = await Promise.all([
        db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sent_emails WHERE user_id = ?', args: [userId] }),
        db.execute({ sql: `SELECT * FROM sent_emails WHERE user_id = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?`, args: [userId, limit, offset] }),
    ]);
    const total = Number(countResult.rows[0]?.cnt ?? 0);
    const data = result.rows.map(r => ({
        id: r.id as string,
        eventId: r.event_id as string,
        toEmail: r.to_email as string,
        subject: r.subject as string,
        body: r.body as string,
        status: r.status as 'sent' | 'failed',
        resendId: r.resend_id as string,
        sentAt: r.sent_at as string,
    }));
    return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function dbGetSentEmail(id: string, userId: string): Promise<SentEmail | null> {
    const db = getDb();
    const result = await db.execute({ sql: `SELECT * FROM sent_emails WHERE id = ? AND user_id = ?`, args: [id, userId] });
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
        id: r.id as string,
        eventId: r.event_id as string,
        toEmail: r.to_email as string,
        subject: r.subject as string,
        body: r.body as string,
        status: r.status as 'sent' | 'failed',
        resendId: r.resend_id as string,
        sentAt: r.sent_at as string,
    };
}

// ============================================================
// Email Templates
// ============================================================

export interface EmailTemplate {
    id: string;
    userId: string;
    name: string;
    subject: string;
    bodyTemplate: string;
    createdAt: string;
    updatedAt: string;
}

const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Cold Intro',
        subject: 'DJ Services Inquiry — {{venue}}',
        bodyTemplate: `Hi {{contact}},

I came across {{venue}}{{city}} and love what you're doing. I'm a professional DJ specializing in open-format sets and I'd love to chat about bringing live DJ entertainment to your events.

I can bring my own sound and lighting, and I'm flexible on formats — from background vibes to high-energy sets.

Would you be open to a quick call or meeting? I'd be happy to send over my EPK and some sample mixes.

Looking forward to connecting!

Best,
[Your Name]`,
    },
    {
        name: 'Follow-Up',
        subject: 'Following up — DJ for {{venue}}',
        bodyTemplate: `Hi {{contact}},

I wanted to circle back on my earlier message about DJing at {{venue}}. I know things get busy, so no worries if it slipped through!

I'm still very interested in bringing some great energy to your upcoming events. Happy to work around your schedule for a quick chat.

Let me know if there's a better time or person to connect with!

Best,
[Your Name]`,
    },
    {
        name: 'Thank You',
        subject: 'Thanks for the opportunity — {{venue}}',
        bodyTemplate: `Hi {{contact}},

Just wanted to say thanks for the opportunity to play at {{venue}}! I had a great time and the crowd was amazing.

I'd love to make this a regular thing if you're open to it. Let me know if you have any upcoming dates that need a DJ.

Thanks again!

Best,
[Your Name]`,
    },
];

function mapTemplateRow(r: Record<string, unknown>): EmailTemplate {
    return {
        id: r.id as string,
        userId: r.user_id as string,
        name: r.name as string,
        subject: r.subject as string,
        bodyTemplate: r.body_template as string,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

export async function dbGetEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    const db = getDb();
    const result = await db.execute({ sql: `SELECT * FROM email_templates WHERE user_id = ? ORDER BY created_at ASC`, args: [userId] });

    // Seed defaults on first access
    if (result.rows.length === 0) {
        for (const tpl of DEFAULT_TEMPLATES) {
            const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await db.execute({
                sql: `INSERT INTO email_templates (id, user_id, name, subject, body_template) VALUES (?, ?, ?, ?, ?)`,
                args: [id, userId, tpl.name, tpl.subject, tpl.bodyTemplate],
            });
        }
        const seeded = await db.execute({ sql: `SELECT * FROM email_templates WHERE user_id = ? ORDER BY created_at ASC`, args: [userId] });
        return seeded.rows.map(mapTemplateRow);
    }

    return result.rows.map(mapTemplateRow);
}

export async function dbSaveEmailTemplate(userId: string, template: { id?: string; name: string; subject: string; bodyTemplate: string }): Promise<EmailTemplate> {
    const db = getDb();
    const id = template.id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (template.id) {
        await db.execute({
            sql: `UPDATE email_templates SET name = ?, subject = ?, body_template = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
            args: [template.name, template.subject, template.bodyTemplate, id, userId],
        });
    } else {
        await db.execute({
            sql: `INSERT INTO email_templates (id, user_id, name, subject, body_template) VALUES (?, ?, ?, ?, ?)`,
            args: [id, userId, template.name, template.subject, template.bodyTemplate],
        });
    }

    const result = await db.execute({ sql: `SELECT * FROM email_templates WHERE id = ?`, args: [id] });
    return mapTemplateRow(result.rows[0]);
}

export async function dbDeleteEmailTemplate(id: string, userId: string): Promise<void> {
    const db = getDb();
    await db.execute({ sql: `DELETE FROM email_templates WHERE id = ? AND user_id = ?`, args: [id, userId] });
}
