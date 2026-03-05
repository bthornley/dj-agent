'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface Doc {
    title: string;
    fileName: string;
    category: 'business' | 'tech';
    icon: string;
    description: string;
    format: string;
}

const DOCS: Doc[] = [
    // ── Business Documents ──────────────────────────────
    {
        title: 'Business Plan',
        fileName: 'GigLift_Business_Plan.pptx',
        category: 'business',
        icon: '📊',
        description: 'Comprehensive business plan with TAM analysis, revenue projections, and strategic roadmap.',
        format: 'PPTX',
    },
    {
        title: 'Business Plan (PDF)',
        fileName: 'GigLift_Business_Plan.pdf',
        category: 'business',
        icon: '📄',
        description: 'Printable PDF version of the business plan for distribution.',
        format: 'PDF',
    },
    {
        title: 'Pitch Deck',
        fileName: 'GigLift_Pitch_Deck.pptx',
        category: 'business',
        icon: '🚀',
        description: 'Investor-facing pitch deck with key metrics, funding ask, and growth strategy.',
        format: 'PPTX',
    },
    {
        title: 'Marketing & Sales Plan',
        fileName: 'GigLift_Marketing_Sales_Plan.pptx',
        category: 'business',
        icon: '📣',
        description: 'Go-to-market strategy, customer acquisition channels, and sales pipeline.',
        format: 'PPTX',
    },
    {
        title: 'Strategic Outlook',
        fileName: 'GigLift_Strategic_Outlook.pptx',
        category: 'business',
        icon: '🔮',
        description: 'Risk-adjusted analysis of acquirer fit, competitive landscape, and future prospects.',
        format: 'PPTX',
    },
    {
        title: 'Brand Ambassador Plan',
        fileName: 'GigLift_Brand_Ambassador_Plan.pptx',
        category: 'business',
        icon: '🌟',
        description: 'Ambassador program strategy, incentive structures, and referral mechanics.',
        format: 'PPTX',
    },
    {
        title: 'IP Strategy',
        fileName: 'GigLift_IP_Strategy.pptx',
        category: 'business',
        icon: '🛡️',
        description: 'Trademark & patent plan with cost estimates, risk analysis, and implementation timeline.',
        format: 'PPTX',
    },
    {
        title: 'Launch Cost Estimate',
        fileName: 'GigLift_Launch_Cost_Estimate.pptx',
        category: 'business',
        icon: '💰',
        description: 'Third-party service costs by phase: pre-launch, launch, and growth with optimization strategies.',
        format: 'PPTX',
    },
    {
        title: 'Year 1 Financial Plan',
        fileName: 'GigLift_Year1_Financial_Plan.pptx',
        category: 'business',
        icon: '📊',
        description: 'Projected revenue, costs, P&L, cash flow, break-even analysis, and risk assessment for Year 1.',
        format: 'PPTX',
    },
    // ── Technical Documents ─────────────────────────────
    {
        title: 'System Architecture',
        fileName: 'GigLift_Architecture.pptx',
        category: 'tech',
        icon: '🏗️',
        description: 'Full platform architecture: Next.js, Turso, Clerk, Vercel, and AI agent system.',
        format: 'PPTX',
    },
    {
        title: 'Data Dictionary',
        fileName: 'GigLift_Data_Dictionary.pptx',
        category: 'tech',
        icon: '📖',
        description: 'Complete reference of all data entities, fields, types, and relationships.',
        format: 'PPTX',
    },
    {
        title: 'Database Model',
        fileName: 'GigLift_Database_Model.pptx',
        category: 'tech',
        icon: '🗄️',
        description: 'ERD diagrams, table schemas, indexes, and query patterns.',
        format: 'PPTX',
    },
    {
        title: 'Data Flow Diagrams',
        fileName: 'GigLift_Dataflow.pptx',
        category: 'tech',
        icon: '🔄',
        description: 'End-to-end data flow across agents, APIs, and external integrations.',
        format: 'PPTX',
    },
    {
        title: 'Security Documentation',
        fileName: 'GigLift_Security.pptx',
        category: 'tech',
        icon: '🔒',
        description: 'Security architecture, threat model, auth flows, and compliance posture.',
        format: 'PPTX',
    },
];

export default function AdminDocsPage() {
    const businessDocs = DOCS.filter(d => d.category === 'business');
    const techDocs = DOCS.filter(d => d.category === 'tech');

    const downloadUrl = (doc: Doc) =>
        `/api/admin/docs/${doc.fileName}`;

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="GigLift" style={{ width: 56, height: 56, borderRadius: 12, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm">📊 App</Link>
                    <Link href="/admin" className="btn btn-ghost btn-sm">🛡️ Admin</Link>
                    <Link href="/admin/agents" className="btn btn-ghost btn-sm">🤖 Agents</Link>
                    <Link href="/admin/docs" className="btn btn-secondary btn-sm">📄 Docs</Link>
                    <Link href="/admin/instagram" className="btn btn-ghost btn-sm">📸 Instagram</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">📄 Business & Tech Documents</h2>
                        <p className="section-subtitle">All GigLift documentation — click to download</p>
                    </div>
                </div>

                {/* Business Documents */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--md-primary)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(139,92,246,0.1))',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(168,85,247,0.2)',
                        }}>💼 Business Documents</span>
                        <span style={{ fontSize: '12px', color: 'var(--md-on-surface-variant)' }}>
                            {businessDocs.length} files
                        </span>
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '16px',
                    }}>
                        {businessDocs.map(doc => (
                            <a
                                key={doc.fileName}
                                href={downloadUrl(doc)}
                                download
                                className="card"
                                style={{
                                    textDecoration: 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    padding: '20px',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(168,85,247,0.1)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.4)';
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(168,85,247,0.15)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.1)';
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '28px' }}>{doc.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--md-on-surface)' }}>
                                                {doc.title}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge badge-draft" style={{ fontSize: '10px', flexShrink: 0 }}>
                                        {doc.format}
                                    </span>
                                </div>
                                <p style={{
                                    fontSize: '12px',
                                    color: 'var(--md-on-surface-variant)',
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}>
                                    {doc.description}
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12px',
                                    color: 'var(--md-primary)',
                                    marginTop: '4px',
                                }}>
                                    ⬇️ Download
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Technical Documents */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--md-primary)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(34,197,94,0.2)',
                        }}>🛠️ Technical Documents</span>
                        <span style={{ fontSize: '12px', color: 'var(--md-on-surface-variant)' }}>
                            {techDocs.length} files
                        </span>
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '16px',
                    }}>
                        {techDocs.map(doc => (
                            <a
                                key={doc.fileName}
                                href={downloadUrl(doc)}
                                download
                                className="card"
                                style={{
                                    textDecoration: 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    padding: '20px',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(34,197,94,0.1)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,197,94,0.4)';
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(34,197,94,0.15)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,197,94,0.1)';
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '28px' }}>{doc.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--md-on-surface)' }}>
                                                {doc.title}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge" style={{
                                        fontSize: '10px',
                                        flexShrink: 0,
                                        background: 'rgba(34,197,94,0.1)',
                                        border: '1px solid rgba(34,197,94,0.2)',
                                        color: '#22c55e',
                                    }}>
                                        {doc.format}
                                    </span>
                                </div>
                                <p style={{
                                    fontSize: '12px',
                                    color: 'var(--md-on-surface-variant)',
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}>
                                    {doc.description}
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12px',
                                    color: '#22c55e',
                                    marginTop: '4px',
                                }}>
                                    ⬇️ Download
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
