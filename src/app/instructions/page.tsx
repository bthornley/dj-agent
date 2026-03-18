import type { Metadata } from 'next';
import Topbar from '@/components/Topbar';

export const metadata: Metadata = {
    title: 'User Instructions — GigLift',
    description: 'Detailed instructions and guide for using GigLift autonomous agents.',
};

export default function InstructionsPage() {
    return (
        <div style={{ background: '#0a0a1a', minHeight: '100vh', color: '#e0e0e8' }}>
            <Topbar />

            <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 96px', fontFamily: '"Inter", sans-serif' }}>
                <header style={{ padding: '20px 0 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', marginBottom: '50px' }}>
                    <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 20, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', fontSize: 13, fontWeight: 600, color: '#a855f7', marginBottom: 16 }}>
                        📖 Instruction Manual
                    </div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '15px', letterSpacing: '-1px' }}>
                        GigLift User Guide
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#a855f7', fontWeight: 500 }}>
                        Complete instructional manual for new artists, instructors, and producers.
                    </p>
                </header>

                <div style={styles.sectionCard}>
                    <h2 style={styles.sectionTitle}>🚀 Introduction to GigLift</h2>
                    <p style={styles.paragraph}>Welcome to GigLift, your fully autonomous AI agent designed to discover gigs, score leads, draft outreach emails, build your EPK (Electronic Press Kit), and create stunning promotional flyers.</p>
                    <p style={styles.paragraph}>Whether you&apos;re looking to book out a nightclub, find new music students, or book studio time, GigLift adapts completely to your goals.</p>
                </div>

                <div style={styles.sectionCard}>
                    <h2 style={styles.sectionTitle}>🎭 The 4 Discovery Modes</h2>
                    <p style={styles.paragraph}>GigLift is highly adaptable. Your <strong>Active Mode</strong> dictates exactly how the AI operates — right down to the seeds it searches for and the emails it drafts on your behalf.</p>

                    <div style={styles.modeGrid}>
                        <div style={{ ...styles.modeCard, borderTop: '3px solid #a855f7' }}>
                            <div style={styles.modeIcon}>🎵</div>
                            <div style={styles.modeTitle}>Performer</div>
                            <p style={styles.modeText}>Finds venues, clubs, bars, and live gig opportunities.</p>
                        </div>
                        <div style={{ ...styles.modeCard, borderTop: '3px solid #0ea5e9' }}>
                            <div style={styles.modeIcon}>📚</div>
                            <div style={styles.modeTitle}>Instructor</div>
                            <p style={styles.modeText}>Finds music schools, community centers, and teaching roles.</p>
                        </div>
                        <div style={{ ...styles.modeCard, borderTop: '3px solid #f59e0b' }}>
                            <div style={styles.modeIcon}>🎙️</div>
                            <div style={styles.modeTitle}>Studio</div>
                            <p style={styles.modeText}>Uncovers recording opportunities and session work.</p>
                        </div>
                        <div style={{ ...styles.modeCard, borderTop: '3px solid #ef4444' }}>
                            <div style={styles.modeIcon}>🚐</div>
                            <div style={styles.modeTitle}>Touring</div>
                            <p style={styles.modeText}>Discovers routes and multi-city venue booking options.</p>
                        </div>
                    </div>

                    <div style={styles.tipBox}>
                        <span style={styles.tipTitle}>Pro Tip: Changing Modes</span>
                        <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>You can switch your active mode at any time using the <strong>Mode Switcher</strong> in the app navigation. Changing your mode instantly updates your dashboard, lead types, and automated outreach strategies.</p>
                    </div>
                </div>

                <div style={styles.sectionCard}>
                    <h2 style={styles.sectionTitle}>🌱 Seeds & Leads</h2>
                    <p style={styles.paragraph}>GigLift acts as a tireless booking agent. To get started, you need to provide the engine with <strong>Seeds</strong>. Once given, the AI agent <strong>Scans</strong> the web to generate qualified <strong>Leads</strong>.</p>

                    <h3 style={styles.subHeading}>What are Seeds?</h3>
                    <p style={styles.paragraph}>Seeds are the search parameters you feed the AI. Think of them as jumping-off points. The exact seeds you use depend heavily on your active Mode:</p>
                    <ul style={styles.list}>
                        <li style={{ marginBottom: 10 }}><strong>Performer Mode:</strong> &quot;Los Angeles nightclubs&quot;, &quot;Live jazz bar&quot;, &quot;Indie venues&quot;</li>
                        <li style={{ marginBottom: 10 }}><strong>Instructor Mode:</strong> &quot;Local music schools&quot;, &quot;Piano academies&quot;, &quot;After-school programs&quot;</li>
                    </ul>

                    <h3 style={styles.subHeading}>How to Run a Discovery Scan</h3>
                    <ul style={styles.stepList}>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>1</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Navigate to <strong>/leads/seeds</strong> in the application.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>2</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Add your targeted keyword seeds.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>3</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Click the <strong>Scan</strong> button. Our autonomous agents will search across platforms to identify valid opportunities.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>4</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Review your results under the <strong>Leads</strong> tab. The AI will score the leads based on venue capacity and fit.</p></div>
                        </li>
                    </ul>

                    <div style={styles.tipBox}>
                        <span style={styles.tipTitle}>Automated Outreach</span>
                        <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>GigLift includes an <strong>Outreach Writer</strong> agent. When you find a qualified lead, the AI drafts a tailored outreach email. If you&apos;re an instructor, it suggests lesson proposals; if you&apos;re a performer, it requests routing or an audition slot.</p>
                    </div>
                </div>

                <div style={styles.sectionCard}>
                    <h2 style={styles.sectionTitle}>📋 EPK Architect</h2>
                    <p style={styles.paragraph}>An Electronic Press Kit (EPK) is your digital resume. GigLift provides a modern, white-label EPK builder to showcase your brand to talent buyers, venue owners, and schools.</p>

                    <h3 style={styles.subHeading}>Building Your Profile</h3>
                    <ul style={styles.stepList}>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>1</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Head to the <strong>EPK Builder</strong>.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>2</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Select elements to include: Media (Gallery/Videos), Gig Stats, Upcoming/Past Events, Bios, and Social Links.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>3</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Drag and drop sections to <strong>reorder</strong> them exactly as you prefer.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>4</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Select a <strong>Theme</strong> (Dark or Light) and assign a custom <strong>Accent Color</strong> to match your personal brand.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>5</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Save and use the generated share link (<em>e.g., giglift.com/epk/your-id</em>) to send directly to leads.</p></div>
                        </li>
                    </ul>
                </div>

                <div style={styles.sectionCard}>
                    <h2 style={styles.sectionTitle}>🎨 AI Flyer Creator</h2>
                    <p style={styles.paragraph}>Tired of manually creating artwork for every gig? The AI Flyer editor generates stunning promotional flyers on autopilot based on style presets and text parameters.</p>

                    <h3 style={styles.subHeading}>Generating Promotional Materials</h3>
                    <ul style={styles.stepList}>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>1</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Navigate to <strong>Flyer Creator</strong> (/flyer/create).</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>2</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Generate a custom <strong>AI Background</strong> by describing the vibe, or upload your own base image.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>3</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Input your text details: Headline, Subtext (e.g., &quot;Special Guest DJ...&quot;), and Dates.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>4</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Adjust styling options: Font choices, Typography colors, Aspect Ratio (Story/Post), and Text Positioning.</p></div>
                        </li>
                        <li style={styles.stepItem}>
                            <div style={styles.stepNumber}>5</div>
                            <div style={styles.stepContent}><p style={{ margin: 0, fontSize: '1rem' }}>Hit <strong>Save & Download</strong>. The image is now ready to post immediately to Instagram or TikTok.</p></div>
                        </li>
                    </ul>
                </div>

            </main>
        </div>
    );
}

