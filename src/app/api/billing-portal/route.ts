import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe, PLANS, PlanId } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/billing-portal — Open Stripe billing portal or handle plan changes
export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rl = rateLimit(`billing:${userId}`, 5, 60_000);
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
        }

        const body = await request.json();
        const action = body.action as string; // 'portal' | 'downgrade'

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const meta = user.publicMetadata as Record<string, unknown>;
        const stripeCustomerId = meta.stripeCustomerId as string | undefined;
        const currentPlan = (meta.planId as PlanId) || 'free';

        // Action: Open Stripe Billing Portal
        if (action === 'portal') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return NextResponse.json({
                    error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.',
                    fallback: true,
                    currentPlan,
                    plans: Object.values(PLANS).map(p => ({
                        id: p.id, name: p.name, price: p.price,
                        features: p.features,
                    })),
                }, { status: 200 });
            }

            if (stripeCustomerId) {
                const portalSession = await getStripe().billingPortal.sessions.create({
                    customer: stripeCustomerId,
                    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account`,
                });
                return NextResponse.json({ url: portalSession.url });
            }

            // No Stripe customer ID — return fallback billing info
            return NextResponse.json({
                error: 'No Stripe subscription found. Your plan may have been set manually.',
                fallback: true,
                currentPlan,
                plans: Object.values(PLANS).map(p => ({
                    id: p.id, name: p.name, price: p.price,
                    features: p.features,
                })),
            }, { status: 200 });
        }

        // Action: Downgrade to free
        if (action === 'downgrade') {
            // If they have a Stripe subscription, cancel it
            const subId = meta.stripeSubscriptionId as string | undefined;
            if (subId && process.env.STRIPE_SECRET_KEY) {
                try {
                    await getStripe().subscriptions.cancel(subId);
                } catch (err) {
                    console.error('Failed to cancel Stripe subscription:', err);
                }
            }

            // Update Clerk metadata
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    planId: 'free',
                    stripeSubscriptionId: undefined,
                },
            });

            return NextResponse.json({ success: true, planId: 'free' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Billing portal error:', error);
        return NextResponse.json({ error: 'Billing portal failed.' }, { status: 500 });
    }
}
