import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes — accessible without login
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/pricing',
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

    // Admin route protection
    if (isAdminRoute(request)) {
        const { sessionClaims } = await auth();
        const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
        if (metadata?.role !== 'admin') {
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
