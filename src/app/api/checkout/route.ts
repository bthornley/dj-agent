import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe, PLANS, PlanId } from '@/lib/stripe';
import { getUserPlan } from '@/lib/subscription';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/checkout — Create a Stripe Checkout session
export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const planId = body.planId as PlanId;

        // Rate limit: 5 checkout attempts per minute per user
        const rl = rateLimit(`checkout:${userId}`, 5, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many checkout attempts. Please wait.' },
                { status: 429 }
            );
        }

        if (!planId || !PLANS[planId] || planId === 'free') {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const plan = PLANS[planId];
        if (!plan.priceId) {
            return NextResponse.json({ error: 'Plan not configured in Stripe' }, { status: 400 });
        }

        // Check if user already has a subscription
        const userPlan = await getUserPlan();
        if (userPlan.stripeCustomerId) {
            // Create a billing portal session for plan changes
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: userPlan.stripeCustomerId,
                return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account`,
            });
            return NextResponse.json({ url: portalSession.url });
        }

        // Create a new Checkout session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: plan.priceId, quantity: 1 }],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?upgraded=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing`,
            metadata: { userId, planId },
            subscription_data: {
                metadata: { userId, planId },
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Checkout failed. Please try again.' }, { status: 500 });
    }
}
