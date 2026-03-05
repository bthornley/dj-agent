'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import { SentEmail } from '@/lib/types';
import { fetchSentEmails } from '@/lib/api-client';

export default function SentEmailsPage() {
    const [emails, setEmails] = useState<SentEmail[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        fetchSentEmails()
            .then(setEmails)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    function formatDate(iso: string): string {
        try {
            return new Date(iso).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
            });
        } catch { return iso; }
    }

    return (
        <>
            <Topbar />

            <main className="main-content fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>📧 Sent Emails</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            {emails.length} email{emails.length !== 1 ? 's' : ''} sent
                        </p>
                    </div>
                    {emails.length > 0 && (
                        <a href="/api/emails/export" className="btn btn-ghost btn-sm" download>📥 Export CSV</a>
                    )}
                </div>

                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner" />
                        <span>Loading emails...</span>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">✉️</div>
                        <h3>No emails sent yet</h3>
                        <p>When you send email drafts from event pages, they&apos;ll appear here.</p>
                        <Link href="/dashboard" className="btn btn-primary">← Back to Dashboard</Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {emails.map(email => (
                            <div
                                key={email.id}
                                className="card"
                                style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                                onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                                            {email.subject}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            To: {email.toEmail}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                        <span className={`badge ${email.status === 'sent' ? 'badge-confirmed' : 'badge-inquiry'}`}>
                                            {email.status === 'sent' ? '✓ Sent' : '✗ Failed'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {formatDate(email.sentAt)}
                                        </span>
                                        {email.eventId && (
                                            <Link
                                                href={`/event?id=${email.eventId}`}
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                View Event →
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {expanded === email.id && (
                                    <div style={{
                                        marginTop: '16px', paddingTop: '16px',
                                        borderTop: '1px solid var(--glass-border)',
                                    }}>
                                        <div style={{
                                            background: 'var(--surface-1)',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            fontSize: '14px',
                                            lineHeight: 1.7,
                                            whiteSpace: 'pre-wrap',
                                            color: 'var(--text-secondary)',
                                        }}>
                                            {email.body}
                                        </div>
                                        {email.resendId && (
                                            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                Resend ID: {email.resendId}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
