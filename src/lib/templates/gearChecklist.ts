import { Event } from '../types';
import { DEFAULT_INVENTORY } from '../inventory';

// ============================================================
// Gear Checklist Template
// ============================================================

interface GearLine {
    category: string;
    items: { name: string; qty: number; packed: boolean; notes: string }[];
}

function buildChecklist(event: Partial<Event>): GearLine[] {
    const attendance = event.attendanceEstimate || 100;
    const isOutdoor = event.indoorOutdoor === 'outdoor' || event.indoorOutdoor === 'both';

    // Decide what gear is needed based on event size and type
    const lines: GearLine[] = [];

    // Speakers — always bring tops; subs for 75+ guests
    const speakerItems = [
        { name: 'Powered Top Speaker (L)', qty: 1, packed: false, notes: '' },
        { name: 'Powered Top Speaker (R)', qty: 1, packed: false, notes: '' },
    ];
    if (attendance >= 75) {
        speakerItems.push(
            { name: 'Powered Subwoofer (L)', qty: 1, packed: false, notes: '' },
            { name: 'Powered Subwoofer (R)', qty: 1, packed: false, notes: '' },
        );
    }
    lines.push({ category: '🔊 Sound', items: speakerItems });

    // Mixer
    lines.push({
        category: '🎛️ Controller',
        items: [{ name: 'DJ Controller + Mixer', qty: 1, packed: false, notes: '' }],
    });

    // Mics — at least 1, 2 for weddings/corporate
    const micCount =
        event.eventType === 'wedding' || event.eventType === 'corporate' ? 2 : 1;
    lines.push({
        category: '🎤 Microphones',
        items: [
            { name: 'Wired Dynamic Microphone', qty: micCount, packed: false, notes: 'Wireless NOT available' },
        ],
    });

    // Stands
    const standItems = [
        { name: 'Speaker Stand', qty: attendance >= 75 ? 4 : 2, packed: false, notes: '' },
        { name: 'Mic Stand (boom)', qty: micCount, packed: false, notes: '' },
    ];
    lines.push({ category: '🪜 Stands', items: standItems });

    // Cables
    lines.push({
        category: '🔌 Cables & Power',
        items: [
            { name: 'XLR Cable (25 ft)', qty: 4, packed: false, notes: '' },
            { name: 'Power Cable + Extension (50 ft)', qty: 3, packed: false, notes: isOutdoor ? 'Extra length for outdoor' : '' },
        ],
    });

    // Lighting (premium events or 100+ guests)
    if (attendance >= 100 || event.eventType === 'wedding') {
        const lightItems = [
            { name: 'LED Uplight', qty: 4, packed: false, notes: 'RGBW, battery' },
            { name: 'Moving Head Light', qty: 2, packed: false, notes: '' },
            { name: 'Lighting Stand', qty: 2, packed: false, notes: '' },
            { name: 'Fog Machine', qty: 1, packed: false, notes: 'Check venue policy' },
        ];
        lines.push({ category: '💡 Lighting & Effects', items: lightItems });
    }

    // Backups — always
    lines.push({
        category: '🛟 Backups',
        items: [
            { name: 'Spare Cable Kit', qty: 1, packed: false, notes: '' },
            { name: 'Backup Microphone', qty: 1, packed: false, notes: '' },
            { name: 'Backup Laptop', qty: 1, packed: false, notes: '' },
        ],
    });

    // Validate against inventory
    for (const line of lines) {
        for (const item of line.items) {
            const inv = DEFAULT_INVENTORY.find((i) => i.name === item.name);
            if (!inv) {
                item.notes = '⚠️ NOT IN INVENTORY';
            } else if (item.qty > inv.quantity) {
                item.notes = `⚠️ Only ${inv.quantity} available`;
            }
        }
    }

    return lines;
}

export function generateGearChecklist(event: Partial<Event>): string {
    const lines = buildChecklist(event);
    const clientName = event.clientName || 'Client';
    const eventDate = event.date
        ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        })
        : '[TBD]';

    let doc = `# 📦 Equipment Checklist\n\n`;
    doc += `**Event:** ${clientName} — ${eventDate}\n`;
    doc += `**Venue:** ${event.venueName || '[TBD]'}\n`;
    doc += `**Crowd:** ~${event.attendanceEstimate || '???'}\n\n`;
    doc += `---\n\n`;

    // Load order note
    doc += `> **Load Order:** Pack in reverse order of setup — backups first (bottom), `;
    doc += `cables & stands next, then speakers & subs on top for easy access.\n\n`;

    for (const line of lines) {
        doc += `### ${line.category}\n\n`;
        doc += `| ✓ | Item | Qty | Notes |\n`;
        doc += `|---|------|-----|-------|\n`;
        for (const item of line.items) {
            doc += `| ☐ | ${item.name} | ${item.qty} | ${item.notes} |\n`;
        }
        doc += `\n`;
    }

    doc += `---\n\n`;
    doc += `> **⚠️ DRAFT — Awaiting Approval**\n`;
    doc += `> *Gear list auto-generated based on event size and type. Review before packing.*\n`;

    return doc;
}
