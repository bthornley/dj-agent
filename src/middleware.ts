import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes — accessible without login
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/pricing',
    '/terms',
    '/privacy',
    '/ambassador',
    '/guide',
    '/gigs(.*)',
    '/epk(.*)',
    '/api/epk(.*)',
    '/api/webhooks(.*)',
    '/api/ambassador/track',
    // Cron routes use CRON_SECRET, not Clerk auth
    '/api/agents(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect();
    }
    // Admin role checking is handled by requireAdmin() in route handlers
    // to avoid a redundant Clerk Backend API call.
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|mp4|wav|ogg)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};

