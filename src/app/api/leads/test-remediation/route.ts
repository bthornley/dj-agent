import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    console.log("Fetching leads with pagination...");

    try {
        const totalQuery = db.prepare('SELECT COUNT(*) AS total FROM leads');
        const totalResult = totalQuery.get();
        const total = totalResult.total;

        const leadsQuery = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?');
        const allLeads = leadsQuery.all(limit, offset);

        const hasMore = offset + allLeads.length < total;

        return NextResponse.json({
            success: true,
            total,
            limit,
            offset,
            hasMore,
            data: allLeads
        });
    } catch (error) {
        console.error("Failed to fetch leads:", error);
        return NextResponse.json({
            success: false,
            message: "Failed to fetch leads due to an internal error."
        });
    }
}