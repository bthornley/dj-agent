'use client';

import Link from 'next/link';

interface NavLogoProps {
    href?: string;
}

export default function NavLogo({ href = '/' }: NavLogoProps) {
    return (
        <Link href="/" className="topbar-logo" style={{ textDecoration: 'none' }}>
            <img
                src="/logo.png"
                alt="GigLift"
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.4))',
                }}
            />
            <span>GigLift</span>
        </Link>
    );
}
