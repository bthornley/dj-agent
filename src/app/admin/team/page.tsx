'use client';

import Topbar from '@/components/Topbar';

export default function TeamPage() {
    return (
        <>
            <Topbar />
            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">👤 Management Team</h2>
                        <p className="section-subtitle">Leadership behind GigLift</p>
                    </div>
                </div>

                {/* Blake Thornley — Founder & CTO */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(56,189,248,0.05))',
                    border: '1px solid rgba(168,85,247,0.2)',
                    borderRadius: '16px', padding: '32px', marginBottom: '28px',
                }}>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {/* Avatar / Initials */}
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '36px', fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                            BT
                        </div>

                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <h3 style={{ fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                                Blake Thornley
                            </h3>
                            <div style={{ fontSize: '14px', color: '#a855f7', fontWeight: 600, marginBottom: '12px' }}>
                                Founder & CTO
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', margin: '0 0 16px' }}>
                                Technology executive and serial entrepreneur with 25+ years building and scaling cloud-native
                                SaaS platforms. Three-time co-founder with <strong style={{ color: 'var(--text-primary)' }}>three successful exits via acquisition</strong>.
                                Proven track record leading globally distributed engineering teams of 30+, architecting systems
                                with 99.99% uptime, and reducing infrastructure costs by 50%. Deep expertise in cybersecurity,
                                SOC 2 compliance, and application security.
                            </p>

                            {/* Key stats */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {[
                                    { label: 'Successful Exits', value: '3', color: '#10b981' },
                                    { label: 'Years Experience', value: '25+', color: '#3b82f6' },
                                    { label: 'Team Size Led', value: '30+', color: '#f97316' },
                                    { label: 'Uptime Achieved', value: '99.99%', color: '#a855f7' },
                                ].map((stat) => (
                                    <div key={stat.label} style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px', padding: '12px 16px', textAlign: 'center', minWidth: '100px',
                                    }}>
                                        <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Career Timeline */}
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>🏆 Track Record</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                    {[
                        {
                            role: 'Founder & CTO',
                            company: 'GigLift',
                            period: 'Mar 2026 – Present',
                            highlight: 'AI-powered SaaS platform for musicians — 10 autonomous agents, Next.js/React/TypeScript',
                            badge: '🚀 Current',
                            badgeColor: '#a855f7',
                        },
                        {
                            role: 'VP, Engineering',
                            company: 'ELEVATE',
                            period: 'Sep 2020 – Feb 2026',
                            highlight: 'Led engineering, QA, infra & security. Spearheaded SOC 2 compliance and cybersecurity program.',
                            badge: '🛡️ 5.5 yrs',
                            badgeColor: '#3b82f6',
                        },
                        {
                            role: 'Co-Founder / CTO / Board Member',
                            company: 'Total Global Sports, Inc.',
                            period: 'Aug 2012 – Jun 2020',
                            highlight: '99.99% uptime, reduced AWS costs 50%, managed 12 engineers. Acquired by AthleteOne.',
                            badge: '✅ Exit #3',
                            badgeColor: '#10b981',
                        },
                        {
                            role: 'VP, IT & Architecture',
                            company: 'Clubspaces, Inc.',
                            period: 'Apr 2007 – Jan 2010',
                            highlight: '30-person engineering team. $1M+ revenue, 1M+ users. LA Galaxy & DC United contracts. Acquired by The Active Network.',
                            badge: '✅ Exit #2',
                            badgeColor: '#10b981',
                        },
                        {
                            role: 'Co-Founder / VP, Technology',
                            company: 'D4 Sports, Inc.',
                            period: 'Mar 2002 – Apr 2007',
                            highlight: 'League management SaaS. Founding team → 25 employees, $500K+ ARR. Acquired by Clubspaces.',
                            badge: '✅ Exit #1',
                            badgeColor: '#10b981',
                        },
                    ].map((item, i) => (
                        <div key={i} style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px', padding: '16px 20px',
                            borderLeft: `3px solid ${item.badgeColor}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {item.role}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#a855f7', fontWeight: 500 }}>{item.company}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.period}</span>
                                    <span className="badge" style={{
                                        fontSize: '10px', background: `${item.badgeColor}22`, color: item.badgeColor,
                                        border: `1px solid ${item.badgeColor}44`,
                                    }}>
                                        {item.badge}
                                    </span>
                                </div>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: '1.5' }}>
                                {item.highlight}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Skills & Education */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {/* Skills */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', padding: '20px',
                    }}>
                        <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 12px' }}>💻 Technical Skills</h4>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                                'TypeScript', 'React/Next.js', 'Node.js', 'Python', 'C#/.NET',
                                'AWS', 'Vercel', 'Docker', 'CI/CD',
                                'PostgreSQL', 'SQLite', 'SQL Server',
                                'Stripe', 'Clerk', 'REST APIs',
                                'Agentic AI', 'NLP', 'OpenAI',
                                'SOC 2', 'AppSec', 'SDLC',
                            ].map(skill => (
                                <span key={skill} className="badge badge-draft" style={{ fontSize: '10px' }}>{skill}</span>
                            ))}
                        </div>
                    </div>

                    {/* Education */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', padding: '20px',
                    }}>
                        <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 12px' }}>🎓 Education</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Stanford University</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Continuing Education — Software Security, Cryptography, Game Theory, HCI, Startup Engineering</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>University of Redlands</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Management Information Systems</div>
                            </div>
                        </div>

                        <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '16px 0 8px' }}>🌐 Languages</h4>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="badge" style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>English (native)</span>
                            <span className="badge" style={{ fontSize: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>Spanish (fluent)</span>
                            <span className="badge" style={{ fontSize: '10px', background: 'rgba(168,85,247,0.15)', color: '#c4b5fd' }}>French (intermediate)</span>
                        </div>
                    </div>
                </div>

                {/* Investor note */}
                <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '12px', padding: '16px 20px', marginBottom: '28px',
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '6px' }}>
                        📊 Why This Matters for Investors
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                        Blake has built and exited <strong style={{ color: 'var(--text-primary)' }}>three SaaS companies</strong> in
                        the sports-tech vertical — the same playbook now applied to music-tech. Each company scaled from
                        founding team to acquisition: D4 Sports → Clubspaces ($1M+ revenue, 1M users, MLS contracts) →
                        The Active Network. Most recently led a 5+ year tenure as VP Engineering overseeing SOC 2 compliance
                        and enterprise security. GigLift represents a founder with a <strong style={{ color: 'var(--text-primary)' }}>
                            proven pattern of building, scaling, and exiting</strong> vertical SaaS platforms.
                    </p>
                </div>
            </main>
        </>
    );
}
