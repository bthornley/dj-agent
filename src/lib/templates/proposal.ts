import { Event, Proposal } from '../types';

// ============================================================
// Proposal Template
// ============================================================

const DEFAULT_PROPOSAL: Proposal = {
    packages: [
        {
            name: 'Standard Package',
            price: 1200,
            description: 'Professional DJ services for your event',
            includes: [
                'Professional DJ for up to 4 hours',
                'Full PA system (2 tops + 2 subs)',
                '1 wired microphone for announcements',
                'Music consultation & custom playlist',
                'Setup and teardown',
                'Backup equipment on-site',
            ],
        },
        {
            name: 'Premium Package',
            price: 2000,
            description: 'The complete experience with lighting and extras',
            includes: [
                'Everything in Standard Package',
                'Up to 6 hours of DJ services',
                '4 LED uplights (customizable colors)',
                '2 moving head lights',
                'Fog machine for dance floor effect',
                '2 wired microphones',
                'MC services for announcements & introductions',
                'Extended music consultation',
            ],
        },
    ],
    addOns: [
        { name: 'Additional hour of DJ services', price: 200 },
        { name: 'Extra LED uplight (each)', price: 50 },
        { name: 'Ceremony sound system (separate setup)', price: 350 },
        { name: 'Custom monogram / gobo projection', price: 250 },
    ],
    depositPercent: 50,
    depositTerms:
        'A 50% non-refundable deposit is required to secure your date. The remaining balance is due on the day of the event.',
    cancellationPolicy:
        'Cancellations made 30+ days before the event: deposit forfeited. Cancellations within 30 days: full payment due. Rescheduling is available at no charge with 14+ days notice, subject to availability.',
    powerRequirements:
        'We require access to at least one (1) dedicated 20-amp circuit within 50 feet of the DJ setup area. Outdoor events may require a generator (not included).',
    clientResponsibilities: [
        'Provide a sturdy, level table (6 ft minimum) for DJ equipment',
        'Ensure adequate power access near the DJ setup area',
        'Designate a point-of-contact available on the day of the event',
        'Communicate any venue-specific sound restrictions or curfews',
        'Provide covered area for equipment in case of outdoor events',
    ],
};

function calculateSmartPricing(event: Partial<Event>) {
    let basePrice = 800; // Baseline fallback

    if (event.eventType === 'wedding' || event.eventType === 'corporate') {
        basePrice += 400;
    } else if (event.eventType === 'charity' || event.eventType === 'birthday') {
        basePrice += 100;
    }

    if (event.attendanceEstimate) {
        if (event.attendanceEstimate > 300) {
            basePrice *= 1.5;
        } else if (event.attendanceEstimate > 150) {
            basePrice *= 1.25;
        } else if (event.attendanceEstimate < 50) {
            basePrice *= 0.9;
        }
    }

    if (event.budgetRange) {
        const matches = event.budgetRange.replace(/,/g, '').match(/\d+/g);
        if (matches && matches.length > 0) {
            const lowEnd = parseInt(matches[0], 10);
            if (basePrice < lowEnd) {
                basePrice = lowEnd * 0.9; // Anchor standard package slightly below their lowest budget
            }
        }
    }

    basePrice = Math.round(basePrice / 50) * 50;
    return {
        standardPrice: basePrice,
        premiumPrice: Math.round((basePrice * 1.6) / 50) * 50
    };
}

export function generateProposal(event: Partial<Event>): string {
    const p = DEFAULT_PROPOSAL;
    const clientName = event.clientName || 'Valued Client';
    const eventDate = event.date
        ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : '[Date TBD]';
    const venue = event.venueName || '[Venue TBD]';
    const eventType = event.eventType
        ? event.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Event';

    let doc = `# DJ Services Proposal\n\n`;
    doc += `**Prepared for:** ${clientName}${event.org ? ` — ${event.org}` : ''}\n`;
    doc += `**Event:** ${eventType}\n`;
    doc += `**Date:** ${eventDate}\n`;
    doc += `**Venue:** ${venue}\n`;
    doc += `**Estimated Attendance:** ${event.attendanceEstimate || '[TBD]'}\n\n`;
    doc += `---\n\n`;

    const pricing = calculateSmartPricing(event);
    const packages = [
        { ...p.packages[0], price: pricing.standardPrice },
        { ...p.packages[1], price: pricing.premiumPrice }
    ];

    // Packages
    doc += `## Package Options (Smart Pricing Applied ✨)\n\n`;
    for (const pkg of packages) {
        doc += `### ${pkg.name} — $${pkg.price.toLocaleString()}\n`;
        doc += `*${pkg.description}*\n\n`;
        for (const item of pkg.includes) {
            doc += `- ${item}\n`;
        }
        doc += `\n`;
    }

    // Add-ons
    doc += `## Add-Ons\n\n`;
    doc += `| Service | Price |\n|---|---|\n`;
    for (const a of p.addOns) {
        doc += `| ${a.name} | $${a.price} |\n`;
    }
    doc += `\n`;

    // Terms
    doc += `## Payment Terms\n\n`;
    doc += `${p.depositTerms}\n\n`;

    doc += `## Cancellation Policy\n\n`;
    doc += `${p.cancellationPolicy}\n\n`;

    doc += `## Power Requirements\n\n`;
    doc += `${p.powerRequirements}\n\n`;

    doc += `## Client Responsibilities\n\n`;
    for (const r of p.clientResponsibilities) {
        doc += `- ${r}\n`;
    }
    doc += `\n`;

    doc += `---\n\n`;
    doc += `> **⚠️ DRAFT — Awaiting Approval**\n`;
    doc += `> *Assumptions may apply. Please review all details before confirming.*\n`;

    return doc;
}
