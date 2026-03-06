'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import { Lead, LeadStatus, Priority } from '@/lib/types';
import { fetchLeads, fetchLeadStats, updateLead, deleteLead, deleteAllLeads, handoffLeads, sendEmail } from '@/lib/api-client';
import { useAppMode } from '@/hooks/useAppMode';
import { generateLeadOutreach } from '@/lib/agent/tools';
import { useToast } from '@/components/ToastProvider';
import { EmailTemplate } from '@/lib/db';

type AppMode = 'performer' | 'instructor' | 'studio' | 'touring';

const statusLabels: Record<LeadStatus, { label: string; cls: string }> = {
    new: { label: '● New', cls: 'badge badge-lead-new' },
    queued_for_dj_agent: { label: '▶ Queued', cls: 'badge badge-lead-queued' },
    rejected: { label: '✕ Rejected', cls: 'badge badge-lead-rejected' },
    contacted: { label: '● Contacted', cls: 'badge badge-quoting' },
    in_talks: { label: '● In Talks', cls: 'badge badge-confirmed' },
    booked: { label: '✓ Booked', cls: 'badge badge-confirmed' },
};

const priorityLabels: Record<Priority, { label: string; cls: string }> = {
    P1: { label: '🔥 P1', cls: 'badge badge-p1' },
    P2: { label: '⚡ P2', cls: 'badge badge-p2' },
    P3: { label: '○ P3', cls: 'badge badge-p3' },
};

