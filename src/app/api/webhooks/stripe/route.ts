import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { clerkClient } from '@clerk/nextjs/server';

// POST /api/webhooks/stripe — Handle Stripe webhook events
export async function POST(request: NextRequest) {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
        // Tolerance of 300 seconds (5 minutes) — rejects replayed webhook events
        event = getStripe().webhooks.constructEvent(body, sig, webhookSecret, 300);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.userId;
                const planId = session.metadata?.planId;

                if (userId && planId) {
                    const client = await clerkClient();
                    await client.users.updateUserMetadata(userId, {
                        publicMetadata: {
                            planId,
                            stripeCustomerId: session.customer as string,
                            stripeSubscriptionId: session.subscription as string,
                        },
                    });
                    console.log(`✅ User ${userId} upgraded to ${planId}`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const userId = subscription.metadata?.userId;

                if (userId) {
                    const isActive = ['active', 'trialing'].includes(subscription.status);
                    const client = await clerkClient();
                    await client.users.updateUserMetadata(userId, {
                        publicMetadata: {
                            planId: isActive ? (subscription.metadata?.planId || 'pro') : 'free',
                            stripeSubscriptionId: subscription.id,
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const userId = subscription.metadata?.userId;

                if (userId) {
                    const client = await clerkClient();
                    await client.users.updateUserMetadata(userId, {
                        publicMetadata: {
                            planId: 'free',
                            stripeSubscriptionId: null,
                        },
                    });
                    console.log(`⬇ User ${userId} downgraded to free`);
                }
                break;
            }
        }
    } catch (err) {
        console.error('Webhook processing error:', err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
