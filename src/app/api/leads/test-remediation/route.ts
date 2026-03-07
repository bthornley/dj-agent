import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const paginationSchema = z.object({
  limit: z.number().min(1).max(100),
  offset: z.number().min(0)
});

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const validationResult = paginationSchema.safeParse({ limit, offset });
    if (!validationResult.success) {
        return NextResponse.json({
            success: false,
            message: "Invalid query parameters."
        });
    }

    const user_id = request.headers.get('x-user-id');
    if (!user_id) {
        return NextResponse.json({
            success: false,
            message: "User ID is required."
        });
    }

    console.log("Fetching leads with pagination...");

    try {
        const totalQuery = db.prepare('SELECT COUNT(*) AS total FROM leads WHERE user_id = ?');
        const totalResult = totalQuery.get(user_id);
        const total = totalResult.total;

        const leadsQuery = db.prepare('SELECT * FROM leads WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
        const allLeads = leadsQuery.all(user_id, limit, offset);

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