'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lead, LeadStatus, Priority } from '@/lib/types';
import { fetchLeads, fetchLeadStats, updateLead, deleteLead, handoffLeads } from '@/lib/api-client';
import ModeSwitch from '@/components/ModeSwitch';

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
    const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; avgScore: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 25;

    const loadData = async () => {
        try {
            const [leadsData, statsData] = await Promise.all([
                fetchLeads({
                    status: filterStatus || undefined,
                    priority: filterPriority || undefined,
                    search: search || undefined,
                }),
                fetchLeadStats(),
            ]);
            setLeads(leadsData);
            setStats(statsData);
        } catch (err) {
            console.error('Failed to load leads:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setPage(1);
        loadData();
    }, [filterStatus, filterPriority]);

    const handleSearch = () => {
        setLoading(true);
        setPage(1);
        loadData();
    };

    const handleReject = async (id: string) => {
        await updateLead(id, { status: 'rejected' });
        loadData();
    };

    const handleQueue = async (ids: string[]) => {
        await handoffLeads(ids);
        setSelected(new Set());
        loadData();
    };

    const handleDelete = async (id: string) => {
        await deleteLead(id);
        loadData();
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

    return (
        <>
            <header className="topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>Lead Finder</span>
                </Link>
                <nav className="topbar-nav">
                    <Link href="/" className="btn btn-ghost btn-sm">← Events</Link>
                    <Link href="/leads/scan" className="btn btn-primary">🔍 Scan URL</Link>
                    <Link href="/leads/seeds" className="btn btn-secondary btn-sm">⚙ Seeds</Link>
                    <ModeSwitch />
                </nav>
            </header>

            <main className="main-content fade-in">
                {/* Stats */}
                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total Leads</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.byPriority['P1'] || 0}</div>
                            <div className="stat-label">🔥 P1 Hot</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.byStatus['queued_for_dj_agent'] || 0}</div>
                            <div className="stat-label">Queued for DJ</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.avgScore}</div>
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

                        {leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(lead => {
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
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleQueue([lead.lead_id])}
                                                    title="Queue for DJ Agent"
                                                >▶</button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleReject(lead.lead_id)}
                                                    title="Reject"
                                                >✕</button>
                                            </>
                                        )}
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleDelete(lead.lead_id)}
                                            title="Delete"
                                        >🗑</button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination */}
                        {leads.length > PAGE_SIZE && (
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
                                    Page {page} of {Math.ceil(leads.length / PAGE_SIZE)} · {leads.length} leads
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={page >= Math.ceil(leads.length / PAGE_SIZE)}
                                    onClick={() => setPage(p => p + 1)}
                                >Next →</button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
