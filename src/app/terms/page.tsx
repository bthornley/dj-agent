import Link from 'next/link';

export const metadata = { title: 'Terms of Service — GigLift' };

export default function TermsPage() {
    return (
        <>
            <header className="landing-topbar">
                <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px' }}>
                    <Link href="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
                    <Link href="/sign-in" className="btn btn-ghost btn-sm">Sign In</Link>
                    <Link href="/sign-up" className="btn btn-primary btn-sm">Get Started Free</Link>
                </nav>
            </header>

            <main className="main-content fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Terms of Service</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Last updated: February 28, 2026</p>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>1. Acceptance of Terms</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        By accessing or using GigLift (&quot;the Service&quot;), operated by GigLift LLC (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;),
                        you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>2. Description of Service</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        GigLift provides AI-powered tools for musicians, DJs, bands, solo artists, and music teachers to discover
                        performance opportunities, manage leads, plan social media content, build electronic press kits, and
                        streamline the booking process. The Service includes both free and paid subscription tiers.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>3. Account Registration</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        You must provide accurate, complete information when creating an account. You are responsible for maintaining
                        the security of your account credentials and for all activity under your account. You must be at least 18 years
                        old to use the Service.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>4. Acceptable Use</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>You agree not to:</p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: '24px', marginTop: '8px' }}>
                        <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                        <li>Send spam, unsolicited messages, or harassing communications through the Service</li>
                        <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
                        <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                        <li>Use automated means to scrape or collect data from the Service beyond its intended use</li>
                        <li>Misrepresent your identity or affiliation with any person or organization</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>5. AI-Generated Content</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        The Service uses artificial intelligence to generate content including but not limited to social media posts,
                        outreach emails, bios, and lead scoring. AI-generated content is provided as suggestions and may contain errors
                        or inaccuracies. You are solely responsible for reviewing, editing, and approving all content before use.
                        We do not guarantee the accuracy, completeness, or suitability of AI-generated content.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>6. Subscriptions and Billing</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        Paid subscriptions are billed monthly via Stripe. You may cancel at any time; your access continues until
                        the end of the billing period. Refunds are handled on a case-by-case basis. We reserve the right to change
                        pricing with 30 days&apos; notice. The free tier may have usage limits that change over time.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>7. Intellectual Property</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        You retain ownership of all content you create or upload to the Service. By using the Service, you grant us
                        a limited license to process your content as necessary to provide the Service. We retain all rights to the
                        Service itself, including its software, design, and branding.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>8. Limitation of Liability</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW,
                        WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                        OR ANY LOSS OF PROFITS OR REVENUE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE
                        TWELVE MONTHS PRECEDING THE CLAIM.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>9. Termination</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        We may suspend or terminate your account at any time for violation of these terms or for any reason with
                        reasonable notice. You may delete your account at any time. Upon termination, your data will be deleted
                        within 30 days unless required by law to retain it.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>10. Changes to Terms</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        We may update these terms from time to time. Continued use of the Service after changes constitutes
                        acceptance. We will notify users of material changes via email or in-app notification.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>11. Contact</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        For questions about these terms, contact us at <a href="mailto:support@giglift.app" style={{ color: 'var(--accent-purple)' }}>support@giglift.app</a>.
                    </p>
                </section>
            </main>

            <footer className="landing-footer">
                <p>© 2026 GigLift. All rights reserved.</p>
            </footer>
        </>
    );
}
