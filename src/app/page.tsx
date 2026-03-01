import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <>
      <header className="landing-topbar">
        <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
          <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
          <span>GigLift</span>
        </Link>
        <nav className="topbar-nav" style={{ gap: '8px' }}>
          <Link href="/promo.html" className="btn btn-ghost btn-sm" target="_blank">🎬 Watch Promo</Link>
          <Link href="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
          <Link href="/sign-in" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started Free</Link>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">🤖 5 AI Agents Working While You Sleep</div>
          <h1 className="hero-title">
            Your AI Agent Team That <span className="hero-accent">Finds, Books &amp; Promotes</span> Your Gigs
          </h1>
          <p className="hero-subtitle">
            GigLift deploys a crew of autonomous AI agents that discover venues, score leads,
            draft booking emails, build your press kit, and plan your social content — all on autopilot.
            For DJs, bands, solo artists &amp; music teachers.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(139, 92, 246, 0.1))',
              border: '1px solid rgba(168, 85, 247, 0.3)', color: '#a855f7',
            }}>🎵 Performer Mode</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(34, 211, 238, 0.1))',
              border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8',
            }}>📚 Teacher Mode</span>
          </div>

          <div className="hero-actions">
            <Link href="/sign-up" className="btn btn-primary btn-xl">Deploy Your Agents Free</Link>
            <Link href="/promo.html" className="btn btn-secondary btn-xl" target="_blank">🎬 Watch the Promo</Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">5 Agents</div>
              <div className="hero-stat-label">Working For You 24/7</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">250+</div>
              <div className="hero-stat-label">Leads Found/Month</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">100%</div>
              <div className="hero-stat-label">Autonomous</div>
            </div>
          </div>
        </div>

        {/* ═══════ Two Modes Section ═══════ */}
        <div style={{ textAlign: 'center', marginTop: '56px', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(56,189,248,0.12))',
            border: '1px solid rgba(168,85,247,0.2)',
            color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            ✨ Two Modes · One Platform
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Whether You <span style={{ color: '#a855f7' }}>Perform</span> or <span style={{ color: '#38bdf8' }}>Teach</span> — We&apos;ve Got You
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Switch between modes with one click. Each mode comes with its own seeds, lead pipeline, and tailored discovery.
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
          maxWidth: '900px', margin: '0 auto 56px auto', padding: '0 16px',
        }}>
          {/* Performer Card */}
          <div style={{
            padding: '28px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.03), rgba(15,15,35,0.95))',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 0 30px rgba(168,85,247,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                fontSize: '32px', width: 56, height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))',
                border: '1px solid rgba(168,85,247,0.3)',
              }}>🎵</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#a855f7' }}>Performer Mode</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  For DJs, bands &amp; solo artists
                </p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Your AI agents scan for nightclubs, lounges, event spaces, bars, and festivals — then score each venue on
              music fit, capacity, and booking potential.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                What the agents find
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Nightclubs', 'Lounges', 'Event Spaces', 'Rooftop Bars', 'Live Music Venues', 'Corporate Events', 'Weddings', 'Festivals'].map(tag => (
                  <span key={tag} style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                    color: '#c084fc',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong style={{ color: '#a855f7' }}>Example seeds:</strong> &quot;DJ night Orange County&quot; · &quot;site:gigsalad.com DJ&quot; · &quot;corporate event venue Long Beach&quot;
            </div>
          </div>

          {/* Teacher Card */}
          <div style={{
            padding: '28px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(34,211,238,0.03), rgba(15,15,35,0.95))',
            border: '1px solid rgba(56,189,248,0.25)',
            boxShadow: '0 0 30px rgba(56,189,248,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                fontSize: '32px', width: 56, height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(34,211,238,0.1))',
                border: '1px solid rgba(56,189,248,0.3)',
              }}>📚</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>Teacher Mode</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  For music instructors &amp; educators
                </p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Your AI agents discover music schools, after-school programs, community centers, churches, and studios
              that need music teachers — and rank them by opportunity quality.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                What the agents find
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Music Schools', 'Academies', 'School Districts', 'After-School Programs', 'Community Centers', 'Preschools', 'Churches', 'Studios'].map(tag => (
                  <span key={tag} style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                    color: '#7dd3fc',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong style={{ color: '#38bdf8' }}>Example seeds:</strong> &quot;music school Orange County&quot; · &quot;after school music program&quot; · &quot;community center music class&quot;
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Link href="/sign-up" className="btn btn-primary btn-xl" style={{ marginRight: '12px' }}>
            Get Started Free — Both Modes Included
          </Link>
        </div>

        {/* Agent 1: Lead Discovery */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            🔍 Agent 1 — Lead Scout
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Autonomously discovers, enriches, and scores opportunities across the web — venues, schools, studios, and more
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Web Crawling</h3>
            <p>The agent scans Google, Craigslist, GigSalad, Thumbtack, Bark, and Facebook Marketplace automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Lead Scoring</h3>
            <p>Every lead is scored 0-100 by the agent based on music fit, budget signals, and booking potential.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📧</div>
            <h3>Contact Extraction</h3>
            <p>The agent pulls emails, phone numbers, Instagram handles, and booking forms from venue and organization pages.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Quality Filtering</h3>
            <p>Only P1 and P2 leads reach your dashboard. The agent filters the noise so you don&apos;t have to.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Monthly Auto-Scan</h3>
            <p>Set it and forget it — the agent runs monthly scans on your configured regions and artist types.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎵</div>
            <h3>Music Fit Tags</h3>
            <p>The agent tags each venue with genre matches — EDM, house, hip-hop, Latin, top 40, and more.</p>
          </div>
        </div>

        {/* Agent 2: Outreach */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            ✉️ Agent 2 — Outreach Writer
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Drafts personalized outreach emails tailored to your mode — booking inquiries for performers, lesson proposals for teachers
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">💼</div>
            <h3>Formal Pitch</h3>
            <p>Professional tone with venue-specific details, your experience highlights, and a clear CTA.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">😎</div>
            <h3>Casual Intro</h3>
            <p>Friendly, conversational outreach that feels natural — adapts to each lead type automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔁</div>
            <h3>Follow-Up</h3>
            <p>A concise follow-up email template referencing your original pitch. Don&apos;t let leads go cold.</p>
          </div>
        </div>

        {/* Agent 3: EPK Builder */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            📋 Agent 3 — EPK Architect
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Builds your professional press kit with AI-written bios, taglines, and a shareable public page
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">✍️</div>
            <h3>AI Bio Writer</h3>
            <p>Generates 3 bio variants — professional, casual, storytelling — based on your brand profile.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Theme Designer</h3>
            <p>Pick dark, light, or gradient themes with custom accent colors. Your EPK, your look.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h3>Public Shareable Page</h3>
            <p>One link to share with venues. No login needed — they see your curated best work instantly.</p>
          </div>
        </div>

        {/* Agent 4-5: Social Hype */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            📱 Agents 4 & 5 — Social Hype Crew
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            A strategist + copywriter duo that builds your brand on autopilot
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Brand Voice Setup</h3>
            <p>Define your vibe, genre, and tone. The agents write posts that sound like you, not a robot.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Weekly Content Plans</h3>
            <p>The strategist agent generates a themed 7-day plan with Reels, carousels, stories, and FB posts.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✍️</div>
            <h3>A/B Post Drafts</h3>
            <p>The copywriter agent creates two hook variants per post. Captions, hashtags, and CTAs included.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h3>Media Library</h3>
            <p>Upload event photos, performance videos, and lesson clips. The agents attach them to the right posts automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Engagement Copilot</h3>
            <p>Daily checklist of comments to reply, DMs to send, and collabs to reach out to — with draft replies.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Track post performance, engagement rates, and content pillar distribution across platforms.</p>
          </div>
        </div>
      </main>

      <footer className="landing-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</Link>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <Link href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</Link>
        </div>
        <p>© 2026 GigLift. Your AI agent team for the music hustle.</p>
      </footer>
    </>
  );
}
