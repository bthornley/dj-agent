import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — GigLift' };

export default function PrivacyPage() {
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
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Privacy Policy</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Last updated: February 28, 2026</p>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>1. Information We Collect</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
                        We collect the following types of information:
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: '24px' }}>
                        <li><strong>Account Information:</strong> Name, email address, and profile details you provide during registration via Clerk</li>
                        <li><strong>Brand Profile:</strong> Artist name, genre, bio, social media links, and brand voice settings you configure</li>
                        <li><strong>Media:</strong> Photos and videos you upload to the media library</li>
                        <li><strong>Usage Data:</strong> How you interact with the Service, including pages visited, features used, and content generated</li>
                        <li><strong>Payment Information:</strong> Billing details are processed and stored securely by Stripe — we do not store your credit card number</li>
                        <li><strong>Lead Data:</strong> Information about venues and contacts discovered by our AI agents from publicly available sources</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>2. How We Use Your Information</h2>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: '24px' }}>
                        <li>To provide, maintain, and improve the Service</li>
                        <li>To generate AI-powered content, leads, and recommendations personalized to your profile</li>
                        <li>To process payments and manage subscriptions</li>
                        <li>To send important service notifications (account, billing, security)</li>
                        <li>To respond to support requests</li>
                        <li>To detect and prevent fraud or abuse</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>3. Data Sharing</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
                        We do not sell your personal information. We share data only with:
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: '24px' }}>
                        <li><strong>Clerk:</strong> Authentication and user management</li>
                        <li><strong>Stripe:</strong> Payment processing</li>
                        <li><strong>Vercel:</strong> Hosting and deployment</li>
                        <li><strong>Turso:</strong> Database storage</li>
                        <li><strong>OpenAI / AI providers:</strong> Content generation (your data is sent to AI models to generate content; see their privacy policies)</li>
                    </ul>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '12px' }}>
                        We may also disclose information if required by law or to protect our rights and safety.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>4. Data Storage and Security</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        Your data is stored in secure, encrypted databases. We use industry-standard security measures including
                        HTTPS encryption, secure authentication via Clerk, and PCI-compliant payment processing via Stripe.
                        Media files are stored in Vercel Blob storage. While we implement reasonable safeguards, no method of
                        transmission or storage is 100% secure.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>5. Your Rights</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>You have the right to:</p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: '24px' }}>
                        <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                        <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                        <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                        <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                        <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                    </ul>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '12px' }}>
                        To exercise these rights, contact us at <a href="mailto:privacy@giglift.app" style={{ color: 'var(--accent-purple)' }}>privacy@giglift.app</a>.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>6. Cookies</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        We use essential cookies for authentication and session management via Clerk. We do not use third-party
                        advertising cookies. Analytics cookies may be used to understand usage patterns and improve the Service.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>7. Children&apos;s Privacy</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        The Service is not intended for users under 18 years of age. We do not knowingly collect personal
                        information from children. If we learn we have collected data from a child, we will delete it promptly.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>8. California Privacy Rights (CCPA)</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        California residents have additional rights under the CCPA, including the right to know what personal
                        information is collected, the right to delete it, and the right to opt out of its sale. We do not sell
                        personal information. Contact us to exercise your CCPA rights.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>9. Changes to This Policy</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        We may update this Privacy Policy from time to time. We will notify you of material changes via email
                        or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated policy.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>10. Contact</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        For privacy-related questions or requests, contact us at{' '}
                        <a href="mailto:privacy@giglift.app" style={{ color: 'var(--accent-purple)' }}>privacy@giglift.app</a>.
                    </p>
                </section>
            </main>

            <footer className="landing-footer">
                <p>© 2026 GigLift. All rights reserved.</p>
            </footer>
        </>
    );
}
