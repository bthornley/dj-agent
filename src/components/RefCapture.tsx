'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Captures ?ref=AMBASSADOR_ID from the URL and stores it in a cookie
// so we can attribute the signup later
export default function RefCapture() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const ref = searchParams.get('ref');
        if (ref) {
            document.cookie = `giglift_ref=${encodeURIComponent(ref)};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
        }
    }, [searchParams]);

    return null; // Invisible component
}
