'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseInquiry } from '@/lib/agent/intake';
import { plan } from '@/lib/agent/planner';
import { createDoc } from '@/lib/agent/tools';
import { checkGuardrails } from '@/lib/agent/guardrails';
import { Event, Deliverable, EventType } from '@/lib/types';
import { createEvent } from '@/lib/api-client';
import { v4 as uuid } from 'uuid';



const SAMPLE_INQUIRY = `Hi! My name is Sarah Mitchell and I'm looking for a DJ for our company holiday party.

Event: Corporate holiday party for Apex Digital
Date: March 15, 2026
Time: 6:00 PM - 11:00 PM (setup at 4:00 PM)
Venue: The Grand Ballroom, 1250 Oak Ave, Portland OR 97201
Location: Indoor ballroom

We're expecting about 200 guests. The vibe should be upbeat and fun — mix of pop hits, R&B, and some throwbacks. We'd like 2 mics for speeches and announcements.

Budget range: $1,500 - $2,500

Contact: sarah@apexdigital.com | (503) 555-0142

Load-in: there's a service elevator on the east side, parking available in the rear lot.
Power: there is a dedicated 20-amp circuit near the stage area. No sound restrictions.`;

type InputMode = 'form' | 'paste';

interface FormData {
    clientName: string;
    org: string;
    email: string;
    phone: string;
    eventType: EventType;
    date: string;
    startTime: string;
    endTime: string;
    setupTime: string;
    venueName: string;
    address: string;
    indoorOutdoor: 'indoor' | 'outdoor' | 'both' | '';
    loadInNotes: string;
    attendanceEstimate: string;
    micCount: string;
    micNotes: string;
    powerNotes: string;
    budgetRange: string;
    vibeDescription: string;
    additionalNotes: string;
}

const EMPTY_FORM: FormData = {
    clientName: '',
    org: '',
    email: '',
    phone: '',
    eventType: 'other',
    date: '',
    startTime: '',
    endTime: '',
    setupTime: '',
    venueName: '',
    address: '',
    indoorOutdoor: '',
    loadInNotes: '',
    attendanceEstimate: '',
    micCount: '',
    micNotes: '',
    powerNotes: '',
    budgetRange: '',
    vibeDescription: '',
    additionalNotes: '',
};

