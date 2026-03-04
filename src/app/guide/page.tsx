import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'User Guide — GigLift',
    description: 'Complete guide to using GigLift: 7 AI agents, 4 modes, lead discovery, EPK builder, social media hub, flyer creator, booking calendar, and more.',
};

export default function GuidePage() {
    return (
        <div style={{ background: '#0a0a1a', minHeight: '100vh', color: '#e0e0e8' }}>
            {/* Header */}
            <header className="topbar landing-topbar" style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(10,10,26,0.85)' }}>
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 56, height: 56, borderRadius: 12, filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.4))' }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm">Dashboard</Link>
                    <Link href="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
                    <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started Free</Link>
                </nav>
            </header>

            <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 96px' }}>

                {/* Title Section */}
                <div style={{ textAlign: 'center', marginBottom: 56 }}>
                    <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 20, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', fontSize: 13, fontWeight: 600, color: '#a855f7', marginBottom: 16 }}>
                        📖 User Guide
                    </div>
                    <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
                        The Complete Guide to{' '}
                        <span style={{ background: 'linear-gradient(135deg, #a855f7, #00d4e6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GigLift</span>
                    </h1>
                    <p style={{ fontSize: 18, color: '#888', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
                        Everything you need to know to get the most out of your 7 AI agents, 4 discovery modes, and complete booking toolkit.
                    </p>
                </div>

                {/* Table of Contents */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '28px 32px', marginBottom: 56 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a855f7', margin: '0 0 16px' }}>Contents</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
                        {[
                            ['#getting-started', '1. Getting Started'],
                            ['#modes', '2. Four Discovery Modes'],
                            ['#agents', '3. Your 7 AI Agents'],
                            ['#dashboard', '4. The Dashboard'],
                            ['#scanning', '5. Scanning for Leads'],
                            ['#seeds', '6. Query Seeds'],
                            ['#leads', '7. Managing Leads'],
                            ['#epk', '8. EPK Builder'],
                            ['#social', '9. Social Media Hub'],
                            ['#flyer', '10. AI Flyer Creator'],
                            ['#emails', '11. Email System'],
                            ['#booking', '12. Booking Calendar'],
                            ['#ambassador', '13. Ambassador Program'],
                            ['#plans', '14. Plans & Billing'],
                        ].map(([href, label]) => (
                            <a key={href} href={href} style={{ color: '#ccc', textDecoration: 'none', padding: '6px 0', fontSize: 15, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                {label}
                            </a>
                        ))}
                    </div>
                </div>

                {/* ── Getting Started ── */}
                <Section id="getting-started" icon="🚀" title="Getting Started" num={1}>
                    <h3 style={h3}>Sign Up & Onboarding</h3>
                    <p style={p}>
                        Create your free account at <a href="https://giglift.com/sign-up" style={link}>giglift.com</a>.
                        You&apos;ll be guided through a quick onboarding flow where you set up your <strong>brand profile</strong>:
                    </p>
                    <ul style={ul}>
                        <li>Your artist/DJ name and bio</li>
                        <li>Genres and services you offer</li>
                        <li>Your location and service radius</li>
                        <li>Social media handles</li>
                        <li>Upload a logo and brand photos</li>
                    </ul>
                    <Tip>Your brand profile powers everything — it&apos;s used by the AI agents to personalize outreach emails, generate your EPK, create social content, and design flyers.</Tip>

                    <h3 style={h3}>Selecting Your Mode</h3>
                    <p style={p}>
                        After onboarding, you&apos;ll land on the <strong>Dashboard</strong>. Use the <strong>Mode Switch</strong> in the top bar
                        to select which type of opportunity you&apos;re looking for. Your mode determines what the AI agents search for,
                        what seeds are available, and how outreach emails are worded.
                    </p>
                </Section>

                {/* ── Modes ── */}
                <Section id="modes" icon="🎛️" title="Four Discovery Modes" num={2}>
                    <p style={p}>GigLift adapts its entire AI pipeline based on which mode you select:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' }}>
                        {[
                            { emoji: '🎵', name: 'Performer', desc: 'Venues, events, festivals, and booking opportunities', color: '#a855f7' },
                            { emoji: '📚', name: 'Instructor', desc: 'Music schools, studios, and teaching opportunities', color: '#0ea5e9' },
                            { emoji: '🎙️', name: 'Studio', desc: 'Recording studios, session work, and sync licensing', color: '#f97316' },
                            { emoji: '🚐', name: 'Touring', desc: 'Tour routing, booking agents, and festival circuits', color: '#22c55e' },
                        ].map(m => (
                            <div key={m.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '16px 20px', border: `1px solid ${m.color}22` }}>
                                <div style={{ fontSize: 24 }}>{m.emoji}</div>
                                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{m.name} Mode</div>
                                <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{m.desc}</div>
                            </div>
                        ))}
                    </div>
                    <Tip>You can switch modes at any time from the top bar. Your leads and bookings persist across all modes — only the scan focus changes.</Tip>
                </Section>

                {/* ── Agents ── */}
                <Section id="agents" icon="🤖" title="Your 7 AI Agents" num={3}>
                    <p style={p}>Every GigLift account comes with 7 specialized AI agents working behind the scenes:</p>
                    {[
                        { emoji: '🔍', name: 'Lead Scout', desc: 'Discovers venues, schools, studios, and festivals across 10+ data sources. Uses Google Places, Yelp, Eventbrite, and web scraping to find opportunities that match your profile, genre, and location.' },
                        { emoji: '✉️', name: 'Outreach Writer', desc: 'Drafts mode-aware emails personalized to each lead. Booking requests for performers, lesson proposals for instructors, session pitches for studios. Every email reflects your brand voice and bio.' },
                        { emoji: '📋', name: 'EPK Architect', desc: 'Generates a complete Electronic Press Kit with AI-crafted bio, theme selection, social links, embedded media, and a shareable public URL. Updates automatically as your brand profile evolves.' },
                        { emoji: '📱', name: 'Social Strategist', desc: 'Creates weekly content plans with Reels ideas, carousel concepts, Stories, and captions. Generates ready-to-post content tailored to your genre, voice, and upcoming events.' },
                        { emoji: '📊', name: 'Smart Scoring', desc: 'Evaluates every discovered lead on a 0–100 quality scale. Factors include relevance to your genre, location proximity, venue capacity, and data completeness. Automatically deduplicates results.' },
                        { emoji: '🎨', name: 'Flyer Creator', desc: 'Designs professional event flyers with DALL·E 3 AI backgrounds. Adds your logo overlay, auto-generates QR codes, and exports print-ready PNGs. Perfect for promoting upcoming gigs.' },
                        { emoji: '📅', name: 'Booking Manager', desc: 'Provides a calendar view of all your bookings with color-coded statuses (confirmed, pending, completed, cancelled). Quick-add events directly from the dashboard.' },
                    ].map(a => (
                        <div key={a.name} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ fontSize: 28, flexShrink: 0, width: 40, textAlign: 'center' }}>{a.emoji}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{a.name}</div>
                                <div style={{ color: '#999', fontSize: 15, lineHeight: 1.6 }}>{a.desc}</div>
                            </div>
                        </div>
                    ))}
                </Section>

                {/* ── Dashboard ── */}
                <Section id="dashboard" icon="📊" title="The Dashboard" num={4}>
                    <p style={p}>
                        Your command center. The dashboard shows your upcoming events, lead stats, scan quota, and quick actions.
                    </p>
                    <h3 style={h3}>Key Dashboard Elements</h3>
                    <ul style={ul}>
                        <li><strong>Mode indicator</strong> — Shows your current mode (Performer, Instructor, Studio, Touring) with color-coded accent</li>
                        <li><strong>Stats bar</strong> — Total leads, scan quota remaining, upcoming events count, and email stats</li>
                        <li><strong>Event list / Calendar toggle</strong> — Switch between list view and calendar view of your bookings</li>
                        <li><strong>Quick-add modal</strong> — Click &ldquo;+ New Inquiry&rdquo; to manually add a booking directly from the dashboard</li>
                        <li><strong>Quick links</strong> — One-click access to scan, leads, EPK, social, and flyer tools</li>
                    </ul>
                    <h3 style={h3}>Calendar View</h3>
                    <p style={p}>
                        Toggle to calendar view for a monthly overview of your bookings. Events are color-coded by status:
                    </p>
                    <ul style={ul}>
                        <li><strong style={{ color: '#22c55e' }}>Green</strong> — Confirmed</li>
                        <li><strong style={{ color: '#f59e0b' }}>Amber</strong> — Pending</li>
                        <li><strong style={{ color: '#3b82f6' }}>Blue</strong> — Completed</li>
                        <li><strong style={{ color: '#ef4444' }}>Red</strong> — Cancelled</li>
                    </ul>
                </Section>

                {/* ── Scanning ── */}
                <Section id="scanning" icon="🔍" title="Scanning for Leads" num={5}>
                    <p style={p}>
                        Navigate to <strong>Scan for Leads</strong> from the dashboard. GigLift offers three scan methods:
                    </p>
                    <h3 style={h3}>1. Auto Scan (Recommended)</h3>
                    <p style={p}>
                        Select a region from your configured seeds and choose how many leads to find (5–50).
                        The Lead Scout agent will automatically search multiple sources, score results, deduplicate,
                        and deliver enriched leads — all in about 30 seconds.
                    </p>
                    <h3 style={h3}>2. Batch URL Scan</h3>
                    <p style={p}>
                        Paste a list of venue/school/studio URLs (one per line). GigLift will scrape each site,
                        extract contact info, and create enriched lead records. Great for when you have a list from another source.
                    </p>
                    <h3 style={h3}>3. Single URL Scan</h3>
                    <p style={p}>
                        Scan a single website URL for lead extraction. Enter the URL, entity name, and location for the most precise results.
                    </p>
                    <Tip>
                        Free accounts get 5 auto-scans per month. Pro unlocks 50 scans, and Unlimited gives you 200+ scans per month.
                    </Tip>
                </Section>

                {/* ── Seeds ── */}
                <Section id="seeds" icon="🌱" title="Query Seeds" num={6}>
                    <p style={p}>
                        Seeds are pre-configured search templates that tell your AI agents <em>where</em> and <em>what</em> to look for.
                        Navigate to <strong>Query Seeds</strong> from the dashboard.
                    </p>
                    <h3 style={h3}>How Seeds Work</h3>
                    <ul style={ul}>
                        <li>Each seed defines a <strong>region</strong> (city/state), <strong>search queries</strong>, and <strong>venue types</strong></li>
                        <li>Seeds change based on your active mode — performer seeds search for venues, instructor seeds search for schools</li>
                        <li>The auto-scan feature uses your seeds to know which regions and queries to run</li>
                        <li>You can create custom seeds for specific markets you want to target</li>
                    </ul>
                    <Tip>Start with 2–3 seeds in your local area, then expand as you validate results. Quality seeds = quality leads.</Tip>
                </Section>

                {/* ── Leads ── */}
                <Section id="leads" icon="📋" title="Managing Leads" num={7}>
                    <p style={p}>
                        The <strong>Leads</strong> page is your pipeline. Every lead discovered by the Lead Scout is organized here with quality scores,
                        status tracking, and one-click actions.
                    </p>
                    <h3 style={h3}>Lead Statuses</h3>
                    <ul style={ul}>
                        <li><strong>New</strong> — Freshly discovered, not yet reviewed</li>
                        <li><strong>Contacted</strong> — Outreach email sent</li>
                        <li><strong>Responded</strong> — Lead has replied</li>
                        <li><strong>Booked</strong> — Converted to a booking</li>
                        <li><strong>Rejected</strong> — Not a fit, dismissed</li>
                    </ul>
                    <h3 style={h3}>Lead Detail View</h3>
                    <p style={p}>
                        Click any lead to see full details: contact info, website, social links, AI quality score breakdown,
                        enrichment data, and outreach history. From here you can:
                    </p>
                    <ul style={ul}>
                        <li>Generate a personalized outreach email with one click</li>
                        <li>Hand off the lead to create a booking/event</li>
                        <li>Update the lead status</li>
                        <li>View the venue on a map</li>
                    </ul>
                </Section>

                {/* ── EPK ── */}
                <Section id="epk" icon="📋" title="EPK Builder" num={8}>
                    <p style={p}>
                        The <strong>Electronic Press Kit</strong> is your digital resume for venues and promoters.
                        Navigate to <strong>EPK Builder</strong> from the sidebar.
                    </p>
                    <h3 style={h3}>What&apos;s Included</h3>
                    <ul style={ul}>
                        <li>AI-written professional bio based on your brand profile</li>
                        <li>Genre tags and service offerings</li>
                        <li>Social media links with live follower counts</li>
                        <li>Embedded media (SoundCloud, YouTube, Spotify links)</li>
                        <li>Photo gallery from your brand assets</li>
                        <li>Contact information and booking details</li>
                    </ul>
                    <h3 style={h3}>Theme Selection</h3>
                    <p style={p}>
                        Choose from multiple visual themes to match your brand aesthetic.
                        Each theme renders your EPK with different colors, layouts, and typography.
                    </p>
                    <h3 style={h3}>Shareable URL</h3>
                    <p style={p}>
                        Your EPK gets a unique public URL (e.g., <code>giglift.com/epk/your-name</code>) that you can share
                        with venues, promoters, and booking agents. No login required for viewers.
                    </p>
                </Section>

                {/* ── Social ── */}
                <Section id="social" icon="📱" title="Social Media Hub" num={9}>
                    <p style={p}>
                        Your complete social media command center. Access it from <strong>Social</strong> in the nav.
                    </p>
                    <h3 style={h3}>Brand Profile</h3>
                    <p style={p}>
                        Set your DJ/artist name, genres, bio, logo, and brand colors. This profile feeds into all AI-generated content,
                        ensuring consistent voice across outreach, social posts, and flyers.
                    </p>
                    <h3 style={h3}>Content Queue</h3>
                    <p style={p}>
                        The Social Strategist agent generates weekly content plans with ready-to-post items:
                    </p>
                    <ul style={ul}>
                        <li><strong>Reels</strong> — Short-form video concepts with hooks and CTAs</li>
                        <li><strong>Carousels</strong> — Multi-slide educational/promo content</li>
                        <li><strong>Stories</strong> — Quick engagement posts and polls</li>
                        <li><strong>Feed Posts</strong> — Long-form captions with hashtag strategies</li>
                    </ul>
                    <p style={p}>
                        Each post includes a caption, suggested media, optimal posting time, and hashtags.
                        Mark posts as scheduled, published, or dismissed.
                    </p>
                    <h3 style={h3}>Media Library</h3>
                    <p style={p}>
                        Upload and manage your brand assets: photos, logos, promo graphics, and flyers.
                        These assets are available across the platform for EPK, social posts, and flyer creation.
                    </p>
                    <h3 style={h3}>Analytics</h3>
                    <p style={p}>
                        Track your content pipeline: posts generated, scheduled, published, and engagement trends over time.
                    </p>
                </Section>

                {/* ── Flyer ── */}
                <Section id="flyer" icon="🎨" title="AI Flyer Creator" num={10}>
                    <p style={p}>
                        Create professional event flyers in minutes. Navigate to <strong>Create Flyer</strong> from the dashboard.
                    </p>
                    <h3 style={h3}>How It Works</h3>
                    <ol style={ul}>
                        <li>Enter your event details: name, date, time, venue, DJ lineup</li>
                        <li>Choose a visual style and color palette</li>
                        <li>GigLift generates an AI background using <strong>DALL·E 3</strong></li>
                        <li>Your <strong>logo is automatically overlaid</strong> on the design</li>
                        <li>A <strong>QR code</strong> is generated linking to your event or EPK</li>
                        <li>Download the print-ready PNG</li>
                    </ol>
                    <Tip>
                        Use generated flyers for Instagram posts, stories, physical prints, and email attachments.
                        The high-resolution output works for both digital and print.
                    </Tip>
                </Section>

                {/* ── Emails ── */}
                <Section id="emails" icon="✉️" title="Email System" num={11}>
                    <p style={p}>
                        GigLift&apos;s email system is powered by the Outreach Writer agent and Resend for reliable delivery.
                    </p>
                    <h3 style={h3}>Outreach Emails</h3>
                    <p style={p}>
                        From any lead detail page, click <strong>Generate Outreach</strong> to create a personalized email.
                        The AI uses your brand profile, the lead&apos;s details, and your active mode to craft the perfect pitch:
                    </p>
                    <ul style={ul}>
                        <li><strong>Performer mode</strong> — Booking requests highlighting your experience and genre fit</li>
                        <li><strong>Instructor mode</strong> — Lesson proposals with teaching credentials</li>
                        <li><strong>Studio mode</strong> — Session pitches and collaboration proposals</li>
                        <li><strong>Touring mode</strong> — Tour date requests and festival applications</li>
                    </ul>
                    <h3 style={h3}>Email Manager</h3>
                    <p style={p}>
                        The <strong>Emails</strong> page shows all outreach history: sent, opened, replied, and bounced.
                        Filter by status and lead to track your outreach funnel.
                    </p>
                </Section>

                {/* ── Booking Calendar ── */}
                <Section id="booking" icon="📅" title="Booking Calendar" num={12}>
                    <p style={p}>
                        Manage all your bookings from the dashboard calendar view.
                    </p>
                    <h3 style={h3}>Adding Events</h3>
                    <ul style={ul}>
                        <li><strong>From leads</strong> — Hand off a lead to automatically create an event with venue details pre-filled</li>
                        <li><strong>Quick-add</strong> — Click &ldquo;+ New Inquiry&rdquo; on the dashboard to manually create a booking</li>
                        <li><strong>From inquiries</strong> — Use the <strong>New Inquiry</strong> form for detailed event creation with client info, dates, and requirements</li>
                    </ul>
                    <h3 style={h3}>Event Details</h3>
                    <p style={p}>
                        Each event tracks: client name, venue, date/time, event type, status, gear checklist,
                        setlist notes, and a timeline of status changes. Update statuses as events progress through
                        your pipeline.
                    </p>
                </Section>

                {/* ── Ambassador ── */}
                <Section id="ambassador" icon="🤝" title="Ambassador Program" num={13}>
                    <p style={p}>
                        Earn money and free access by sharing GigLift with other musicians.
                    </p>
                    <h3 style={h3}>How It Works</h3>
                    <ol style={ul}>
                        <li>Get your unique referral link from the <strong>Ambassador Dashboard</strong></li>
                        <li>Share it with fellow DJs, musicians, and producers</li>
                        <li>Earn <strong>20% recurring commission</strong> on every paying subscriber you refer</li>
                        <li>Refer <strong>3 paying subscribers</strong> and get <strong>free Pro access</strong> for life</li>
                    </ol>
                    <h3 style={h3}>Ambassador Dashboard</h3>
                    <p style={p}>
                        Track your referrals in real time: signups, active subscribers, plan levels,
                        total commission earned, and conversion rates. One-click copy for your referral link.
                    </p>
                </Section>

                {/* ── Plans ── */}
                <Section id="plans" icon="💰" title="Plans & Billing" num={14}>
                    <p style={p}>
                        GigLift offers four plans to fit every stage of your career:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, margin: '16px 0' }}>
                        {[
                            { name: 'Free', price: '$0', features: ['5 scans/month', '1 mode', 'Basic EPK', '10 leads storage'] },
                            { name: 'Pro', price: '$33/mo', features: ['50 scans/month', 'All 4 modes', 'Full EPK builder', 'Unlimited leads', 'Social content'] },
                            { name: 'Unlimited', price: '$79/mo', features: ['200+ scans/month', 'Priority AI processing', 'Flyer creator', 'Email outreach', 'Advanced analytics'] },
                            { name: 'Agency', price: '$149/mo', features: ['Unlimited everything', 'Multi-artist management', 'White-label EPKs', 'API access', 'Priority support'] },
                        ].map(plan => (
                            <div key={plan.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontWeight: 800, fontSize: 18 }}>{plan.name}</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#a855f7', margin: '4px 0 12px' }}>{plan.price}</div>
                                <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#999', fontSize: 14, lineHeight: 1.8 }}>
                                    {plan.features.map(f => <li key={f}>{f}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <p style={{ ...p, textAlign: 'center', marginTop: 24 }}>
                        <Link href="/pricing" style={{ ...link, fontWeight: 700, fontSize: 16 }}>View Full Pricing Details →</Link>
                    </p>
                </Section>

                {/* Footer CTA */}
                <div style={{ textAlign: 'center', marginTop: 64, padding: '48px 32px', borderRadius: 20, background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(0,212,230,0.05))', border: '1px solid rgba(168,85,247,0.15)' }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px' }}>Ready to Get Started?</h2>
                    <p style={{ color: '#888', fontSize: 16, marginBottom: 24 }}>Deploy your 7 AI agents and start finding gigs today.</p>
                    <Link href="/sign-up" style={{
                        display: 'inline-block', padding: '16px 40px', borderRadius: 12,
                        background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff',
                        fontSize: 17, fontWeight: 700, textDecoration: 'none',
                        boxShadow: '0 0 40px rgba(168,85,247,0.3)',
                    }}>
                        Get Started Free →
                    </Link>
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', color: '#555', fontSize: 13 }}>
                    <p>GigLift — Lift your gigs to the next level</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                        <Link href="/terms" style={{ color: '#666', textDecoration: 'none' }}>Terms</Link>
                        <Link href="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy</Link>
                        <Link href="/pricing" style={{ color: '#666', textDecoration: 'none' }}>Pricing</Link>
                        <Link href="/ambassador" style={{ color: '#666', textDecoration: 'none' }}>Ambassadors</Link>
                    </div>
                </div>
            </main>
        </div>
    );
}


/* ──────────── Reusable sub-components & styles ──────────── */

const p: React.CSSProperties = { color: '#bbb', fontSize: 16, lineHeight: 1.7, margin: '0 0 16px' };
const h3: React.CSSProperties = { fontSize: 18, fontWeight: 700, margin: '28px 0 8px', color: '#e0e0e8' };
const ul: React.CSSProperties = { color: '#bbb', fontSize: 15, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 };
const link: React.CSSProperties = { color: '#a855f7', textDecoration: 'none' };

function Section({ id, icon, title, num, children }: { id: string; icon: string; title: string; num: number; children: React.ReactNode }) {
    return (
        <section id={id} style={{ marginBottom: 56, scrollMarginTop: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                    <span style={{ color: '#555', fontSize: 20, marginRight: 8 }}>{num}.</span>
                    {title}
                </h2>
            </div>
            {children}
        </section>
    );
}

function Tip({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)',
            borderRadius: 12, padding: '14px 18px', margin: '16px 0',
            display: 'flex', gap: 10, alignItems: 'flex-start',
            fontSize: 14, color: '#ccc', lineHeight: 1.6,
        }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <span>{children}</span>
        </div>
    );
}
