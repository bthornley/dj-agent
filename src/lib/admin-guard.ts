import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Check if the current user has admin role.
 * Uses Clerk session claims → publicMetadata.role.
 * Returns userId if admin, or a 403 NextResponse if not.
 */
export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
    const role = metadata?.role as string | undefined;

    if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    return { userId };
}

/**
 * Check if a userId corresponds to an admin user (for non-API contexts).
 */
export async function isAdmin(): Promise<boolean> {
    const { sessionClaims } = await auth();
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
    return metadata?.role === 'admin';
}
