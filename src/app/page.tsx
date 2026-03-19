import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RefCapture from '@/components/RefCapture';

export default async function LandingPage() {
  const { userId } = await auth();
  return (
    <>
      <Suspense><RefCapture /></Suspense>
      <header className="topbar landing-topbar">
        <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
          <img src="/logo.png" alt="GigLift" style={{ width: 56, height: 56, borderRadius: 12, filter: "drop-shadow(0 0 8px rgba(168,85,247,0.4))" }} />
          <div className="topbar-brand">
            <span className="topbar-brand-name">GigLift</span>
            <span className="topbar-tagline">Lift Your Gigs</span>
          </div>
        </Link>
        <nav className="topbar-nav" style={{ gap: '8px' }}>
          <Link href="/promo.html" className="btn btn-ghost btn-sm" target="_blank">🎬 Watch Promo</Link>
          <Link href="/guide" className="btn btn-ghost btn-sm">📖 Guide</Link>
          <Link href="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
          {userId ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/sign-in" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">🤖 8 AI Agents Working While You Sleep</div>
          <h1 className="hero-title">
            Your AI Agent Team That <span className="hero-accent">Finds, Books &amp; Promotes</span> Your Gigs
          </h1>
          <div style={{ fontSize: '18px', color: '#b0b0cc', fontWeight: 600, letterSpacing: '0.5px', marginTop: '8px' }}>
            Lift your gigs to the next level
          </div>
          <p className="hero-subtitle">
            GigLift deploys a crew of autonomous AI agents that discover venues, score leads,
            draft booking emails, build your press kit, plan your social content, and create
            stunning promo flyers — all on autopilot.
            For DJs, bands, solo artists &amp; music instructors.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {[
              { icon: '🎵', label: 'Performer', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', color: '#a855f7' },
              { icon: '📚', label: 'Instructor', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', color: '#38bdf8' },
              { icon: '🎙️', label: 'Studio', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', color: '#f97316' },
              { icon: '🚐', label: 'Touring', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: '#10b981' },
            ].map(m => (
              <span key={m.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: `linear-gradient(135deg, ${m.bg}, ${m.bg})`,
                border: `1px solid ${m.border}`, color: m.color,
              }}>{m.icon} {m.label}</span>
            ))}
          </div>

          <div className="hero-actions" style={{ marginTop: '12px', marginBottom: '24px' }}>
            <Link href="/sign-up" className="btn btn-primary btn-xl">Deploy Your Agents Free</Link>
            <Link href="/promo.html" className="btn btn-secondary btn-xl" target="_blank">🎬 Watch the Promo</Link>
          </div>

          {/* 🎙️ Beta Program Banner */}
          <div style={{
            maxWidth: '650px', margin: '0 auto 32px auto', padding: '16px 24px',
            borderRadius: '16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(168,85,247,0.15))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', textDecoration: 'none'
          }}>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🚀 Private Beta Now Open
              </div>
              <div style={{ fontSize: '15px', color: 'white', fontWeight: 600, marginTop: '4px' }}>
                Run your music business with your voice. Request early access to our integrated AI Manager.
              </div>
            </div>
            <Link href="/beta" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Request Access
            </Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">8 Agents</div>
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

        {/* ═══════ Four Modes Section ═══════ */}
        <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(56,189,248,0.12))',
            border: '1px solid rgba(168,85,247,0.2)',
            color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            ✨ Four Modes · One Platform
          </div>
          <h2 className="landing-modes-title" style={{ marginBottom: '6px' }}>
            <span style={{ color: '#a855f7' }}>Perform</span>, <span style={{ color: '#38bdf8' }}>Teach</span>, <span style={{ color: '#f97316' }}>Record</span>, or <span style={{ color: '#10b981' }}>Tour</span> — We&apos;ve Got You
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Switch between modes with one click. Each mode comes with its own seeds, lead pipeline, and tailored discovery.
          </p>
        </div>

        <div className="landing-modes-grid" style={{
          maxWidth: '960px', margin: '0 auto 40px auto', padding: '0 16px',
        }}>
          {/* Performer Card */}
          <div className="landing-mode-card" style={{
            padding: '24px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.03), rgba(15,15,35,0.95))',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 0 30px rgba(168,85,247,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                fontSize: '28px', width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))',
                border: '1px solid rgba(168,85,247,0.3)',
              }}>🎵</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#a855f7' }}>Performer Mode</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  For DJs, bands &amp; solo artists
                </p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
              Scan for nightclubs, lounges, event spaces, bars, and festivals — scored on music fit \u0026 booking potential.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {['Nightclubs', 'Lounges', 'Event Spaces', 'Bars', 'Festivals', 'Weddings'].map(tag => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                  background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc',
                }}>{tag}</span>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong style={{ color: '#a855f7' }}>Seeds:</strong> &quot;DJ night OC&quot; · &quot;site:gigsalad.com&quot; · &quot;corporate event venue&quot;
            </div>
          </div>

          {/* Instructor Card */}
          <div className="landing-mode-card" style={{
            padding: '24px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(34,211,238,0.03), rgba(15,15,35,0.95))',
            border: '1px solid rgba(56,189,248,0.25)',
            boxShadow: '0 0 30px rgba(56,189,248,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                fontSize: '28px', width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(34,211,238,0.1))',
                border: '1px solid rgba(56,189,248,0.3)',
              }}>📚</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>Instructor Mode</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  For music instructors &amp; educators
                </p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
              Discover music schools, after-school programs, community centers, and studios that need instructors.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {['Music Schools', 'Academies', 'After-School', 'Community Centers', 'Churches', 'Studios'].map(tag => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                  background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#7dd3fc',
                }}>{tag}</span>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong style={{ color: '#38bdf8' }}>Seeds:</strong> &quot;music school OC&quot; · &quot;after school music program&quot; · &quot;community center&quot;
            </div>
          </div>

          {/* Studio Musician Card */}
          <div className="landing-mode-card" style={{
            padding: '24px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,88,12,0.03), rgba(15,15,35,0.95))',
            border: '1px solid rgba(249,115,22,0.25)',
            boxShadow: '0 0 30px rgba(249,115,22,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                fontSize: '28px', width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))',
                border: '1px solid rgba(249,115,22,0.3)',
              }}>🎙️</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f97316' }}>Studio Mode</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  For session musicians &amp; producers
                </p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
              Find recording studios, session work, sync licensing, film scoring, and producer collaboration opportunities.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {['Recording Studios', 'Session Work', 'Sync Licensing', 'Film Scoring', 'Producers', 'Jingles'].map(tag => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                  background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c',
                }}>{tag}</span>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong style={{ color: '#f97316' }}>Seeds:</strong> &quot;session musician wanted&quot; · &quot;site:soundbetter.com&quot; · &quot;sync licensing&quot;
            </div>
          </div>

          {/* Touring Musician Card */}
          <div className="landing-mode-card" style={{
            padding: '24px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.03), rgba(15,15,35,0.95))',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 0 30px rgba(16,185,129,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                fontSize: '28px', width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))',
                border: '1px solid rgba(16,185,129,0.3)',
              }}>🚐</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#10b981' }}>Touring Mode</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  For touring musicians &amp; road warriors
                </p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
              Find touring band openings, booking agencies, concert promoters, festival submissions, and tour circuits.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {['Touring Bands', 'Booking Agents', 'Promoters', 'Festivals', 'Amphitheaters', 'Tour Circuits'].map(tag => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399',
                }}>{tag}</span>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong style={{ color: '#10b981' }}>Seeds:</strong> &quot;touring musician needed&quot; · &quot;site:sonicbids.com&quot; · &quot;festival submissions&quot;
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Link href="/sign-up" className="btn btn-primary btn-xl" style={{ marginRight: '12px' }}>
            Get Started Free — All Modes Included
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
            <h3>Auto-Pilot Scans</h3>
            <p>Set it and forget it — the background agent runs daily scans on your seeds and fills your pipeline while you sleep.</p>
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
            Drafts personalized outreach emails tailored to your mode — booking inquiries for performers, lesson proposals for instructors
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
            <h3>Automated Follow-Ups</h3>
            <p>If a lead ghosts you for 3 days, the agent automatically drafts a personalized follow-up ready to send in one click.</p>
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
            <h3>Multi-Platform Analytics</h3>
            <p>The AI Coach tracks Instagram, TikTok, and Facebook performance, delivering actionable weekly insights & recommendations.</p>
          </div>
        </div>

        {/* Agent 6: Voice-Activated AI Manager */}
        <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '48px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
            color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px'
          }}>
            New Beta Program ✨
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            🎙️ Agent 6 — Voice-Activated AI Manager
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Your personal booking agent and assistant, available 24/7 with just a tap
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🎧</div>
            <h3>Natural Interactions</h3>
            <p>Tap the mic, talk naturally, and the AI agent processes complex requests, reads you your leads, and displays visual summaries instantly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✍️</div>
            <h3>Contract Drafting</h3>
            <p>Ask the manager to draft a contract with specific deposit percentages or amounts, and they will prepare it for approval immediately.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Schedule Lookup</h3>
            <p>Ask about upcoming load-in times, availability, or conflicting dates without leaving your current screen.</p>
          </div>
        </div>

        {/* ═══════ New: Power Tools Section ═══════ */}
        <div style={{ textAlign: 'center', marginTop: '64px', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(168,85,247,0.12))',
            border: '1px solid rgba(251,191,36,0.2)',
            color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            ⚡ Power Tools
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Create, Book &amp; Export — All In One Place
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Beyond lead discovery — tools that help you run your entire music business.
          </p>
        </div>
        <div className="feature-grid" style={{ marginBottom: '24px' }}>
          <div className="feature-card" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
            <div className="feature-icon">🎨</div>
            <h3>AI Flyer Creator</h3>
            <p>Choose from 5 style presets, generate AI backgrounds with DALL-E 3, add QR codes to your ticket links, and overlay your logo. Export as PNG.</p>
          </div>
          <div className="feature-card" style={{ borderColor: 'rgba(56,189,248,0.2)' }}>
            <div className="feature-icon">📅</div>
            <h3>Calendar View</h3>
            <p>See all your bookings in a monthly calendar with color-coded statuses. Click any day to quick-add a new booking with client, venue, date, and time.</p>
          </div>
          <div className="feature-card" style={{ borderColor: 'rgba(52,211,153,0.2)' }}>
            <div className="feature-icon">📧</div>
            <h3>Email System</h3>
            <p>Send personalized outreach with 3 built-in templates. Track opens, manage sent history, and export your leads and emails as CSV.</p>
          </div>
          <div className="feature-card" style={{ borderColor: 'rgba(249,115,22,0.2)' }}>
            <div className="feature-icon">💸</div>
            <h3>Smart Pricing Proposals</h3>
            <p>The Booking Agent dynamically scales your package pricing based on event type, attendance size, and client budget limits.</p>
          </div>
          <div className="feature-card" style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
            <div className="feature-icon">📥</div>
            <h3>CSV Export</h3>
            <p>Export your entire lead database or sent email history as a spreadsheet. Perfect for CRM imports or offline analysis.</p>
          </div>
          <div className="feature-card" style={{ borderColor: 'rgba(96,165,250,0.2)' }}>
            <div className="feature-icon">🤝</div>
            <h3>Ambassador Program</h3>
            <p>Earn 20% recurring commission by referring other musicians. Get your own referral link, tracking dashboard, and free Pro access.</p>
          </div>
        </div>

        {/* ═══════ Brand Ambassador Program ═══════ */}
        <div className="landing-ambassador" style={{
          marginTop: '72px', padding: '48px 24px', borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(56,189,248,0.06), rgba(15,15,35,0.98))',
          border: '1px solid rgba(168,85,247,0.15)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px',
            background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />

          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(240,199,85,0.15), rgba(251,191,36,0.1))',
              border: '1px solid rgba(240,199,85,0.25)',
              color: '#f0c755', letterSpacing: '1px', textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              🌟 Now Accepting Applications
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
              <span style={{
                color: '#fbbf24',
              }}>Brand Ambassador</span> Program
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.6 }}>
              Represent GigLift in your local music scene. Get rewarded for spreading the word to fellow musicians and instructors.
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px', maxWidth: '900px', margin: '0 auto 32px', position: 'relative', zIndex: 1,
          }}>
            <div style={{
              padding: '24px 20px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎁</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Free Pro Access
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Full Pro tier ($33/mo) free for the duration of your ambassadorship
              </p>
            </div>

            <div style={{
              padding: '24px 20px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                20% Revenue Share
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Earn 20% recurring commission on every user you refer who subscribes
              </p>
            </div>

            <div style={{
              padding: '24px 20px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏷️</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Custom Referral Link
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your own branded referral URL and tracking dashboard
              </p>
            </div>

            <div style={{
              padding: '24px 20px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎤</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Featured Spotlight
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Monthly showcase on our social channels and ambassador hall of fame
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              maxWidth: '600px', margin: '0 auto 24px', padding: '20px',
              borderRadius: '12px', background: 'rgba(240,199,85,0.05)',
              border: '1px solid rgba(240,199,85,0.12)',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: '#f0c755' }}>Who can apply?</strong> Any active musician, DJ, band member, or music instructor
                who uses GigLift and is active in their local music community — online or offline.
                We&apos;re looking for passionate advocates, not follower counts.
              </p>
            </div>
            <a
              href="/ambassador"
              className="btn btn-xl"
              style={{
                background: 'linear-gradient(135deg, #f0c755, #fbbf24)',
                color: '#1a1a2e', fontWeight: 700, boxShadow: '0 0 24px rgba(240,199,85,0.2)',
                textDecoration: 'none', display: 'inline-flex',
              }}
            >
              🌟 Apply to Be an Ambassador
            </a>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Applications reviewed within 48 hours · No minimum follower count required
            </p>
          </div>
        </div>
      </main>

      <footer className="landing-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</Link>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <Link href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</Link>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <a href="https://instagram.com/gigliftapp" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>📸 Instagram</a>
        </div>
        <p>© 2026 Digital Duende Entertainment, LLC. Your AI agent team for the music hustle.</p>
      </footer>
    </>
  );
}
