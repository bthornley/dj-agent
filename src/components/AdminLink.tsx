'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

/**
 * Renders an admin link if the current user has role = 'admin' in publicMetadata.
 * Place this next to <UserButton /> in the topbar nav.
 */
export default function AdminLink() {
    const { user, isLoaded } = useUser();

    if (!isLoaded || !user) return null;

    const role = (user.publicMetadata as Record<string, unknown>)?.role;
    if (role !== 'admin') return null;

    return (
        <Link href="/admin" className="btn btn-ghost btn-sm" title="Admin Dashboard">
            🛡️ Admin
        </Link>
    );
}
