import { Event } from '../types';

// ============================================================
// Show Sheet Template — Day-of one-pager
// ============================================================

export function generateShowSheet(event: Partial<Event>): string {
    const clientName = event.clientName || '[Client]';
    const eventDate = event.date
        ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
        : '[TBD]';

    let doc = `# 📋 SHOW SHEET\n\n`;

    // Header
    doc += `| | |\n|---|---|\n`;
    doc += `| **Client** | ${clientName}${event.org ? ` (${event.org})` : ''} |\n`;
    doc += `| **Event** | ${(event.eventType || 'event').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} |\n`;
    doc += `| **Date** | ${eventDate} |\n`;
    doc += `| **Time** | ${event.startTime || '?'} — ${event.endTime || '?'} |\n`;
    doc += `| **Setup** | ${event.setupTime || '?'} |\n`;
    doc += `| **Strike** | ${event.strikeTime || 'After event'} |\n`;
    doc += `| **Crowd** | ~${event.attendanceEstimate || '???'} |\n`;
    doc += `| **Indoor/Outdoor** | ${event.indoorOutdoor || '?'} |\n`;
    doc += `\n`;

    // Venue & Access
    doc += `## 📍 Venue\n\n`;
    doc += `**${event.venueName || '[Venue TBD]'}**\n`;
    doc += `${event.address || '[Address TBD]'}\n\n`;
    if (event.loadInNotes) {
        doc += `**Load-in:** ${event.loadInNotes}\n\n`;
    }

    // Contacts
    doc += `## 📞 Contacts\n\n`;
    doc += `| Role | Name | Phone | Email |\n`;
    doc += `|------|------|-------|-------|\n`;
    doc += `| Client | ${clientName} | ${event.phone || '—'} | ${event.email || '—'} |\n`;
    doc += `| DJ | *You* | — | — |\n`;
    doc += `\n`;

    // Timeline (compact)
    doc += `## ⏱️ Timeline\n\n`;
    if (event.scheduleMoments && event.scheduleMoments.length > 0) {
        doc += `| Time | Cue |\n|------|-----|\n`;
        for (const m of event.scheduleMoments) {
            doc += `| ${m.time} | ${m.moment} |\n`;
        }
    } else {
        doc += `| Time | Cue |\n|------|-----|\n`;
        doc += `| ${event.setupTime || '?'} | Setup & sound check |\n`;
        doc += `| ${event.startTime || '?'} | Doors / guests arrive |\n`;
        doc += `| ${event.endTime || '?'} | Music ends |\n`;
    }
    doc += `\n`;

    // Gear summary
    doc += `## 🔊 Gear Summary\n\n`;
    if (event.inventoryRequired && event.inventoryRequired.length > 0) {
        for (const item of event.inventoryRequired) {
            doc += `- ${item.quantity}× ${item.itemId}${item.notes ? ` — ${item.notes}` : ''}\n`;
        }
    } else {
        doc += `*Gear list not yet finalized*\n`;
    }
    doc += `\n`;

    // Notes
    doc += `## 📝 Notes\n\n`;
    if (event.risks && event.risks.length > 0) {
        for (const r of event.risks) {
            doc += `- ⚠️ ${r}\n`;
        }
    }
    if (event.vibeDescription) {
        doc += `- **Vibe:** ${event.vibeDescription}\n`;
    }
    doc += `\n`;

    doc += `---\n`;
    doc += `> **⚠️ DRAFT — Awaiting Approval**\n`;

    return doc;
}
