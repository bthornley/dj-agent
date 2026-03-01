'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Lead } from '@/lib/types';
import { fetchLead, updateLead, handoffLeads } from '@/lib/api-client';
import ModeSwitch from '@/components/ModeSwitch';
import { useAppMode } from '@/hooks/useAppMode';

function LeadDetailContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id') || '';
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Lead>>({});
    const [message, setMessage] = useState('');
    const [outreach, setOutreach] = useState<{ variant: string; subject: string; body: string }[] | null>(null);
    const [outreachLoading, setOutreachLoading] = useState(false);
    const [activeVariant, setActiveVariant] = useState(0);
    const [copied, setCopied] = useState(false);
    const outreachRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;
        fetchLead(id)
            .then(data => {
                setLead(data);
                setEditData(data || {});
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const handleSave = async () => {
        if (!lead) return;
        try {
            const updated = await updateLead(lead.lead_id, editData);
            setLead(updated);
            setEditing(false);
            setMessage('Lead updated successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to update lead');
        }
    };

    const handleQueue = async () => {
        if (!lead) return;
        try {
            await handoffLeads([lead.lead_id]);
            const updated = await fetchLead(lead.lead_id);
            setLead(updated);
            setMessage('Lead queued for DJ Agent');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to queue lead');
        }
    };

    const handleStatusChange = async (status: Lead['status']) => {
        if (!lead) return;
        const updated = await updateLead(lead.lead_id, { status });
        setLead(updated);
    };

    if (loading) {
        return (
            <div className="loading-overlay"><div className="spinner" /><span>Loading lead...</span></div>
        );
    }

    if (!lead) {
        return (
            <div className="empty-state">
                <h3>Lead not found</h3>
                <Link href="/leads" className="btn btn-primary">← Back to Leads</Link>
            </div>
        );
    }

    const scoreColor = lead.lead_score >= 70
        ? 'var(--accent-green)'
        : lead.lead_score >= 40
            ? 'var(--accent-amber)'
            : 'var(--accent-red)';

    return (
        <main className="main-content fade-in">
            {message && <div className="alert alert-success">{message}</div>}

            {/* Header */}
            <div className="lead-detail-header">
                <div>
                    <h1 className="section-title">{lead.entity_name}</h1>
                    <p className="section-subtitle">
                        <span className="badge badge-draft">{(lead.entity_type || 'other').replace(/_/g, ' ')}</span>
                        {' '}{lead.city}{lead.state ? `, ${lead.state}` : ''}
                        {lead.neighborhood ? ` · ${lead.neighborhood}` : ''}
                    </p>
                </div>
                <div className="lead-detail-actions">
                    {lead.status === 'new' && (
                        <button className="btn btn-primary" onClick={handleQueue}>▶ Queue for DJ Agent</button>
                    )}
                    <button className="btn btn-primary" onClick={async () => {
                        setOutreachLoading(true);
                        setCopied(false);
                        setOutreach(null);
                        try {
                            const res = await fetch('/api/leads/outreach', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ leadId: lead.lead_id }),
                            });
                            const text = await res.text();
                            console.log('Outreach response:', res.status, text);
                            let data;
                            try { data = JSON.parse(text); } catch { data = { error: text }; }
                            if (data.emails && data.emails.length > 0) {
                                setOutreach(data.emails);
                                setActiveVariant(0);
                                setTimeout(() => outreachRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                            } else {
                                setMessage(data.error || 'No emails generated — check your lead data');
                                setTimeout(() => setMessage(''), 5000);
                            }
                        } catch (e) {
                            console.error('Outreach fetch error:', e);
                            setMessage('Network error — failed to reach API');
                            setTimeout(() => setMessage(''), 5000);
                        }
                        setOutreachLoading(false);
                    }} disabled={outreachLoading}>
                        {outreachLoading ? '⏳ Generating...' : '✉️ Draft Outreach'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>
                        {editing ? 'Cancel' : '✏ Edit'}
                    </button>
                </div>
            </div>

            {/* Score + Priority Banner */}
            <div className="lead-score-banner">
                <div className="score-big">
                    <div className="score-circle" style={{ borderColor: scoreColor }}>
                        <span className="score-value" style={{ color: scoreColor }}>{lead.lead_score}</span>
                        <span className="score-label">/ 100</span>
                    </div>
                </div>
                <div className="score-details">
                    <div><strong>Priority:</strong> {lead.priority}</div>
                    <div><strong>Confidence:</strong> {lead.confidence}</div>
                    <div><strong>Status:</strong>
                        {editing ? (
                            <select
                                className="input filter-select"
                                value={editData.status || lead.status}
                                onChange={e => setEditData({ ...editData, status: e.target.value as Lead['status'] })}
                                style={{ display: 'inline', width: 'auto', marginLeft: '8px' }}
                            >
                                <option value="new">New</option>
                                <option value="queued_for_dj_agent">Queued</option>
                                <option value="contacted">Contacted</option>
                                <option value="in_talks">In Talks</option>
                                <option value="booked">Booked</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        ) : (
                            <span> {lead.status.replace(/_/g, ' ')}</span>
                        )}
                    </div>
                    <div className="score-reason">{lead.score_reason}</div>
                </div>
            </div>

            <div className="lead-detail-grid">
                {/* Contact Info */}
                <div className="card">
                    <h3 className="card-title">📞 Contact</h3>
                    <div className="detail-fields">
                        <DetailField label="Contact Name" value={lead.contact_name} editing={editing}
                            onChange={v => setEditData({ ...editData, contact_name: v })} editValue={editData.contact_name} />
                        <DetailField label="Role" value={lead.role} editing={editing}
                            onChange={v => setEditData({ ...editData, role: v })} editValue={editData.role} />
                        <DetailField label="Email" value={lead.email} editing={editing}
                            onChange={v => setEditData({ ...editData, email: v })} editValue={editData.email} />
                        <DetailField label="Phone" value={lead.phone} editing={editing}
                            onChange={v => setEditData({ ...editData, phone: v })} editValue={editData.phone} />
                        <DetailField label="Contact Form" value={lead.contact_form_url} editing={editing} isLink
                            onChange={v => setEditData({ ...editData, contact_form_url: v })} editValue={editData.contact_form_url} />
                        <DetailField label="Instagram" value={lead.instagram_handle ? `@${lead.instagram_handle}` : ''} editing={editing}
                            onChange={v => setEditData({ ...editData, instagram_handle: v })} editValue={editData.instagram_handle} />
                        <DetailField label="Facebook" value={lead.facebook_page} editing={editing}
                            onChange={v => setEditData({ ...editData, facebook_page: v })} editValue={editData.facebook_page} />
                        <DetailField label="Preferred Method" value={lead.preferred_contact_method} editing={editing}
                            onChange={v => setEditData({ ...editData, preferred_contact_method: v })} editValue={editData.preferred_contact_method} />
                    </div>
                </div>

                {/* Event Fit */}
                <div className="card">
                    <h3 className="card-title">🎵 Event Fit</h3>
                    <div className="detail-fields">
                        <div className="detail-row">
                            <span className="detail-label">Music Tags</span>
                            <div className="tag-list">
                                {(lead.music_fit_tags || []).map((tag, i) => (
                                    <span key={i} className="badge badge-draft">{tag}</span>
                                ))}
                                {(!lead.music_fit_tags || lead.music_fit_tags.length === 0) && <span className="text-muted">None detected</span>}
                            </div>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Event Types</span>
                            <div className="tag-list">
                                {(lead.event_types_seen || []).map((type, i) => (
                                    <span key={i} className="badge badge-inquiry">{type}</span>
                                ))}
                                {(!lead.event_types_seen || lead.event_types_seen.length === 0) && <span className="text-muted">None detected</span>}
                            </div>
                        </div>
                        <DetailField label="Capacity Estimate" value={lead.capacity_estimate ? String(lead.capacity_estimate) : ''} editing={editing}
                            onChange={v => setEditData({ ...editData, capacity_estimate: parseInt(v) || null })} editValue={String(editData.capacity_estimate || '')} />
                        <DetailField label="Budget Signal" value={lead.budget_signal} editing={editing}
                            onChange={v => setEditData({ ...editData, budget_signal: v as Lead['budget_signal'] })} editValue={editData.budget_signal} />
                    </div>
                </div>

                {/* Source / Audit */}
                <div className="card">
                    <h3 className="card-title">🔗 Source & Audit</h3>
                    <div className="detail-fields">
                        <DetailField label="Website" value={lead.website_url} isLink editing={false} />
                        <DetailField label="Source" value={lead.source} editing={false} />
                        <DetailField label="Source URL" value={lead.source_url} isLink editing={false} />
                        <DetailField label="Found At" value={lead.found_at ? new Date(lead.found_at).toLocaleString() : ''} editing={false} />
                        <DetailField label="Dedupe Key" value={lead.dedupe_key} editing={false} />
                    </div>
                </div>

                {/* Notes */}
                <div className="card">
                    <h3 className="card-title">📝 Notes</h3>
                    {editing ? (
                        <textarea
                            className="textarea"
                            value={editData.notes || ''}
                            onChange={e => setEditData({ ...editData, notes: e.target.value })}
                        />
                    ) : (
                        <p className="lead-notes">{lead.notes || 'No notes'}</p>
                    )}
                </div>
            </div>

            {/* Agent Trace (collapsible) */}
            {lead.agent_trace && (
                <details className="card" style={{ marginTop: '16px' }}>
                    <summary className="card-title" style={{ cursor: 'pointer' }}>🤖 Agent Trace</summary>
                    <pre className="agent-trace">{lead.agent_trace}</pre>
                </details>
            )}

            {/* Raw Snippet */}
            {lead.raw_snippet && (
                <details className="card" style={{ marginTop: '16px' }}>
                    <summary className="card-title" style={{ cursor: 'pointer' }}>📄 Raw Snippet</summary>
                    <p className="lead-notes" style={{ fontSize: '13px' }}>{lead.raw_snippet}</p>
                </details>
            )}

            {editing && (
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
                    <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                </div>
            )}

            {/* Outreach Email Preview */}
            {outreach && outreach.length > 0 && (
                <div ref={outreachRef} className="card" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 className="card-title">✉️ Outreach Email Draft</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => setOutreach(null)}>✕ Close</button>
                    </div>

                    {/* Variant tabs */}
                    <div className="tabs" style={{ marginBottom: '16px' }}>
                        {outreach.map((email, i) => (
                            <button key={i}
                                className={`tab ${activeVariant === i ? 'active' : ''}`}
                                onClick={() => { setActiveVariant(i); setCopied(false); }}>
                                {email.variant === 'formal' ? '📄 Formal' : email.variant === 'casual' ? '💬 Casual' : '🔄 Follow-up'}
                            </button>
                        ))}
                    </div>

                    {/* Email preview */}
                    <div style={{ background: 'var(--surface-raised)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject</span>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {outreach[activeVariant].subject}
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Body</span>
                            <pre style={{
                                fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: '14px',
                                color: 'var(--text-secondary)', lineHeight: 1.6, margin: '8px 0 0',
                            }}>
                                {outreach[activeVariant].body}
                            </pre>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                            const email = outreach[activeVariant];
                            navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 3000);
                        }}>
                            {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
                        </button>
                        {lead.email && (
                            <a
                                className="btn btn-secondary btn-sm"
                                href={`mailto:${lead.email}?subject=${encodeURIComponent(outreach[activeVariant].subject)}&body=${encodeURIComponent(outreach[activeVariant].body)}`}
                                target="_blank" rel="noopener noreferrer"
                            >
                                📧 Open in Email
                            </a>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}

function DetailField({ label, value, editing, editValue, onChange, isLink }: {
    label: string;
    value: string;
    editing: boolean;
    editValue?: string;
    onChange?: (v: string) => void;
    isLink?: boolean;
}) {
    return (
        <div className="detail-row">
            <span className="detail-label">{label}</span>
            {editing && onChange ? (
                <input
                    className="input"
                    value={editValue ?? value ?? ''}
                    onChange={e => onChange(e.target.value)}
                />
            ) : isLink && value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="detail-value detail-link">
                    {value.length > 50 ? value.substring(0, 50) + '...' : value}
                </a>
            ) : (
                <span className="detail-value">{value || <span className="text-muted">—</span>}</span>
            )}
        </div>
    );
}

export default function LeadDetailPage() {
    const { isInstructor, headerStyle, logoFilter } = useAppMode();

    return (
        <>
            <header className="topbar" style={headerStyle}>
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: logoFilter }} />
                    <span style={isInstructor ? { color: '#38bdf8' } : undefined}>Lead Detail</span>
                </Link>
                <nav className="topbar-nav">
                    <Link href="/leads" className="btn btn-ghost btn-sm">← Back to Leads</Link>
                    <Link href="/leads/scan" className="btn btn-secondary btn-sm">🔍 Scan</Link>
                    <ModeSwitch />
                    <UserButton />
                </nav>
            </header>
            <Suspense fallback={<div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div>}>
                <LeadDetailContent />
            </Suspense>
        </>
    );
}
