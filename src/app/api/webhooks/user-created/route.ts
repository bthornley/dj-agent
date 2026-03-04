import { NextResponse } from 'next/server';

// POST /api/webhooks/user-created — Clerk webhook: send welcome email on signup
// Configure in Clerk Dashboard → Webhooks → user.created event
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, data } = body;

        if (type !== 'user.created') {
            return NextResponse.json({ received: true });
        }

        const email = data?.email_addresses?.[0]?.email_address;
        const firstName = data?.first_name || 'there';

        if (!email) {
            return NextResponse.json({ error: 'No email found' }, { status: 400 });
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not set — skipping welcome email');
            return NextResponse.json({ skipped: true });
        }

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'GigLift <hello@giglift.app>',
                to: email,
                subject: '🎧 Welcome to GigLift — Your AI Agents Are Ready',
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #14141f; color: #e2e8f0; padding: 40px 24px; border-radius: 16px;">
                        <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="font-size: 28px; font-weight: 700; margin: 0; color: #a855f7;">Welcome to GigLift</h1>
                            <p style="color: #94a3b8; font-size: 15px; margin-top: 8px;">Your AI agent team is standing by</p>
                        </div>

                        <p style="font-size: 16px; line-height: 1.7;">Hey ${firstName},</p>

                        <p style="font-size: 15px; line-height: 1.7; color: #cbd5e1;">
                            Thanks for joining GigLift! You now have <strong style="color: #a855f7;">7 AI agents</strong> ready to help you
                            discover gigs, score leads, draft outreach emails, build your EPK, plan social content, and create stunning promo flyers.
                        </p>

                        <div style="background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #a855f7;">🚀 Get Started in 3 Steps:</h3>
                            <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; line-height: 2;">
                                <li>Choose your mode: <strong>Performer</strong>, <strong>Instructor</strong>, <strong>Studio</strong>, or <strong>Touring</strong></li>
                                <li>Set up your brand profile (name, genre, bio)</li>
                                <li>Run your first lead scan — the agents do the rest</li>
                            </ol>
                        </div>

                        <div style="text-align: center; margin: 32px 0;">
                            <a href="https://giglift.app/dashboard" style="
                                display: inline-block; padding: 14px 32px; border-radius: 10px;
                                background: linear-gradient(135deg, #a855f7, #9333ea);
                                color: white; text-decoration: none; font-weight: 700; font-size: 16px;
                            ">Go to Your Dashboard →</a>
                        </div>

                        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
                            Your free plan includes 5 scans/month, a basic EPK page, 3 AI flyer backgrounds, and calendar view.
                            Upgrade to Pro ($33/mo) anytime for 50 scans, AI outreach, email send, and more.
                        </p>

                        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 32px 0;" />

                        <p style="font-size: 12px; color: #64748b; text-align: center;">
                            © 2026 Digital Duende Entertainment, LLC · 
                            <a href="https://giglift.app/terms" style="color: #64748b;">Terms</a> · 
                            <a href="https://giglift.app/privacy" style="color: #64748b;">Privacy</a>
                        </p>
                    </div>
                `,
            }),
        });

        return NextResponse.json({ sent: true, to: email });
    } catch (error) {
        console.error('Welcome email error:', error);
        return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
    }
}
