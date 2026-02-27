import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Check if the current user has admin role.
 * Fetches user from Clerk Backend API to check publicMetadata.role.
 * Returns userId if admin, or a 403 NextResponse if not.
 */
export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as Record<string, unknown>)?.role;

    if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    return { userId };
}

/**
 * Check if the current user is an admin (for non-API contexts).
 */
export async function isAdmin(): Promise<boolean> {
    const { userId } = await auth();
    if (!userId) return false;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as Record<string, unknown>)?.role;
    return role === 'admin';
}