export default function NewInquiry() {
    const router = useRouter();
    const [mode, setMode] = useState<InputMode>('form');
    const [rawText, setRawText] = useState('');
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<{
        event: Partial<Event>;
        questions: string[];
        deliverables: Deliverable[];
        warnings: string[];
    } | null>(null);

    function updateForm(field: keyof FormData, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    // Convert "17:00" → "5:00 PM"
    function to12h(t: string): string {
        if (!t) return '';
        if (/am|pm/i.test(t)) return t;
        const [hStr, mStr] = t.split(':');
        const h = parseInt(hStr);
        if (isNaN(h)) return t;
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${mStr || '00'} ${suffix}`;
    }

    // Build event from structured form
    function buildEventFromForm(): Partial<Event> {
        return {
            id: uuid(),
            status: 'inquiry',
            clientName: form.clientName,
            org: form.org,
            email: form.email,
            phone: form.phone,
            eventType: form.eventType,
            date: form.date,
            startTime: to12h(form.startTime),
            endTime: to12h(form.endTime),
            setupTime: to12h(form.setupTime),
            strikeTime: '',
            venueName: form.venueName,
            address: form.address,
            indoorOutdoor: form.indoorOutdoor,
            loadInNotes: form.loadInNotes,
            attendanceEstimate: form.attendanceEstimate ? parseInt(form.attendanceEstimate) : 0,
            budgetRange: form.budgetRange,
            vibeDescription: form.vibeDescription,
            scheduleMoments: [],
            deliverables: [],
            inventoryRequired: [],
            risks: [],
            questions: [],
            rawInquiry: `[Form Submission]\nClient: ${form.clientName}\nOrg: ${form.org}\nEmail: ${form.email}\nPhone: ${form.phone}\nEvent: ${form.eventType}\nDate: ${form.date}\nTime: ${form.startTime} - ${form.endTime}\nSetup: ${form.setupTime}\nVenue: ${form.venueName}, ${form.address}\nSetting: ${form.indoorOutdoor}\nLoad-in: ${form.loadInNotes}\nAttendance: ${form.attendanceEstimate}\nMics: ${form.micCount} — ${form.micNotes}\nPower: ${form.powerNotes}\nBudget: ${form.budgetRange}\nVibe: ${form.vibeDescription}\nNotes: ${form.additionalNotes}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    async function handleProcess() {
        setProcessing(true);
        await new Promise((r) => setTimeout(r, 600));

        let eventData: Partial<Event>;
        let missingQuestions: string[] = [];

        if (mode === 'paste') {
            if (!rawText.trim()) { setProcessing(false); return; }
            const intake = parseInquiry(rawText);
            eventData = intake.event;
            missingQuestions = intake.questions;
        } else {
            eventData = buildEventFromForm();
            // Check for missing must-haves on the form
            if (!eventData.date) missingQuestions.push('Event date is not set');
            if (!eventData.venueName && !eventData.address) missingQuestions.push('Venue or address needed');
            if (!eventData.attendanceEstimate) missingQuestions.push('Estimated attendance needed');
            if (!form.micCount && !form.micNotes) missingQuestions.push('Mic needs: how many and for what?');
            if (!form.powerNotes) missingQuestions.push('Power: dedicated circuit available? Any sound limits?');
        }

        // Plan & generate deliverables
        const planResult = plan(eventData);
        const deliverables: Deliverable[] = [];
        for (const task of planResult.tasks) {
            if (task.ready) {
                deliverables.push(createDoc(task.type, { ...eventData, questions: missingQuestions }));
            }
        }

        const guardrails = checkGuardrails(eventData, deliverables);

        setResult({
            event: eventData,
            questions: missingQuestions,
            deliverables,
            warnings: [...guardrails.warnings, ...guardrails.blockers],
        });
        setProcessing(false);
    }

    async function handleSave() {
        if (!result) return;

        const event: Event = {
            id: result.event.id || crypto.randomUUID(),
            status: 'inquiry',
            clientName: result.event.clientName || '',
            org: result.event.org || '',
            phone: result.event.phone || '',
            email: result.event.email || '',
            venueName: result.event.venueName || '',
            address: result.event.address || '',
            loadInNotes: result.event.loadInNotes || '',
            indoorOutdoor: result.event.indoorOutdoor || '',
            date: result.event.date || '',
            startTime: result.event.startTime || '',
            endTime: result.event.endTime || '',
            setupTime: result.event.setupTime || '',
            strikeTime: result.event.strikeTime || '',
            eventType: result.event.eventType || 'other',
            attendanceEstimate: result.event.attendanceEstimate || 0,
            budgetRange: result.event.budgetRange || '',
            vibeDescription: result.event.vibeDescription || '',
            scheduleMoments: result.event.scheduleMoments || [],
            deliverables: result.deliverables,
            inventoryRequired: result.event.inventoryRequired || [],
            risks: result.event.risks || [],
            questions: result.event.questions || [],
            createdAt: result.event.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            rawInquiry: result.event.rawInquiry || rawText,
        };

        try {
            await createEvent(event);
        } catch (err) {
            console.error('Failed to save event:', err);
        }

        router.push(`/event?id=${event.id}`);
    }

    const isFormReady = mode === 'paste' ? rawText.trim().length > 0 : form.clientName.trim().length > 0;

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>DJ Agent</span>
                </Link>
                <nav className="topbar-nav">
                    <Link href="/" className="btn btn-ghost">← Back</Link>
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h1 className="section-title">New Inquiry</h1>
                        <p className="section-subtitle">Fill in the form or paste raw text — the agent generates all your documents</p>
                    </div>
                </div>

                {!result ? (
                    <div className="slide-up">
                        {/* Mode tabs */}
                        <div className="tabs" style={{ marginBottom: '20px' }}>
                            <button className={`tab ${mode === 'form' ? 'active' : ''}`} onClick={() => setMode('form')}>
                                📋 Inquiry Form
                            </button>
                            <button className={`tab ${mode === 'paste' ? 'active' : ''}`} onClick={() => setMode('paste')}>
                                📝 Paste Raw Text
                            </button>
                        </div>

                        {mode === 'form' ? (
                            /* ============== STRUCTURED FORM ============== */
                            <div className="card" style={{ position: 'relative' }}>
                                {/* Section: Client Info */}
                                <h3 style={{ fontSize: '16px', color: 'var(--accent-purple)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    👤 Client Information
                                </h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Client Name *</label>
                                        <input className="input" placeholder="e.g. Sarah Mitchell" value={form.clientName} onChange={(e) => updateForm('clientName', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Organization</label>
                                        <input className="input" placeholder="e.g. Apex Digital" value={form.org} onChange={(e) => updateForm('org', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input className="input" type="email" placeholder="client@example.com" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="input" type="tel" placeholder="(555) 123-4567" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />

                                {/* Section: Event Details */}
                                <h3 style={{ fontSize: '16px', color: 'var(--accent-purple)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🎉 Event Details
                                </h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Event Type *</label>
                                        <select className="input" value={form.eventType} onChange={(e) => updateForm('eventType', e.target.value)}>
                                            <option value="wedding">Wedding</option>
                                            <option value="corporate">Corporate</option>
                                            <option value="charity">Charity / Fundraiser</option>
                                            <option value="birthday">Birthday</option>
                                            <option value="after_party">After Party</option>
                                            <option value="concert">Concert</option>
                                            <option value="festival">Festival</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Event Date *</label>
                                        <input className="input" type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                    <div className="form-group">
                                        <label className="form-label">Start Time *</label>
                                        <input className="input" type="time" value={form.startTime} onChange={(e) => updateForm('startTime', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End Time *</label>
                                        <input className="input" type="time" value={form.endTime} onChange={(e) => updateForm('endTime', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Setup / Load-in Time</label>
                                        <input className="input" type="time" value={form.setupTime} onChange={(e) => updateForm('setupTime', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Estimated Attendance *</label>
                                        <input className="input" type="number" placeholder="e.g. 150" value={form.attendanceEstimate} onChange={(e) => updateForm('attendanceEstimate', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Budget Range</label>
                                        <input className="input" placeholder="e.g. $1,500 - $2,500" value={form.budgetRange} onChange={(e) => updateForm('budgetRange', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Vibe / Music Style</label>
                                    <input className="input" placeholder="e.g. Upbeat, mix of pop, R&B, and throwbacks" value={form.vibeDescription} onChange={(e) => updateForm('vibeDescription', e.target.value)} />
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />

                                {/* Section: Venue */}
                                <h3 style={{ fontSize: '16px', color: 'var(--accent-purple)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📍 Venue & Access
                                </h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Venue Name *</label>
                                        <input className="input" placeholder="e.g. The Grand Ballroom" value={form.venueName} onChange={(e) => updateForm('venueName', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Indoor / Outdoor *</label>
                                        <select className="input" value={form.indoorOutdoor} onChange={(e) => updateForm('indoorOutdoor', e.target.value)}>
                                            <option value="">— Select —</option>
                                            <option value="indoor">Indoor</option>
                                            <option value="outdoor">Outdoor</option>
                                            <option value="both">Both</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Venue Address</label>
                                    <input className="input" placeholder="e.g. 1250 Oak Ave, Portland OR 97201" value={form.address} onChange={(e) => updateForm('address', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Load-in / Access Notes</label>
                                    <textarea className="textarea" style={{ minHeight: '80px' }} placeholder="Elevator access, parking, stairs, dock, etc." value={form.loadInNotes} onChange={(e) => updateForm('loadInNotes', e.target.value)} />
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />

                                {/* Section: Gear Needs */}
                                <h3 style={{ fontSize: '16px', color: 'var(--accent-purple)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🎤 Gear & Technical
                                </h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Microphones Needed *</label>
                                        <input className="input" type="number" placeholder="e.g. 2" value={form.micCount} onChange={(e) => updateForm('micCount', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mic Usage</label>
                                        <input className="input" placeholder="e.g. Speeches, toasts, announcements" value={form.micNotes} onChange={(e) => updateForm('micNotes', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Power / Sound Restrictions *</label>
                                    <textarea className="textarea" style={{ minHeight: '80px' }} placeholder="e.g. Dedicated 20-amp circuit available near stage. No sound curfew." value={form.powerNotes} onChange={(e) => updateForm('powerNotes', e.target.value)} />
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />

                                {/* Section: Additional */}
                                <div className="form-group">
                                    <label className="form-label">Additional Notes</label>
                                    <textarea className="textarea" style={{ minHeight: '80px' }} placeholder="Any special requests, key moments, songs to play/avoid, etc." value={form.additionalNotes} onChange={(e) => updateForm('additionalNotes', e.target.value)} />
                                </div>

                                {/* Submit */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleProcess}
                                        disabled={processing || !isFormReady}
                                        style={{ opacity: processing || !isFormReady ? 0.5 : 1 }}
                                    >
                                        {processing ? (
                                            <>
                                                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                                                Generating...
                                            </>
                                        ) : (
                                            '🧠 Generate Documents'
                                        )}
                                    </button>
                                    <button className="btn btn-ghost" onClick={() => setForm(EMPTY_FORM)} type="button">
                                        Clear Form
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ============== RAW TEXT PASTE ============== */
                            <div className="card" style={{ position: 'relative' }}>
                                <div className="form-group">
                                    <label className="form-label">Client Inquiry</label>
                                    <textarea
                                        className="textarea"
                                        placeholder="Paste the client's email, text message, or form submission here..."
                                        style={{ minHeight: '220px', fontSize: '15px' }}
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleProcess}
                                        disabled={processing || !isFormReady}
                                        style={{ opacity: processing || !isFormReady ? 0.5 : 1 }}
                                    >
                                        {processing ? (
                                            <>
                                                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                                                Processing...
                                            </>
                                        ) : (
                                            '🧠 Process with Agent'
                                        )}
                                    </button>
                                    <button className="btn btn-ghost" onClick={() => setRawText(SAMPLE_INQUIRY)} type="button">
                                        Try Sample
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ============== RESULTS VIEW ============== */
                    <div className="slide-up">
                        {/* Extracted data summary */}
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '22px' }}>✅</span> Event Data {mode === 'form' ? 'Submitted' : 'Extracted'}
                            </h2>
                            <div className="form-row" style={{ marginBottom: '8px' }}>
                                <div>
                                    <span className="form-label">Client</span>
                                    <div>{result.event.clientName || '—'} {result.event.org ? `(${result.event.org})` : ''}</div>
                                </div>
                                <div>
                                    <span className="form-label">Event Type</span>
                                    <div>{result.event.eventType?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—'}</div>
                                </div>
                            </div>
                            <div className="form-row" style={{ marginBottom: '8px' }}>
                                <div>
                                    <span className="form-label">Date</span>
                                    <div>{result.event.date || '—'}</div>
                                </div>
                                <div>
                                    <span className="form-label">Time</span>
                                    <div>{result.event.startTime || '?'} — {result.event.endTime || '?'}</div>
                                </div>
                            </div>
                            <div className="form-row" style={{ marginBottom: '8px' }}>
                                <div>
                                    <span className="form-label">Venue</span>
                                    <div>{result.event.venueName || '—'}</div>
                                </div>
                                <div>
                                    <span className="form-label">Attendance</span>
                                    <div>{result.event.attendanceEstimate ? `~${result.event.attendanceEstimate} guests` : '—'}</div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div>
                                    <span className="form-label">Budget</span>
                                    <div>{result.event.budgetRange || '—'}</div>
                                </div>
                                <div>
                                    <span className="form-label">Indoor/Outdoor</span>
                                    <div>{result.event.indoorOutdoor || '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Questions */}
                        {result.questions.length > 0 && (
                            <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                                <div>
                                    <strong style={{ display: 'block', marginBottom: '8px' }}>Missing Info — Ask the Client:</strong>
                                    <ol className="questions-list" style={{ listStyle: 'decimal', paddingLeft: '20px' }}>
                                        {result.questions.map((q, i) => (
                                            <li key={i} style={{ background: 'none', border: 'none', padding: '4px 0', color: 'inherit' }}>{q}</li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {result.warnings.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                {result.warnings.map((w, i) => (
                                    <div key={i} className="alert alert-info" style={{ marginBottom: '8px' }}>
                                        ⚡ {w}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Deliverables generated */}
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
                                📄 {result.deliverables.length} Deliverables Generated
                            </h2>
                            <div className="deliverables-grid">
                                {result.deliverables.map((d, i) => {
                                    const icons: Record<string, string> = {
                                        run_of_show: '⏱️',
                                        proposal: '💰',
                                        show_sheet: '📋',
                                        gear_checklist: '📦',
                                        email_draft: '✉️',
                                    };
                                    const names: Record<string, string> = {
                                        run_of_show: 'Run of Show',
                                        proposal: 'Proposal',
                                        show_sheet: 'Show Sheet',
                                        gear_checklist: 'Gear Checklist',
                                        email_draft: 'Email Draft',
                                    };
                                    return (
                                        <div key={i} className="deliverable-card">
                                            <div className="icon">{icons[d.type] || '📄'}</div>
                                            <div className="name">{names[d.type] || d.type}</div>
                                            <span className="badge badge-draft">Draft</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary btn-lg" onClick={handleSave}>
                                💾 Save & View Documents
                            </button>
                            <button className="btn btn-ghost btn-lg" onClick={() => { setResult(null); }}>
                                ← Start Over
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
