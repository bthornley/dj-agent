'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import ModeSwitch from '@/components/ModeSwitch';
import { useAppMode } from '@/hooks/useAppMode';
import { Event, Deliverable, DeliverableType } from '@/lib/types';
import { renderMarkdown } from '@/lib/markdown';
import { createDoc } from '@/lib/agent/tools';
import { fetchEvent, updateEvent, sendEmail } from '@/lib/api-client';

const TAB_META: Record<DeliverableType, { icon: string; label: string }> = {
    run_of_show: { icon: '⏱️', label: 'Run of Show' },
    proposal: { icon: '💰', label: 'Proposal' },
    show_sheet: { icon: '📋', label: 'Show Sheet' },
    gear_checklist: { icon: '📦', label: 'Gear Checklist' },
    email_draft: { icon: '✉️', label: 'Email Draft' },
};

// Convert "17:00" → "5:00 PM" or pass through "5:00 PM" as-is
function formatTime(t: string | undefined): string {
    if (!t) return '?';
    // Already 12h format?
    if (/am|pm/i.test(t)) return t;
    // 24h → 12h
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr);
    if (isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mStr || '00'} ${suffix}`;
}

function formatDate(d: string | undefined): string {
    if (!d) return '';
    try {
        const date = new Date(d + 'T00:00:00');
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
}

function EventDetailInner() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('id') || '';

    const [event, setEvent] = useState<Event | null>(null);
    const [activeTab, setActiveTab] = useState<DeliverableType>('run_of_show');
    const [copied, setCopied] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [showSendDialog, setShowSendDialog] = useState(false);
    const [sendTo, setSendTo] = useState('');
    const [sendSubject, setSendSubject] = useState('');
    const [sendReplyTo, setSendReplyTo] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (!eventId) { setNotFound(true); return; }

        fetchEvent(eventId)
            .then(async (found) => {
                if (!found) { setNotFound(true); return; }

                // Generate deliverables if none exist
                if (!found.deliverables || found.deliverables.length === 0) {
                    const types: DeliverableType[] = ['run_of_show', 'proposal', 'show_sheet', 'gear_checklist', 'email_draft'];
                    found.deliverables = types.map((t) => createDoc(t, found));
                    await updateEvent(found.id, { deliverables: found.deliverables });
                }

                setEvent(found);
                if (found.deliverables.length > 0) {
                    setActiveTab(found.deliverables[0].type);
                }
            })
            .catch(() => setNotFound(true));
    }, [eventId]);

    async function persistEvent(updated: Event) {
        setEvent(updated);
        try {
            await updateEvent(updated.id, updated);
        } catch (err) {
            console.error('Failed to persist event:', err);
        }
    }

    function handleApprove(type: DeliverableType) {
        if (!event) return;
        persistEvent({
            ...event,
            deliverables: event.deliverables.map((d) =>
                d.type === type ? { ...d, status: 'approved' as const } : d
            ),
        });
    }

    function handleRegenerate(type: DeliverableType) {
        if (!event) return;
        const newDoc = createDoc(type, event);
        setEditing(false);
        persistEvent({
            ...event,
            deliverables: event.deliverables.map((d) =>
                d.type === type ? newDoc : d
            ),
        });
    }

    function handleCopy() {
        const deliverable = event?.deliverables.find((d) => d.type === activeTab);
        if (deliverable) {
            navigator.clipboard.writeText(deliverable.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    function handleStatusChange(newStatus: Event['status']) {
        if (!event) return;
        persistEvent({ ...event, status: newStatus, updatedAt: new Date().toISOString() });
    }

    function handleStartEdit() {
        const deliverable = event?.deliverables.find((d) => d.type === activeTab);
        if (deliverable) {
            setEditContent(deliverable.content);
            setEditing(true);
        }
    }

    function handleSaveEdit() {
        if (!event) return;
        persistEvent({
            ...event,
            deliverables: event.deliverables.map((d) =>
                d.type === activeTab ? { ...d, content: editContent } : d
            ),
        });
        setEditing(false);
    }

    function handleCancelEdit() {
        setEditing(false);
        setEditContent('');
    }

    function handleOpenSend() {
        const deliverable = event?.deliverables.find((d) => d.type === 'email_draft');
        if (!deliverable) return;

        const content = editing ? editContent : deliverable.content;

        // Parse To and Subject from markdown header lines
        const toMatch = content.match(/\*\*To:\*\*\s*(.+)/);
        const subjectMatch = content.match(/\*\*Subject:\*\*\s*(.+)/);

        setSendTo(toMatch?.[1]?.trim() || event?.email || '');
        setSendSubject(subjectMatch?.[1]?.trim() || '');
        setSendReplyTo('');
        setSendResult(null);
        setShowSendDialog(true);
    }

    async function handleSendEmail() {
        if (!event || !sendTo || !sendSubject) return;
        setSending(true);
        setSendResult(null);

        // If editing, save changes first
        if (editing) {
            handleSaveEdit();
        }

        const deliverable = event.deliverables.find((d) => d.type === 'email_draft');
        if (!deliverable) return;

        // Strip the To/Subject header lines from the body before sending
        let body = (editing ? editContent : deliverable.content)
            .replace(/\*\*To:\*\*.+\n?/, '')
            .replace(/\*\*Subject:\*\*.+\n?/, '')
            .replace(/^---\n?/, '')
            .trim();

        // Remove the draft warning at the bottom
        body = body.replace(/\n?---\n?>[\s\S]*\*\*⚠️ DRAFT[\s\S]*$/, '').trim();

        try {
            const result = await sendEmail({
                eventId: event.id,
                to: sendTo,
                subject: sendSubject,
                emailBody: body,
                replyTo: sendReplyTo || undefined,
            });

            if (result.success) {
                setSendResult({ success: true, message: '✅ Email sent successfully!' });
                // Update deliverable status
                const updatedEvent = {
                    ...event,
                    deliverables: event.deliverables.map((d) =>
                        d.type === 'email_draft' ? { ...d, status: 'sent' as const } : d
                    ),
                };
                persistEvent(updatedEvent);
                setTimeout(() => setShowSendDialog(false), 2000);
            } else {
                setSendResult({ success: false, message: `❌ ${result.error || 'Failed to send'}` });
            }
        } catch {
            setSendResult({ success: false, message: '❌ Network error — try again' });
        } finally {
            setSending(false);
        }
    }

    if (notFound) {
        return (
            <main className="main-content">
                <div className="empty-state">
                    <div className="icon">🔍</div>
                    <h3>Event not found</h3>
                    <p>This event may have been deleted or the link is invalid.</p>
                    <Link href="/" className="btn btn-primary">← Back to Dashboard</Link>
                </div>
            </main>
        );
    }

    if (!event) {
        return (
            <main className="main-content">
                <div className="loading-overlay">
                    <div className="spinner" />
                    <span>Loading event...</span>
                </div>
            </main>
        );
    }

    const activeDeliverable = event.deliverables.find((d) => d.type === activeTab);
    const statusColors: Record<string, string> = {
        inquiry: 'badge-inquiry',
        quoting: 'badge-quoting',
        confirmed: 'badge-confirmed',
        completed: 'badge-confirmed',
        cancelled: '',
    };
    const isEmailTab = activeTab === 'email_draft';

    return (
        <main className="main-content fade-in">
            {/* Event header card */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
                            {event.clientName || 'Unknown Client'}
                            {event.org ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — {event.org}</span> : ''}
                        </h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {event.eventType?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Event'}
                            {event.venueName ? ` at ${event.venueName}` : ''}
                            {event.date ? ` • ${formatDate(event.date)}` : ''}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`badge ${statusColors[event.status]}`}>{event.status.toUpperCase()}</span>
                        <select
                            className="input"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                            value={event.status}
                            onChange={(e) => handleStatusChange(e.target.value as Event['status'])}
                        >
                            <option value="inquiry">Inquiry</option>
                            <option value="quoting">Quoting</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Quick details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                    <div>
                        <div className="form-label" style={{ marginBottom: '2px' }}>📧 Email</div>
                        <div style={{ fontSize: '14px' }}>{event.email || '—'}</div>
                    </div>
                    <div>
                        <div className="form-label" style={{ marginBottom: '2px' }}>📞 Phone</div>
                        <div style={{ fontSize: '14px' }}>{event.phone || '—'}</div>
                    </div>
                    <div>
                        <div className="form-label" style={{ marginBottom: '2px' }}>👥 Guests</div>
                        <div style={{ fontSize: '14px' }}>{event.attendanceEstimate ? `~${event.attendanceEstimate}` : '—'}</div>
                    </div>
                    <div>
                        <div className="form-label" style={{ marginBottom: '2px' }}>🕐 Hours</div>
                        <div style={{ fontSize: '14px' }}>{formatTime(event.startTime)} – {formatTime(event.endTime)}</div>
                    </div>
                    <div>
                        <div className="form-label" style={{ marginBottom: '2px' }}>💰 Budget</div>
                        <div style={{ fontSize: '14px' }}>{event.budgetRange || '—'}</div>
                    </div>
                    <div>
                        <div className="form-label" style={{ marginBottom: '2px' }}>🏠 Setting</div>
                        <div style={{ fontSize: '14px' }}>{event.indoorOutdoor || '—'}</div>
                    </div>
                </div>
            </div>

            {/* Deliverable tabs */}
            <div className="tabs">
                {event.deliverables.map((d) => {
                    const meta = TAB_META[d.type] || { icon: '📄', label: d.type };
                    return (
                        <button
                            key={d.type}
                            className={`tab ${activeTab === d.type ? 'active' : ''}`}
                            onClick={() => { setActiveTab(d.type); setEditing(false); }}
                        >
                            {meta.icon} {meta.label}
                            {d.status === 'approved' && ' ✓'}
                            {d.status === 'sent' && ' 📨'}
                        </button>
                    );
                })}
            </div>

            {/* Active document */}
            {activeDeliverable && (
                <div className="slide-up">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {activeDeliverable.status === 'draft' ? (
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(activeTab)}>
                                ✓ Approve
                            </button>
                        ) : activeDeliverable.status === 'sent' ? (
                            <span className="badge badge-confirmed">📨 Sent</span>
                        ) : (
                            <span className="badge badge-confirmed">✓ Approved</span>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => handleRegenerate(activeTab)}>
                            🔄 Regenerate
                        </button>
                        {isEmailTab && !editing && (
                            <button className="btn btn-secondary btn-sm" onClick={handleStartEdit}>
                                ✏️ Edit
                            </button>
                        )}
                        {isEmailTab && editing && (
                            <>
                                <button className="btn btn-success btn-sm" onClick={handleSaveEdit}>
                                    💾 Save
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>
                                    Cancel
                                </button>
                            </>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                            {copied ? '✓ Copied!' : '📋 Copy'}
                        </button>
                        {isEmailTab && activeDeliverable.status !== 'sent' && (
                            <button className="btn btn-primary btn-sm" onClick={handleOpenSend}>
                                ✉️ Send Email
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <textarea
                            className="input"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            style={{
                                width: '100%',
                                minHeight: '400px',
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                lineHeight: 1.6,
                                resize: 'vertical',
                                background: 'var(--surface-1)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '16px',
                            }}
                        />
                    ) : (
                        <div
                            className="doc-viewer"
                            dangerouslySetInnerHTML={{
                                __html: renderMarkdown(activeDeliverable.content),
                            }}
                        />
                    )}
                </div>
            )}

            {/* Send email dialog */}
            {showSendDialog && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => !sending && setShowSendDialog(false)}>
                    <div className="card" style={{ maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>✉️ Send Email</h3>

                        <div style={{ marginBottom: '12px' }}>
                            <label className="form-label">To</label>
                            <input
                                className="input"
                                value={sendTo}
                                onChange={(e) => setSendTo(e.target.value)}
                                placeholder="recipient@example.com"
                            />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label className="form-label">Subject</label>
                            <input
                                className="input"
                                value={sendSubject}
                                onChange={(e) => setSendSubject(e.target.value)}
                                placeholder="Email subject"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">Reply-To (optional — your email)</label>
                            <input
                                className="input"
                                value={sendReplyTo}
                                onChange={(e) => setSendReplyTo(e.target.value)}
                                placeholder="your@email.com"
                            />
                        </div>

                        {sendResult && (
                            <div style={{
                                padding: '12px', borderRadius: '8px', marginBottom: '16px',
                                background: sendResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${sendResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                fontSize: '14px',
                            }}>
                                {sendResult.message}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowSendDialog(false)} disabled={sending}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleSendEmail}
                                disabled={sending || !sendTo || !sendSubject}
                            >
                                {sending ? '⏳ Sending...' : '✉️ Send Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function EventDetail() {
    const { isInstructor, headerStyle, logoFilter } = useAppMode();

    return (
        <>
            <header className="topbar" style={headerStyle}>
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: logoFilter }} />
                    <span style={isInstructor ? { color: '#38bdf8' } : undefined}>GigLift</span>
                </Link>
                <nav className="topbar-nav">
                    <Link href="/" className="btn btn-ghost btn-sm">← Dashboard</Link>
                    <Link href="/new" className="btn btn-secondary btn-sm">+ New</Link>
                    <ModeSwitch />
                    <UserButton />
                </nav>
            </header>
            <Suspense fallback={
                <main className="main-content">
                    <div className="loading-overlay">
                        <div className="spinner" />
                        <span>Loading event...</span>
                    </div>
                </main>
            }>
                <EventDetailInner />
            </Suspense>
        </>
    );
}
