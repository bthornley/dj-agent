import { Resend } from 'resend';

// ============================================================
// Email Notifications — Subscription & Ambassador
// Uses Resend (free 100 emails/day). Requires RESEND_API_KEY env var.
// ============================================================

let _resend: Resend | null = null;
function getResend(): Resend | null {
    if (!process.env.RESEND_API_KEY) return null;
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'GigLift <noreply@giglift.app>';

// ---- Plan Upgrade / Downgrade Email ----

export async function sendPlanChangeEmail(params: {
    to: string;
    firstName: string;
    oldPlan: string;
    newPlan: string;
}): Promise<void> {
    const resend = getResend();
    if (!resend) {
        console.log('[email] Resend not configured — skipping plan change email');
        return;
    }

    const { to, firstName, oldPlan, newPlan } = params;
    const isUpgrade = getPlanRank(newPlan) > getPlanRank(oldPlan);
    const isDowngrade = getPlanRank(newPlan) < getPlanRank(oldPlan);

    const planEmoji: Record<string, string> = {
        free: '🆓', pro: '⭐', unlimited: '🚀', agency: '🏢',
    };
    const planNames: Record<string, string> = {
        free: 'Free', pro: 'Pro', unlimited: 'Unlimited', agency: 'Agency',
    };

    const subject = isUpgrade
        ? `🎉 Welcome to GigLift ${planNames[newPlan] || newPlan}!`
        : isDowngrade
            ? `Your GigLift plan has been updated`
            : `Your GigLift subscription has changed`;

    const html = isUpgrade ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0f0f23; color: #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://giglift.app/logo.png" alt="GigLift" style="width: 64px; height: 64px; border-radius: 12px;" />
            </div>
            <h1 style="color: #a78bfa; font-size: 24px; text-align: center; margin-bottom: 8px;">
                ${planEmoji[newPlan] || '🎉'} You're on ${planNames[newPlan] || newPlan}!
            </h1>
            <p style="color: #94a3b8; text-align: center; font-size: 15px; margin-bottom: 24px;">
                Hey ${firstName || 'there'}, your plan has been upgraded from ${planNames[oldPlan] || oldPlan} to <strong style="color: #a78bfa;">${planNames[newPlan] || newPlan}</strong>.
            </p>
            <div style="background: rgba(167,139,250,0.08); border: 1px solid rgba(167,139,250,0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #e2e8f0; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Here's what's now unlocked:</p>
                ${getUpgradeFeatures(newPlan)}
            </div>
            <div style="text-align: center;">
                <a href="https://giglift.app/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                    Go to Dashboard →
                </a>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
                Questions? Reply to this email or reach us at hello@giglift.app
            </p>
        </div>
    ` : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0f0f23; color: #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://giglift.app/logo.png" alt="GigLift" style="width: 64px; height: 64px; border-radius: 12px;" />
            </div>
            <h2 style="color: #e2e8f0; font-size: 20px; text-align: center; margin-bottom: 8px;">
                Your plan has been updated
            </h2>
            <p style="color: #94a3b8; text-align: center; font-size: 15px; margin-bottom: 24px;">
                Hey ${firstName || 'there'}, your GigLift plan has changed from ${planNames[oldPlan] || oldPlan} to <strong>${planNames[newPlan] || newPlan}</strong>.
            </p>
            <div style="text-align: center;">
                <a href="https://giglift.app/pricing" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                    View Plans →
                </a>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
                Questions? Reply to this email or reach us at hello@giglift.app
            </p>
        </div>
    `;

    try {
        await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
        console.log(`[email] Plan change email sent to ${to}: ${oldPlan} → ${newPlan}`);
    } catch (err) {
        console.error('[email] Failed to send plan change email:', err);
    }
}

// ---- Ambassador Acceptance Email ----

export async function sendAmbassadorAcceptedEmail(params: {
    to: string;
    firstName: string;
    artistName: string;
}): Promise<void> {
    const resend = getResend();
    if (!resend) {
        console.log('[email] Resend not configured — skipping ambassador email');
        return;
    }

    const { to, firstName, artistName } = params;

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0f0f23; color: #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://giglift.app/logo.png" alt="GigLift" style="width: 64px; height: 64px; border-radius: 12px;" />
            </div>
            <h1 style="background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; text-align: center; margin-bottom: 8px;">
                🌟 Congratulations, ${firstName || artistName}!
            </h1>
            <p style="color: #94a3b8; text-align: center; font-size: 16px; margin-bottom: 24px;">
                You've been accepted into the <strong style="color: #fbbf24;">GigLift Brand Ambassador Program</strong>!
            </p>
            <div style="background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04)); border: 1px solid rgba(251,191,36,0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #fbbf24; font-size: 14px; font-weight: 700; margin: 0 0 12px 0;">🎁 Your Ambassador Perks:</p>
                <ul style="color: #e2e8f0; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                    <li><strong style="color: #fbbf24;">Free Pro plan</strong> ($19/mo value) — active immediately</li>
                    <li>100 auto-scans per month</li>
                    <li>Unlimited lead storage</li>
                    <li>Auto-discovery from seeds</li>
                    <li>Early access to new features</li>
                    <li>Monthly showcase on our social channels</li>
                </ul>
            </div>
            <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-bottom: 24px;">
                Your account has been automatically upgraded to <strong style="color: #a78bfa;">Pro</strong>. 
                No credit card needed — it's on us as a thank you for helping grow the GigLift community. 🙏
            </p>
            <div style="text-align: center; margin-bottom: 16px;">
                <a href="https://giglift.app/dashboard" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1a2e; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                    Start Using Pro Features →
                </a>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
                Welcome aboard, ${artistName || firstName}! If you have any questions, reply to this email.<br/>
                — The GigLift Team
            </p>
        </div>
    `;

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: '🌟 Welcome to the GigLift Ambassador Program!',
            html,
        });
        console.log(`[email] Ambassador acceptance email sent to ${to}`);
    } catch (err) {
        console.error('[email] Failed to send ambassador email:', err);
    }
}

// ---- Helpers ----

function getPlanRank(plan: string): number {
    const ranks: Record<string, number> = { free: 0, pro: 1, unlimited: 2, agency: 3 };
    return ranks[plan] ?? 0;
}

function getUpgradeFeatures(plan: string): string {
    const features: Record<string, string[]> = {
        pro: [
            '100 auto-scans per month',
            'Unlimited lead storage',
            '2 regions',
            'Auto-discovery from seeds',
            'DJ Agent handoff',
            'Email templates',
        ],
        unlimited: [
            '250 auto-scans per month',
            'Unlimited lead storage',
            'Unlimited regions',
            'Auto-discovery from seeds',
            'Priority support',
            'CRM features',
        ],
        agency: [
            '10 DJ sub-accounts',
            'Everything in Unlimited, per DJ',
            'Bulk lead distribution',
            'Agency-wide analytics',
            'Dedicated account manager',
        ],
    };

    const list = features[plan] || features.pro;
    return list.map(f => `<div style="color: #e2e8f0; font-size: 13px; padding: 4px 0;">✅ ${f}</div>`).join('');
}

// ---- Outreach Email (User-drafted) ----

export async function sendOutreachEmail(params: {
    to: string;
    subject: string;
    body: string;       // markdown-ish plain text body
    replyTo: string;    // user's email so replies go to them
}): Promise<{ success: boolean; resendId?: string; error?: string }> {
    const resend = getResend();
    if (!resend) {
        return { success: false, error: 'Resend not configured (missing RESEND_API_KEY)' };
    }

    const { to, subject, body, replyTo } = params;

    // Convert markdown-ish body to simple HTML
    const htmlBody = body
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // bold
        .replace(/\*(.+?)\*/g, '<em>$1</em>')              // italic
        .replace(/^---$/gm, '<hr/>')                        // horizontal rule
        .replace(/^> (.+)$/gm, '<blockquote style="border-left: 3px solid #4a4a6a; padding-left: 12px; color: #94a3b8; margin: 8px 0;">$1</blockquote>')
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')          // numbered lists
        .replace(/\n/g, '<br/>');                           // newlines

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a2e; line-height: 1.6; font-size: 15px;">
            ${htmlBody}
        </div>
    `;

    try {
        const result = await resend.emails.send({
            from: process.env.EMAIL_OUTREACH_FROM || 'GigLift <outreach@giglift.app>',
            to,
            subject,
            html,
            replyTo,
        });
        console.log(`[email] Outreach email sent to ${to}: "${subject}" (resend_id: ${result.data?.id})`);
        return { success: true, resendId: result.data?.id || '' };
    } catch (err) {
        console.error('[email] Failed to send outreach email:', err);
        return { success: false, error: String(err) };
    }
}
