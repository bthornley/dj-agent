import { Event, Deliverable, DeliverableType } from '../types';
import { generateProposal } from '../templates/proposal';
import { generateRunOfShow } from '../templates/runOfShow';
import { generateShowSheet } from '../templates/showSheet';
import { generateGearChecklist } from '../templates/gearChecklist';

// ============================================================
// Tool Layer — Generate documents, draft emails, save to CRM
// ============================================================

/**
 * Generate a document from a template.
 */
export function createDoc(
    type: DeliverableType,
    event: Partial<Event>
): Deliverable {
    let content = '';

    switch (type) {
        case 'proposal':
            content = generateProposal(event);
            break;
        case 'run_of_show':
            content = generateRunOfShow(event);
            break;
        case 'show_sheet':
            content = generateShowSheet(event);
            break;
        case 'gear_checklist':
            content = generateGearChecklist(event);
            break;
        case 'email_draft':
            content = generateEmailDraft(event);
            break;
    }

    return {
        type,
        content,
        status: 'draft',
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Generate a client email draft.
 * NEVER auto-sends — always returns draft for review.
 */
export function generateEmailDraft(event: Partial<Event>): string {
    const client = event.clientName || 'there';
    const eventType = event.eventType
        ? event.eventType.replace(/_/g, ' ')
        : 'event';
    const eventDate = event.date
        ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        : 'your upcoming event';
    const venue = event.venueName || 'your venue';

    let email = `**To:** ${event.email || '[client email]'}\n`;
    email += `**Subject:** DJ Services — ${eventType} on ${event.date || '[date]'}\n\n`;
    email += `---\n\n`;

    email += `Hi ${client},\n\n`;
    email += `Thanks for reaching out about DJ services for your ${eventType}`;
    email += event.date ? ` on ${eventDate}` : '';
    email += event.venueName ? ` at ${venue}` : '';
    email += `! I'd love to be part of it.\n\n`;

    // Include questions if there are missing fields
    if (event.questions && event.questions.length > 0) {
        email += `To put together the best proposal, I have a few quick questions:\n\n`;
        for (let i = 0; i < event.questions.length; i++) {
            email += `${i + 1}. ${event.questions[i]}\n`;
        }
        email += `\n`;
    }

    email += `I've attached a preliminary proposal with package options for your review. `;
    email += `Once I have the details above, I can finalize the timeline and gear plan.\n\n`;

    email += `Looking forward to hearing from you!\n\n`;
    email += `Best,\n`;
    email += `[Your Name]\n`;
    email += `[Your Phone]\n\n`;

    email += `---\n`;
    email += `> **⚠️ DRAFT — Do not send without reviewing**\n`;

    return email;
}

/**
 * Save event to CRM (localStorage for v1).
 */
export function saveToCRM(event: Event): { success: boolean; id: string } {
    if (typeof window !== 'undefined') {
        try {
            const key = 'stagescout-events';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const idx = existing.findIndex((e: Event) => e.id === event.id);
            if (idx >= 0) {
                existing[idx] = event;
            } else {
                existing.push(event);
            }
            localStorage.setItem(key, JSON.stringify(existing));
            return { success: true, id: event.id };
        } catch {
            return { success: false, id: event.id };
        }
    }
    return { success: true, id: event.id };
}
