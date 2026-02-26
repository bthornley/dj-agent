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
          <div className="icon">🎧</div>
          <span>GigFinder</span>
        </Link>
        <nav className="topbar-nav" style={{ gap: '8px' }}>
          <Link href="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
          <Link href="/sign-in" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started Free</Link>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">🚀 AI-Powered Lead Discovery</div>
          <h1 className="hero-title">
            Find Your Next <span className="hero-accent">DJ Gig</span> Automatically
          </h1>
          <p className="hero-subtitle">
            GigFinder scans the web for venues, scores them, and surfaces the ones
            most likely to book you. Stop cold-calling — let AI find your leads.
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
              <div className="hero-stat-value">P1/P2</div>
              <div className="hero-stat-label">High-Value Only</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">100%</div>
              <div className="hero-stat-label">Automated</div>
            </div>
          </div>
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
      </main>

      <footer className="landing-footer">
        <p>© 2026 GigFinder. Built for DJs who hustle.</p>
      </footer>
    </>
  );
}
