import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Top 20 metro areas for SEO city pages
const CITIES: Record<string, { name: string; state: string; venues: string[]; description: string }> = {
    'los-angeles': { name: 'Los Angeles', state: 'CA', venues: ['The Roxy', 'Exchange LA', 'Academy LA', 'Sound Nightclub'], description: 'LA\'s legendary music scene — from Hollywood clubs to Downtown warehouse parties.' },
    'new-york': { name: 'New York', state: 'NY', venues: ['Brooklyn Mirage', 'Webster Hall', 'Elsewhere', 'Output'], description: 'The city that never sleeps — from intimate jazz clubs to massive festival stages.' },
    'miami': { name: 'Miami', state: 'FL', venues: ['LIV', 'Club Space', 'E11EVEN', 'Do Not Sit'], description: 'Year-round nightlife, pool parties, and the global capital of electronic music.' },
    'chicago': { name: 'Chicago', state: 'IL', venues: ['Sound-Bar', 'Radius', 'Smart Bar', 'Concord Music Hall'], description: 'The birthplace of house music — deep roots and a thriving underground scene.' },
    'las-vegas': { name: 'Las Vegas', state: 'NV', venues: ['Omnia', 'Hakkasan', 'XS', 'Marquee'], description: 'The entertainment capital — mega-clubs, pool parties, and residency gigs.' },
    'san-francisco': { name: 'San Francisco', state: 'CA', venues: ['The Midway', 'Audio SF', 'Great Northern', 'Public Works'], description: 'Tech meets art — warehouse parties, boutique venues, and a vibrant indie scene.' },
    'atlanta': { name: 'Atlanta', state: 'GA', venues: ['Ravine', 'District', 'Believe Music Hall', 'Terminal West'], description: 'Hip-hop capital with a booming electronic music scene and Southern hospitality.' },
    'dallas': { name: 'Dallas', state: 'TX', venues: ['Stereo Live', 'It\'ll Do Club', 'Lizard Lounge', 'Trees'], description: 'Texas-sized nightlife — from Deep Ellum dive bars to world-class electronic venues.' },
    'denver': { name: 'Denver', state: 'CO', venues: ['Temple', 'Beta', 'Cervantes', 'Globe Hall'], description: 'Mile-high music mecca — outdoor festivals, intimate venues, and a passionate community.' },
    'austin': { name: 'Austin', state: 'TX', venues: ['Kingdom', 'The Concourse Project', 'Barbarella', 'Emo\'s'], description: 'Live Music Capital of the World — SXSW, 6th Street, and everything in between.' },
    'seattle': { name: 'Seattle', state: 'WA', venues: ['Kremwerk', 'Neumos', 'The Showbox', 'Q Nightclub'], description: 'Pacific Northwest vibes — grunge roots, electronic innovation, and coffee-fueled creativity.' },
    'nashville': { name: 'Nashville', state: 'TN', venues: ['Exit/In', 'The Basement East', 'Marathon Music Works', 'Mercy Lounge'], description: 'Music City USA — beyond country, a rising hub for indie, electronic, and hip-hop.' },
    'phoenix': { name: 'Phoenix', state: 'AZ', venues: ['Walter Where?House', 'Shady Park', 'Monarch Theatre', 'Valley Bar'], description: 'Desert heat, warm crowds — a growing scene with year-round outdoor events.' },
    'san-diego': { name: 'San Diego', state: 'CA', venues: ['CRSSD Fest', 'Spin Nightclub', 'Music Box', 'The Observatory'], description: 'SoCal vibes — beachside festivals, downtown clubs, and a tight-knit music community.' },
    'houston': { name: 'Houston', state: 'TX', venues: ['Clé', 'Stereo Live Houston', 'Numbers', 'White Oak Music Hall'], description: 'Space City — diverse, sprawling, and full of opportunities across every genre.' },
    'portland': { name: 'Portland', state: 'OR', venues: ['45 East', 'Holocene', 'Doug Fir', 'Star Theater'], description: 'Keep Portland weird — underground parties, DIY culture, and a fiercely independent scene.' },
    'philadelphia': { name: 'Philadelphia', state: 'PA', venues: ['NOTO', 'The Fillmore', 'Underground Arts', 'Johnny Brenda\'s'], description: 'Rocky\'s city — a resilient music community with Philly soul roots and modern edge.' },
    'detroit': { name: 'Detroit', state: 'MI', venues: ['TV Lounge', 'Magic Stick', 'Marble Bar', 'Spot Lite'], description: 'Techno\'s birthplace — the city that invented an entire genre still innovates today.' },
    'orange-county': { name: 'Orange County', state: 'CA', venues: ['Yost Theater', 'Time Nightclub', 'The Observatory', 'House of Blues'], description: 'SoCal\'s hidden gem — boutique clubs, beach bars, and growing Latin/EDM crossover scene.' },
    'minneapolis': { name: 'Minneapolis', state: 'MN', venues: ['First Avenue', 'The Armory', 'Skyway Theatre', 'Icehouse'], description: 'Prince\'s hometown — a legendary music city with a vibrant, community-driven scene.' },
};

