'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import AdminLink from '@/components/AdminLink';
import ModeSwitch from '@/components/ModeSwitch';
import { useAppMode, AppMode } from '@/hooks/useAppMode';

// ============================================================
// Shared Topbar — One nav component for all pages
// Logo always links to '/', company name + tagline always visible
// Admin/App switching via AdminLink toggle (next to user icon)
// ============================================================

interface TopbarProps {
    /** Optional callback when mode changes (for pages that need to react to it) */
    onModeChange?: (mode: AppMode) => void;
}

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', emoji: '📋' },
    { href: '/leads', label: 'Leads', emoji: '🔍' },
    { href: '/leads/scan', label: 'Scan', emoji: '📡' },
    { href: '/social', label: 'Social', emoji: '👥' },
    { href: '/epk/builder', label: 'EPK', emoji: '📋' },
    { href: '/flyer/create', label: 'Flyer', emoji: '🎨' },
    { href: '/emails', label: 'Emails', emoji: '📧' },
    { href: '/guide', label: 'Guide', emoji: '📖' },
    { href: '/account', label: 'Account', emoji: '⚙️' },
];

const ADMIN_NAV_ITEMS = [
    { href: '/admin', label: 'Overview', emoji: '🛡️' },
    { href: '/admin/agents', label: 'Agents', emoji: '🤖' },
    { href: '/admin/docs', label: 'Docs', emoji: '📄' },
    { href: '/admin/instagram', label: 'Instagram', emoji: '📸' },
];

export default function Topbar({ onModeChange }: TopbarProps) {
    const pathname = usePathname();
    const { headerStyle, logoFilter, accentColor, modeConfig } = useAppMode();

    const isOnAdmin = pathname.startsWith('/admin');

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        if (href === '/leads') return pathname === '/leads' || pathname === '/leads/detail';
        if (href === '/leads/scan') return pathname === '/leads/scan' || pathname === '/leads/seeds';
        if (href === '/social') return pathname.startsWith('/social');
        if (href === '/admin') return pathname === '/admin';
        return pathname === href || pathname.startsWith(href + '/');
    };

    // Show admin sub-nav when on admin pages, regular nav otherwise
    const navItems = isOnAdmin ? ADMIN_NAV_ITEMS : NAV_ITEMS;

    return (
        <header className="topbar" style={headerStyle}>
            <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/logo.png"
                    alt="GigLift"
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        filter: logoFilter,
                    }}
                />
                <div className="topbar-brand">
                    <span className="topbar-brand-name" style={modeConfig.key !== 'performer' ? { color: accentColor } : undefined}>
                        GigLift
                    </span>
                    <span className="topbar-tagline">Lift Your Gigs</span>
                </div>
            </Link>

            <nav className="topbar-nav" style={{ gap: '6px', alignItems: 'center' }}>
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`btn btn-sm ${isActive(item.href) ? 'btn-secondary' : 'btn-ghost'}`}
                    >
                        {item.emoji} {item.label}
                    </Link>
                ))}
                <ModeSwitch onChange={onModeChange} />
                <AdminLink />
                <UserButton />
            </nav>
        </header>
    );
}
