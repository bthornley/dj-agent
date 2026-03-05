import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetAllLeads } from '@/lib/db';

// GET /api/leads/export — CSV export of all leads
export async function GET(request: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'performer';

    const result = await dbGetAllLeads(userId, { mode });
    const leads = result.data;

    const headers = ['entity_name', 'entity_type', 'city', 'state', 'email', 'phone', 'website', 'lead_score', 'priority', 'status', 'contact_name', 'notes'];
    const rows = leads.map(lead => {
        return headers.map(h => {
            const val = String((lead as unknown as Record<string, unknown>)[h] ?? '');
            // Escape CSV: wrap in quotes if contains comma, newline, or quote
            if (val.includes(',') || val.includes('\n') || val.includes('"')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="giglift-leads-${mode}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
    });
}
