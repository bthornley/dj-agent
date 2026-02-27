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
          <div className="icon">🎵</div>
          <span>GigLift</span>
        </Link>
        <nav className="topbar-nav" style={{ gap: '8px' }}>
          <Link href="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
          <Link href="/sign-in" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started Free</Link>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">🚀 AI-Powered Lead Discovery + Social Hype Agent</div>
          <h1 className="hero-title">
            Find Gigs & <span className="hero-accent">Build Your Brand</span> Automatically
          </h1>
          <p className="hero-subtitle">
            GigLift&apos;s AI agents scan the web for venues, score and qualify leads, then generate
            scroll-stopping social content to grow your following. For DJs, bands, solo artists &amp; music teachers.
          </p>

          <div className="hero-actions">
            <Link href="/sign-up" className="btn btn-primary btn-xl">Start Free — No Card Required</Link>
            <Link href="/pricing" className="btn btn-secondary btn-xl">View Pricing</Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">250+</div>
              <div className="hero-stat-label">Venues Found/mo</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">4 Agents</div>
              <div className="hero-stat-label">Working For You</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">100%</div>
              <div className="hero-stat-label">Automated</div>
            </div>
          </div>
        </div>

        {/* Lead Discovery Features */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            🔍 Lead Discovery Agent
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            AI-powered venue discovery, scoring, and booking pipeline
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Auto-Discovery</h3>
            <p>AI searches the web using your seed keywords and region to find venue websites automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Smart Scoring</h3>
            <p>Every lead is scored 0-100 based on music fit, contact info, venue type, and booking potential.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📧</div>
            <h3>Contact Extraction</h3>
            <p>Emails, phone numbers, Instagram handles, and booking forms pulled from venue sites.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>High-Value Filter</h3>
            <p>Only venues scoring P1 or P2 make it to your dashboard. No noise, just qualified leads.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎵</div>
            <h3>Music Fit Tags</h3>
            <p>See which venues match your style — EDM, house, hip-hop, Latin, top 40, and more.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Booking Pipeline</h3>
            <p>Track leads from discovery to outreach to booked. Your complete DJ CRM.</p>
          </div>
        </div>

        {/* Social Hype Agent Features */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            📱 Social Hype Agent
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            4-agent content machine that builds your brand on autopilot
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Brand Voice Setup</h3>
            <p>Define your DJ name, genre, vibe, and tone. The agent writes posts that sound like you, not a robot.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Weekly Content Plans</h3>
            <p>AI strategist generates a themed 7-day content plan with Reels, carousels, stories, and FB posts.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✍️</div>
            <h3>A/B Post Drafts</h3>
            <p>Every post gets two hook variants so you can pick the best angle. Captions, hashtags, and CTAs included.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h3>Media Library</h3>
            <p>Upload folders of event photos, DJ set videos, and promo graphics. The agent attaches them to posts.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Engagement Copilot</h3>
            <p>Daily checklist of comments to reply, DMs to send, and collabs to reach out to — with draft replies.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Track post performance, engagement rates, and content pillar distribution across all platforms.</p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>© 2026 GigLift. Built for DJs who hustle.</p>
      </footer>
    </>
  );
}