export default function LeadsDashboard() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [totalLeads, setTotalLeads] = useState(0);
    const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; avgScore: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const { activeMode } = useAppMode();
    const [deletingAll, setDeletingAll] = useState(false);
    const [emailLead, setEmailLead] = useState<Lead | null>(null);
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailReplyTo, setEmailReplyTo] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const { toast } = useToast();
    const PAGE_SIZE = 25;

    const isInstructor = activeMode === 'instructor';

    const searchRef = useRef(search);
    searchRef.current = search;

    const loadData = useCallback(async (targetPage: number) => {
        const mode = activeMode || 'performer';
        const offset = (targetPage - 1) * PAGE_SIZE;
        try {
            const [leadsResult, statsData] = await Promise.all([
                fetchLeads({
                    status: filterStatus || undefined,
                    priority: filterPriority || undefined,
                    search: searchRef.current || undefined,
                    mode: mode,
                    limit: PAGE_SIZE,
                    offset,
                }),
                fetchLeadStats(mode),
            ]);
            setLeads(leadsResult?.data || []);
            setTotalLeads(leadsResult?.total || 0);
            setStats(statsData || null);
        } catch (err) {
            console.error('Failed to load leads:', err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus, filterPriority, activeMode]);

    useEffect(() => {
        setLoading(true);
        loadData(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus, filterPriority, activeMode, page]);

    const handleSearch = () => {
        setLoading(true);
        setPage(1);
        loadData(1);
    };

    const handleReject = async (id: string) => {
        await updateLead(id, { status: 'rejected' });
        loadData(page);
    };

    const handleQueue = async (ids: string[]) => {
        await handoffLeads(ids);
        setSelected(new Set());
        loadData(page);
    };

    const handleDelete = async (id: string) => {
        await deleteLead(id);
        loadData(page);
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const toggleSelectAll = () => {
        if (selected.size === leads.length) setSelected(new Set());
        else setSelected(new Set(leads.map(l => l.lead_id)));
    };

    const handleDeleteAll = async () => {
        const modeLabel = isInstructor ? 'teaching' : 'performer';
        if (!confirm(`Delete all ${stats?.total || 0} ${modeLabel} leads? This cannot be undone.`)) return;
        setDeletingAll(true);
        try {
            await deleteAllLeads(activeMode || undefined);
            loadData(1);
        } catch {
            console.error('Failed to delete all leads');
        }
        setDeletingAll(false);
    };

    const handleEmailLead = (lead: Lead) => {
        const draft = generateLeadOutreach(lead);
        setEmailTo(draft.to);
        setEmailSubject(draft.subject);
        setEmailBody(draft.body);
        setEmailReplyTo('');
        setEmailLead(lead);
        // Fetch templates
        fetch('/api/email-templates').then(r => r.json()).then(setEmailTemplates).catch(() => { });
    };

    const handleSendLeadEmail = async () => {
        if (!emailLead || !emailTo || !emailSubject || !emailBody) return;
        setEmailSending(true);
        try {
            const result = await sendEmail({
                to: emailTo,
                subject: emailSubject,
                emailBody: emailBody,
                replyTo: emailReplyTo || undefined,
            });
            if (result.success) {
                toast('✉️ Email sent successfully!', 'success');
                await updateLead(emailLead.lead_id, { status: 'contacted' });
                setEmailLead(null);
                loadData(page);
            } else {
                toast(result.error || 'Failed to send email', 'error');
            }
        } catch {
            toast('Network error — try again', 'error');
        } finally {
            setEmailSending(false);
        }
    };

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                {/* Mode indicator banner */}
                <div style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: isInstructor
                        ? 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(34,211,238,0.04))'
                        : 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04))',
                    border: `1px solid ${isInstructor ? 'rgba(56,189,248,0.2)' : 'rgba(168,85,247,0.2)'}`,
                    color: isInstructor ? '#38bdf8' : '#a855f7',
                }}>
                    <span style={{ fontSize: '18px' }}>{isInstructor ? '📚' : '🎵'}</span>
                    {isInstructor
                        ? 'Instructor Mode — Showing leads for schools, studios, and teaching opportunities'
                        : 'Performer Mode — Showing leads for venues, events, and booking opportunities'}
                </div>

                {/* Stats */}
                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card" style={isInstructor ? { borderColor: 'rgba(56,189,248,0.15)' } : undefined}>
                            <div className="stat-value" style={isInstructor ? { color: '#38bdf8' } : undefined}>{stats.total}</div>
                            <div className="stat-label">Total Leads</div>
                        </div>
                        <div className="stat-card" style={isInstructor ? { borderColor: 'rgba(56,189,248,0.15)' } : undefined}>
                            <div className="stat-value" style={isInstructor ? { color: '#38bdf8' } : undefined}>{stats.byPriority['P1'] || 0}</div>
                            <div className="stat-label">🔥 P1 Hot</div>
                        </div>
                        <div className="stat-card" style={isInstructor ? { borderColor: 'rgba(56,189,248,0.15)' } : undefined}>
                            <div className="stat-value" style={isInstructor ? { color: '#38bdf8' } : undefined}>{stats.byStatus['queued_for_dj_agent'] || 0}</div>
                            <div className="stat-label">{isInstructor ? 'Queued' : 'Queued for Booking Agent'}</div>
                        </div>
                        <div className="stat-card" style={isInstructor ? { borderColor: 'rgba(56,189,248,0.15)' } : undefined}>
                            <div className="stat-value" style={isInstructor ? { color: '#38bdf8' } : undefined}>{stats.avgScore}</div>
                            <div className="stat-label">Avg Score</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="lead-filters">
                    <div className="filter-group">
                        <select
                            className="input filter-select"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="new">New</option>
                            <option value="queued_for_dj_agent">Queued</option>
                            <option value="contacted">Contacted</option>
                            <option value="in_talks">In Talks</option>
                            <option value="booked">Booked</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            className="input filter-select"
                            value={filterPriority}
                            onChange={e => setFilterPriority(e.target.value)}
                        >
                            <option value="">All Priority</option>
                            <option value="P1">🔥 P1</option>
                            <option value="P2">⚡ P2</option>
                            <option value="P3">○ P3</option>
                        </select>

                        <div className="search-bar">
                            <input
                                className="input"
                                placeholder="Search leads..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                            <button className="btn btn-ghost btn-sm" onClick={handleSearch}>Search</button>
                        </div>
                    </div>

                    {selected.size > 0 && (
                        <div className="bulk-actions">
                            <span className="text-muted">{selected.size} selected</span>
                            <button className="btn btn-primary btn-sm" onClick={() => handleQueue(Array.from(selected))}>
                                ▶ Queue for DJ Agent
                            </button>
                        </div>
                    )}
                </div>

                {/* Section Header */}
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Leads</h2>
                        <p className="section-subtitle">Prospecting conveyor belt → quality control → handoff</p>
                    </div>
                </div>

                {/* Leads List */}
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner" />
                        <span>Loading leads...</span>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="empty-state slide-up">
                        <div className="icon">🔍</div>
                        <h3>No leads yet</h3>
                        <p>Scan a venue URL or configure seeds to start prospecting</p>
                        <Link href="/leads/scan" className="btn btn-primary btn-lg">
                            🔍 Scan a URL
                        </Link>
                    </div>
                ) : (
                    <div className="leads-list">
                        {/* Select all */}
                        <div className="lead-row lead-row-header">
                            <label className="lead-checkbox">
                                <input type="checkbox" checked={selected.size === leads.length} onChange={toggleSelectAll} />
                            </label>
                            <div className="lead-col-name">Venue / Entity</div>
                            <div className="lead-col-city">City</div>
                            <div className="lead-col-type">Type</div>
                            <div className="lead-col-score">Score</div>
                            <div className="lead-col-priority">Priority</div>
                            <div className="lead-col-status">Status</div>
                            <div className="lead-col-actions">Actions</div>
                        </div>

                        {leads.map(lead => {
                            const status = statusLabels[lead.status] || statusLabels.new;
                            const priority = priorityLabels[lead.priority] || priorityLabels.P3;
                            return (
                                <div key={lead.lead_id} className="lead-row slide-up">
                                    <label className="lead-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(lead.lead_id)}
                                            onChange={() => toggleSelect(lead.lead_id)}
                                        />
                                    </label>
                                    <div className="lead-col-name">
                                        <Link href={`/leads/detail?id=${lead.lead_id}`} className="lead-name-link">
                                            {lead.entity_name || 'Unknown'}
                                        </Link>
                                        {lead.email && <div className="lead-sub">{lead.email}</div>}
                                    </div>
                                    <div className="lead-col-city">{lead.city || '—'}</div>
                                    <div className="lead-col-type">
                                        <span className="badge badge-draft">
                                            {(lead.entity_type || 'other').replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="lead-col-score">
                                        <div className="score-meter">
                                            <div
                                                className="score-fill"
                                                style={{
                                                    width: `${lead.lead_score}%`,
                                                    background: lead.lead_score >= 70
                                                        ? 'var(--accent-green)'
                                                        : lead.lead_score >= 40
                                                            ? 'var(--accent-amber)'
                                                            : 'var(--accent-red)',
                                                }}
                                            />
                                        </div>
                                        <span className="score-number">{lead.lead_score}</span>
                                    </div>
                                    <div className="lead-col-priority">
                                        <span className={priority.cls}>{priority.label}</span>
                                    </div>
                                    <div className="lead-col-status">
                                        <span className={status.cls}>{status.label}</span>
                                    </div>
                                    <div className="lead-col-actions">
                                        {lead.status === 'new' && (
                                            <>
                                                <button
                                                    className="btn btn-success"
                                                    onClick={() => handleQueue([lead.lead_id])}
                                                    title="Queue for Booking Agent"
                                                    style={{ width: 30, height: 30, padding: 0, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                                                >▶</button>
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => handleReject(lead.lead_id)}
                                                    title="Reject"
                                                    style={{ width: 30, height: 30, padding: 0, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                                                >✕</button>
                                            </>
                                        )}
                                        {lead.email && lead.status !== 'contacted' && lead.status !== 'booked' && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleEmailLead(lead)}
                                                title="Draft outreach email"
                                                style={{ width: 30, height: 30, padding: 0, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                                            >✉️</button>
                                        )}
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => handleDelete(lead.lead_id)}
                                            title="Delete"
                                            style={{ width: 30, height: 30, padding: 0, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                                        >🗑</button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination */}
                        {totalLeads > PAGE_SIZE && (
                            <div style={{
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                gap: '12px', padding: '20px 0', marginTop: '8px',
                            }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >← Prev</button>
                                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                    Page {page} of {Math.ceil(totalLeads / PAGE_SIZE)} · {totalLeads} leads
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={page >= Math.ceil(totalLeads / PAGE_SIZE)}
                                    onClick={() => setPage(p => p + 1)}
                                >Next →</button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Lead email send dialog */}
            {emailLead && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => !emailSending && setEmailLead(null)}>
                    <div className="card" style={{ maxWidth: '560px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '4px', fontSize: '18px' }}>✉️ Outreach Email</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                            Draft email for {emailLead.entity_name}
                        </p>

                        {emailTemplates.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                                <label className="form-label">📋 Use Template</label>
                                <select
                                    className="input"
                                    defaultValue=""
                                    onChange={e => {
                                        const tpl = emailTemplates.find(t => t.id === e.target.value);
                                        if (tpl && emailLead) {
                                            const sub = (s: string) => s
                                                .replace(/\{\{contact\}\}/g, emailLead.contact_name || 'there')
                                                .replace(/\{\{venue\}\}/g, emailLead.entity_name || 'your venue')
                                                .replace(/\{\{city\}\}/g, emailLead.city ? ` in ${emailLead.city}` : '');
                                            setEmailSubject(sub(tpl.subject));
                                            setEmailBody(sub(tpl.bodyTemplate));
                                        }
                                    }}
                                >
                                    <option value="" disabled>Select a template...</option>
                                    {emailTemplates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ marginBottom: '12px' }}>
                            <label className="form-label">To</label>
                            <input className="input" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@example.com" />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label className="form-label">Subject</label>
                            <input className="input" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label className="form-label">Body</label>
                            <textarea
                                className="input"
                                value={emailBody}
                                onChange={e => setEmailBody(e.target.value)}
                                style={{ minHeight: '200px', fontFamily: 'inherit', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">Reply-To (optional — your email)</label>
                            <input className="input" value={emailReplyTo} onChange={e => setEmailReplyTo(e.target.value)} placeholder="your@email.com" />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEmailLead(null)} disabled={emailSending}>Cancel</button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleSendLeadEmail}
                                disabled={emailSending || !emailTo || !emailSubject}
                            >
                                {emailSending ? '⏳ Sending...' : '✉️ Send Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
