'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Context-aware admin/app toggle.
 * - On app pages: shows "🛡️ Admin" to go to /admin
 * - On admin pages: shows "📊 App" to go back to /dashboard
 * Only visible to admin-role users. Sits next to ModeSwitch and UserButton.
 */
export default function AdminLink() {
    const { user, isLoaded } = useUser();
    const pathname = usePathname();

    if (!isLoaded || !user) return null;

    const role = (user.publicMetadata as Record<string, unknown>)?.role;
    if (role !== 'admin') return null;

    const isOnAdmin = pathname.startsWith('/admin');

    return (
        <Link
            href={isOnAdmin ? '/dashboard' : '/admin'}
            className="btn btn-ghost btn-sm"
            title={isOnAdmin ? 'Back to App' : 'Admin Dashboard'}
            style={{
                borderColor: isOnAdmin ? 'rgba(251,191,36,0.3)' : undefined,
                color: isOnAdmin ? '#fbbf24' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}
        >
            {isOnAdmin ? (
                <><span style={{ fontSize: '14px' }}>📊</span> <span className="hide-on-mobile">App</span></>
            ) : (
                <><span style={{ fontSize: '14px' }}>🛡️</span> <span className="hide-on-mobile">Admin</span></>
            )}
        </Link>
    );
}