export function generateStaticParams() {
    return Object.keys(CITIES).map(city => ({ city }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
    const city = CITIES[params.city];
    if (!city) return { title: 'City Not Found' };
    return {
        title: `Find Gigs in ${city.name}, ${city.state} — GigLift`,
        description: `Discover DJ gigs, teaching opportunities, and performance venues in ${city.name}, ${city.state}. GigLift's AI agents scan 10+ sources to find your next booking.`,
    };
}

export default function CityPage({ params }: { params: { city: string } }) {
    const city = CITIES[params.city];
    if (!city) notFound();

    return (
        <>
            <header className="topbar landing-topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 56, height: 56, borderRadius: 12, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px' }}>
                    <Link href="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
                    <Link href="/sign-in" className="btn btn-ghost btn-sm">Sign In</Link>
                    <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started Free</Link>
                </nav>
            </header>

            <main className="main-content fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(56,189,248,0.12))',
                        border: '1px solid rgba(168,85,247,0.2)',
                        color: '#a855f7', letterSpacing: '1px', textTransform: 'uppercase',
                        marginBottom: '12px',
                    }}>
                        📍 {city.state}
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
                        Find Gigs in <span style={{ color: '#a855f7' }}>{city.name}</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.7 }}>
                        {city.description}
                    </p>
                </div>

                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        🔍 How GigLift Finds Your Next {city.name} Gig
                    </h2>
                    <div className="feature-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🤖</div>
                            <h3>AI Lead Scout</h3>
                            <p>Our AI agents crawl 10+ sources to find venues, schools, and studios hiring in {city.name}, {city.state}.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">📊</div>
                            <h3>Smart Scoring</h3>
                            <p>Every lead is scored 0–100 based on music fit, budget signals, and booking potential for the {city.name} market.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">✉️</div>
                            <h3>AI Outreach</h3>
                            <p>Get 3 personalized email variants per lead — drafted by AI using your brand profile and each venue&apos;s specialty.</p>
                        </div>
                    </div>
                </section>

                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        🎵 Popular Venues in {city.name}
                    </h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {city.venues.map(v => (
                            <span key={v} style={{
                                padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
                                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc',
                            }}>{v}</span>
                        ))}
                    </div>
                </section>

                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        4 Ways to Find Work in {city.name}
                    </h2>
                    <div className="feature-grid">
                        {[
                            { icon: '🎧', name: 'Performer Mode', desc: `Find DJ gigs, band slots, and solo performance opportunities at ${city.name} venues and events.` },
                            { icon: '📚', name: 'Instructor Mode', desc: `Discover music teaching positions at schools, academies, and community centers in ${city.name}.` },
                            { icon: '🎙️', name: 'Studio Mode', desc: `Connect with recording studios, session work, and sync licensing opportunities in ${city.name}.` },
                            { icon: '🚐', name: 'Touring Mode', desc: `Plan multi-city tours passing through ${city.name} with festival and booking agent connections.` },
                        ].map(m => (
                            <div key={m.name} className="feature-card">
                                <div className="feature-icon">{m.icon}</div>
                                <h3>{m.name}</h3>
                                <p>{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <div style={{
                    textAlign: 'center', padding: '40px 24px', borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(56,189,248,0.06))',
                    border: '1px solid rgba(168,85,247,0.15)',
                }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
                        Start Finding Gigs in {city.name} Today
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                        Free plan includes 5 AI scans/month. No credit card required.
                    </p>
                    <Link href="/sign-up" className="btn btn-primary btn-xl">
                        Deploy Your Agents Free
                    </Link>
                </div>

                <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>
                        More Cities
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(CITIES).filter(([slug]) => slug !== params.city).slice(0, 12).map(([slug, c]) => (
                            <Link key={slug} href={`/gigs/${slug}`} style={{
                                padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                color: 'var(--text-muted)', textDecoration: 'none',
                            }}>
                                {c.name}, {c.state}
                            </Link>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="landing-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</Link>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</Link>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <Link href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</Link>
                </div>
                <p>© 2026 Digital Duende Entertainment, LLC</p>
            </footer>
        </>
    );
}
