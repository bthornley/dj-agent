import { Event, IntakeResult, ScheduleMoment, EventType } from '../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Intake Module — Parse raw inquiry text into structured Event
// ============================================================
// Works in "demo mode" — no LLM required. Uses keyword/regex
// extraction. If an OpenAI key is provided, the API route
// can enhance this with function-calling.
// ============================================================

const MUST_HAVE_FIELDS = [
    { field: 'date', label: 'Exact event date + start/end times (and when you can load in)' },
    { field: 'address', label: 'Venue address + load-in details (stairs/elevator/parking)' },
    { field: 'attendanceEstimate', label: 'Estimated attendance and whether it\'s indoors or outdoors' },
    { field: 'micNeeds', label: 'Mic needs: how many and for what (speeches, announcements)' },
    { field: 'power', label: 'Power: dedicated circuit available? Any sound limits?' },
] as const;

export function parseInquiry(rawText: string): IntakeResult {
    const text = rawText.trim();
    const event: Partial<Event> = {
        id: uuid(),
        status: 'inquiry',
        rawInquiry: text,
        scheduleMoments: [],
        deliverables: [],
        inventoryRequired: [],
        risks: [],
        questions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // ---- Extract fields ----

    // Client name — case-insensitive triggers, but capture only Capitalized Names
    const namePatterns = [
        /(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i,
        /(?:name|client|contact)\s*[:\-–]\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
    ];
    for (const pat of namePatterns) {
        const m = text.match(pat);
        if (m && m[1]) {
            // Filter out common stop words that might get captured
            const name = m[1].replace(/\s+(and|or|i'm|for|from|at|the)\s*$/i, '').trim();
            if (name) { event.clientName = name; break; }
        }
    }

    // Organization
    const orgPatterns = [
        /(?:org|organization|company|business)\s*[:\-–]\s*([A-Za-z0-9\s&]+?)(?:\n|,|\.)/i,
        /(?:party|event|gala|fundraiser)\s+for\s+([A-Z][A-Za-z0-9\s&]+?)(?:\n|,|\.)/i,
    ];
    for (const pat of orgPatterns) {
        const m = text.match(pat);
        if (m) { event.org = m[1].trim(); break; }
    }

    // Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) event.email = emailMatch[0];

    // Phone
    const phoneMatch = text.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch) event.phone = phoneMatch[0];

    // Date
    const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
        /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
    ];
    for (const pat of datePatterns) {
        const m = text.match(pat);
        if (m) {
            try {
                const d = new Date(m[0]);
                if (!isNaN(d.getTime())) {
                    event.date = d.toISOString().split('T')[0];
                    break;
                }
            } catch { /* skip */ }
        }
    }

    // Times — try context-aware extraction first
    const setupMatch = text.match(/(?:setup|load[- ]?in|arrive)\s*(?:at|by|:)?\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    const startMatch = text.match(/(?:start|begin|doors|Time)\s*[:\-–]?\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    const endMatch = text.match(/(?:end|finish|until|to|-)\s*(?:at)?\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

    if (setupMatch) event.setupTime = setupMatch[1];
    if (startMatch) event.startTime = startMatch[1];
    if (endMatch) event.endTime = endMatch[1];

    // Fallback: look for "TIME: X - Y" or "X - Y" patterns
    if (!event.startTime || !event.endTime) {
        const rangeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (rangeMatch) {
            event.startTime = event.startTime || rangeMatch[1];
            event.endTime = event.endTime || rangeMatch[2];
        }
    }

    // Fallback: setup at X
    if (!event.setupTime) {
        const parenSetup = text.match(/\(setup\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:AM|PM))\)/i);
        if (parenSetup) event.setupTime = parenSetup[1];
    }

    // Venue — use specific patterns, avoid "at" being too greedy
    const venuePatterns = [
        /(?:venue|location|place)\s*[:\-–]\s*([^\n,]+)/i,
        /(?:at|@)\s+(?:the\s+)?([A-Z][A-Za-z'\s]+(?:Ballroom|Hall|Center|Centre|Hotel|Club|Estate|Gardens?|Ranch|Barn|Winery|Brewery|Restaurant|Venue|Room|Space|Lodge))/i,
        /(?:at|@)\s+((?:The\s+)?[A-Z][A-Za-z'\s]{2,30}),\s*\d/i,
    ];
    for (const pat of venuePatterns) {
        const m = text.match(pat);
        if (m) { event.venueName = m[1].trim(); break; }
    }

    // Address
    const addrMatch = text.match(/\d+\s+[A-Za-z]+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Pkwy|Circle|Trail)[.\s,]*[A-Za-z\s]*,?\s*[A-Z]{2}\s*\d{5}/i);
    if (addrMatch) event.address = addrMatch[0].trim();

    // Attendance
    const attendMatch = text.match(/(\d{2,4})\s*(?:people|guests|attendees|pax|crowd)/i);
    if (attendMatch) event.attendanceEstimate = parseInt(attendMatch[1]);
    if (!event.attendanceEstimate) {
        const numMatch = text.match(/(?:about|around|~|approx)\s*(\d{2,4})/i);
        if (numMatch) event.attendanceEstimate = parseInt(numMatch[1]);
    }

    // Event type
    const typeMap: Record<string, EventType> = {
        wedding: 'wedding',
        corporate: 'corporate',
        charity: 'charity',
        birthday: 'birthday',
        'after party': 'after_party',
        afterparty: 'after_party',
        concert: 'concert',
        festival: 'festival',
        gala: 'corporate',
        fundraiser: 'charity',
        reception: 'wedding',
        'golf': 'charity',
    };
    const lower = text.toLowerCase();
    for (const [keyword, type] of Object.entries(typeMap)) {
        if (lower.includes(keyword)) {
            event.eventType = type;
            break;
        }
    }

    // Indoor/Outdoor
    if (/outdoor|outside|tent|garden|patio/i.test(text)) {
        event.indoorOutdoor = 'outdoor';
    } else if (/indoor|inside|ballroom|hall|room/i.test(text)) {
        event.indoorOutdoor = 'indoor';
    }

    // Vibe
    const vibeMatch = text.match(/(?:vibe|style|mood|theme|feel)\s*[:\-–]?\s*([^\n.]+)/i);
    if (vibeMatch) event.vibeDescription = vibeMatch[1].trim();

    // Budget
    const budgetMatch = text.match(/\$[\d,]+(?:\s*[-–to]+\s*\$[\d,]+)?/);
    if (budgetMatch) event.budgetRange = budgetMatch[0];

    // Load-in notes
    const loadMatch = text.match(/(?:load[- ]?in|access|parking|elevator|stairs)\s*[:\-–]?\s*([^\n]+)/i);
    if (loadMatch) event.loadInNotes = loadMatch[1].trim();

    // Schedule moments from text
    const momentPattern = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–:]\s*(.+)/gi;
    const moments: ScheduleMoment[] = [];
    let mm;
    while ((mm = momentPattern.exec(text)) !== null) {
        moments.push({ time: mm[1], moment: mm[2].trim(), notes: '' });
    }
    if (moments.length > 0) event.scheduleMoments = moments;

    // ---- Detect missing must-haves ----
    const missingFields: string[] = [];
    const questions: string[] = [];

    if (!event.date) {
        missingFields.push('date');
        questions.push(MUST_HAVE_FIELDS[0].label);
    }
    if (!event.address && !event.venueName) {
        missingFields.push('address');
        questions.push(MUST_HAVE_FIELDS[1].label);
    }
    if (!event.attendanceEstimate || !event.indoorOutdoor) {
        missingFields.push('attendanceEstimate');
        questions.push(MUST_HAVE_FIELDS[2].label);
    }
    // Mic needs — always ask if not mentioned
    if (!/mic|microphone/i.test(text)) {
        missingFields.push('micNeeds');
        questions.push(MUST_HAVE_FIELDS[3].label);
    }
    // Power — always ask if not mentioned
    if (!/power|circuit|generator|amp/i.test(text)) {
        missingFields.push('power');
        questions.push(MUST_HAVE_FIELDS[4].label);
    }

    // Limit to max 5 questions
    const topQuestions = questions.slice(0, 5);

    return {
        event,
        missingFields,
        questions: topQuestions,
    };
}
