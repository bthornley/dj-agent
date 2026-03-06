import { NextResponse } from 'next/server';
import { createPerformanceIndexes } from '@/lib/db/indexes';

export async function POST() {
    try {
        const results = await createPerformanceIndexes();
        return NextResponse.json({ success: true, indexes: results });
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to create indexes',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
