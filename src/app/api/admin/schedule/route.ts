import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getScheduleStatus, toggleAgent } from '@/lib/agents/schedule';

// GET /api/admin/schedule — Get all agent schedules with status
export async function GET() {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    try {
        const schedule = await getScheduleStatus();
        return NextResponse.json({ schedule });
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to load schedule',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

// POST /api/admin/schedule — Toggle an agent on/off
export async function POST(request: Request) {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    try {
        const { agentId, enabled } = await request.json();

        if (!agentId || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'Missing agentId or enabled (boolean)' }, { status: 400 });
        }

        await toggleAgent(agentId, enabled);

        return NextResponse.json({
            success: true,
            agentId,
            enabled,
            message: `Agent "${agentId}" ${enabled ? 'enabled' : 'disabled'}`,
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to update schedule',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
