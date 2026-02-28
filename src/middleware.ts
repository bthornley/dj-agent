import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';

// Public routes — accessible without login
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/pricing',
    '/terms',
    '/privacy',
    '/epk(.*)',
    '/api/epk(.*)',
    '/api/webhooks(.*)',
]);

// Admin routes — require admin role
const isAdminRoute = createRouteMatcher([
    '/admin(.*)',
    '/api/admin(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect();
    }

    // Admin route protection — fetch user from Clerk Backend API
    if (isAdminRoute(request)) {
        const { userId } = await auth();
        if (!userId) return new Response('Unauthorized', { status: 401 });

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const role = (user.publicMetadata as Record<string, unknown>)?.role;

        if (role !== 'admin') {
            return new Response('Forbidden — admin access required', { status: 403 });
        }
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