const styles = {
    sectionCard: {
        background: '#1c1c24',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '40px',
        marginBottom: '40px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    sectionTitle: {
        fontSize: '2rem',
        fontWeight: 700,
        margin: '0 0 20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    subHeading: {
        fontSize: '1.4rem',
        fontWeight: 600,
        margin: '30px 0 15px',
        color: '#ffffff',
    },
    paragraph: {
        color: '#a1a1aa',
        marginBottom: '20px',
        fontSize: '1.1rem',
        lineHeight: 1.6,
    },
    list: {
        color: '#a1a1aa',
        marginBottom: '25px',
        paddingLeft: '20px',
        fontSize: '1.1rem',
        lineHeight: 1.6,
    },
    modeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        margin: '30px 0',
    },
    modeCard: {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '12px',
        padding: '25px 20px',
        textAlign: 'center' as const,
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    modeIcon: {
        fontSize: '2.5rem',
        marginBottom: '15px',
    },
    modeTitle: {
        fontWeight: 700,
        marginBottom: '8px',
        fontSize: '1.1rem',
        color: '#ffffff',
    },
    modeText: {
        fontSize: '0.95rem',
        margin: 0,
        color: '#a1a1aa',
    },
    stepList: {
        listStyle: 'none',
        padding: 0,
    },
    stepItem: {
        display: 'flex',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '15px',
        alignItems: 'flex-start',
        gap: '20px',
    },
    stepNumber: {
        background: '#a855f7',
        color: 'white',
        minWidth: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.9rem',
        flexShrink: 0,
    },
    stepContent: {
        color: '#a1a1aa',
    },
    tipBox: {
        background: 'rgba(168, 85, 247, 0.1)',
        borderLeft: '4px solid #a855f7',
        padding: '20px',
        borderRadius: '0 12px 12px 0',
        margin: '30px 0',
    },
    tipTitle: {
        fontWeight: 700,
        color: '#a855f7',
        marginBottom: '5px',
        display: 'block',
    },
};
