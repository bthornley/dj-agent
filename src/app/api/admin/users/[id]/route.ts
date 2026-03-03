import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { dbGetUserStats, dbGetAllEvents, dbGetAllLeads, dbGetAllSocialPosts, dbGetBrandProfile } from '@/lib/db';
import { clerkClient } from '@clerk/nextjs/server';
import { sendPlanChangeEmail, sendAmbassadorAcceptedEmail } from '@/lib/email';

// GET /api/admin/users/[id] — Get user detail with all data
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: userId } = await params;

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        // Get all user data from DB — each wrapped independently
        const stats = await dbGetUserStats(userId).catch(() => ({
            events: 0, leads: 0, posts: 0, plans: 0, mediaAssets: 0, hasBrand: false,
        }));
        const events = await dbGetAllEvents(userId).catch(() => []);
        const leads = await dbGetAllLeads(userId).catch(() => []);
        const posts = await dbGetAllSocialPosts(userId).catch(() => []);
        const brand = await dbGetBrandProfile(userId).catch(() => null);

        // Ambassador application data (from privateMetadata — only visible to admins)
        const ambassadorApplication = (user.privateMetadata as Record<string, unknown>)?.ambassadorApplication || null;

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                imageUrl: user.imageUrl,
                createdAt: user.createdAt,
                lastSignInAt: user.lastSignInAt,
                role: (user.publicMetadata as Record<string, unknown>)?.role || 'user',
                publicMetadata: user.publicMetadata,
            },
            stats,
            events: (events || []).slice(0, 20),
            leads: (leads || []).slice(0, 20),
            posts: (posts || []).slice(0, 20),
            brand,
            ambassadorApplication,
        });
    } catch (err) {
        console.error('Admin user detail error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to fetch user', detail: message }, { status: 500 });
    }
}

// PATCH /api/admin/users/[id] — Update user metadata
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: userId } = await params;
    const body = await request.json();

    try {
        const client = await clerkClient();

        if (body.role !== undefined) {
            await client.users.updateUserMetadata(userId, {
                publicMetadata: { role: body.role },
            });
        }

        // Manual plan change by admin
        if (body.planId !== undefined) {
            const validPlans = ['free', 'pro', 'unlimited', 'agency'];
            if (!validPlans.includes(body.planId)) {
                return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
            }
            const user = await client.users.getUser(userId);
            const oldPlan = (user.publicMetadata as Record<string, unknown>)?.planId as string || 'free';

            await client.users.updateUserMetadata(userId, {
                publicMetadata: { planId: body.planId },
            });

            // Send plan change email
            const email = user.emailAddresses[0]?.emailAddress;
            if (email && oldPlan !== body.planId) {
                sendPlanChangeEmail({
                    to: email,
                    firstName: user.firstName || '',
                    oldPlan,
                    newPlan: body.planId,
                }).catch(err => console.error('[admin] Email send error:', err));
            }
        }

        // Ambassador toggle — sets ambassador flag + auto-upgrades to pro
        if (body.ambassador !== undefined) {
            const isAmbassador = Boolean(body.ambassador);
            const publicUpdates: Record<string, unknown> = {
                ambassador: isAmbassador,
                ambassadorPending: false, // Clear pending flag
            };
            if (isAmbassador) {
                publicUpdates.planId = 'pro';
                publicUpdates.ambassadorSince = new Date().toISOString();
            } else {
                // Revert to free unless they have a paid subscription
                const user = await client.users.getUser(userId);
                const currentMeta = user.publicMetadata as Record<string, unknown>;
                if (!currentMeta.stripeSubscriptionId) {
                    publicUpdates.planId = 'free';
                }
                publicUpdates.ambassadorSince = null;
            }
            // Update public metadata
            await client.users.updateUserMetadata(userId, {
                publicMetadata: publicUpdates,
            });
            // Update application status in privateMetadata
            const user = await client.users.getUser(userId);
            const app = (user.privateMetadata as Record<string, unknown>)?.ambassadorApplication;
            if (app && typeof app === 'object') {
                await client.users.updateUserMetadata(userId, {
                    privateMetadata: {
                        ambassadorApplication: {
                            ...app,
                            status: isAmbassador ? 'approved' : 'rejected',
                            reviewedAt: new Date().toISOString(),
                        },
                    },
                });
            }

            // Send ambassador acceptance email
            if (isAmbassador) {
                const email = user.emailAddresses[0]?.emailAddress;
                const appData = app as Record<string, unknown>;
                if (email) {
                    sendAmbassadorAcceptedEmail({
                        to: email,
                        firstName: user.firstName || '',
                        artistName: (appData?.artistName as string) || user.firstName || '',
                    }).catch(err => console.error('[admin] Ambassador email error:', err));
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Admin user update error:', err);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
