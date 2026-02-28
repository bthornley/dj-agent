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

        {/* Agent 1: Lead Discovery */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            🔍 Agent 1 — Lead Scout
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Autonomously discovers, enriches, and scores gig opportunities across the web
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
            <p>The agent pulls emails, phone numbers, Instagram handles, and booking forms from venue pages.</p>
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
            Drafts personalized booking emails for every lead — 3 variants, one click
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
            <p>Friendly, conversational outreach that feels natural — perfect for bars and club managers.</p>
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
            <p>Upload event photos and DJ set videos. The agents attach them to the right posts automatically.</p>
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
