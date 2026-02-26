import { Event, ScheduleMoment } from '../types';

// ============================================================
// Run of Show Template
// ============================================================

/**
 * Default timeline skeleton — the agent will merge client-supplied
 * moments into this structure.
 */
function defaultMoments(event: Partial<Event>): ScheduleMoment[] {
    const setup = event.setupTime || '3:00 PM';
    const doors = event.startTime || '5:00 PM';
    const end = event.endTime || '11:00 PM';

    const moments: ScheduleMoment[] = [
        { time: setup, moment: '🔧 Load-In & Setup', notes: 'Arrive, unload, build PA & lights, sound-check' },
        { time: addMinutes(setup, 90), moment: '🎤 Sound Check Complete', notes: 'Test mics, levels, walk the room' },
        { time: addMinutes(doors, -15), moment: '🎵 Pre-Event Music', notes: 'Background / cocktail hour playlist' },
        { time: doors, moment: '🚪 Doors Open / Guests Arrive', notes: '' },
    ];

    // Merge in any client moments
    if (event.scheduleMoments && event.scheduleMoments.length > 0) {
        for (const m of event.scheduleMoments) {
            moments.push(m);
        }
    }

    // Default event milestones
    if (!event.scheduleMoments || event.scheduleMoments.length === 0) {
        moments.push(
            { time: addMinutes(doors, 60), moment: '🍽️ Dinner / Main Program', notes: 'Lower music, DJ in background' },
            { time: addMinutes(doors, 120), moment: '💬 Speeches / Toasts', notes: 'Mic handoff, adjust levels' },
            { time: addMinutes(doors, 150), moment: '🎶 Open Dance Floor', notes: 'Transition to dance set' },
            { time: addMinutes(end, -30), moment: '🎵 Last Song Announcement', notes: 'Give crowd a heads-up' },
            { time: addMinutes(end, -5), moment: '🎤 Final Song', notes: '' },
        );
    }

    moments.push(
        { time: end, moment: '🔇 Music Ends', notes: 'Thank audience, begin pack-down' },
        { time: addMinutes(end, 15), moment: '📦 Strike / Teardown', notes: 'Pack gear, clear stage area' },
    );

    // Sort by time
    moments.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

    return moments;
}

export function generateRunOfShow(event: Partial<Event>): string {
    const moments = defaultMoments(event);
    const clientName = event.clientName || 'Client';
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

    let doc = `# Run of Show\n\n`;
    doc += `**Event:** ${clientName} — ${eventType}\n`;
    doc += `**Date:** ${eventDate}\n`;
    doc += `**Venue:** ${venue}\n`;
    doc += `**Crowd:** ~${event.attendanceEstimate || '???'} guests\n\n`;
    doc += `---\n\n`;

    doc += `| Time | Cue | Notes |\n`;
    doc += `|------|-----|-------|\n`;
    for (const m of moments) {
        doc += `| ${m.time} | ${m.moment} | ${m.notes} |\n`;
    }

    doc += `\n---\n\n`;
    doc += `> **⚠️ DRAFT — Awaiting Approval**\n`;
    doc += `> *Times are estimates. Confirm with venue coordinator and client.*\n`;

    return doc;
}

// ---- helpers ----

function timeToMin(t: string): number {
    const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = (match[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
}

function addMinutes(t: string, mins: number): string {
    const total = timeToMin(t) + mins;
    const h24 = Math.floor(total / 60) % 24;
    const m = total % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
