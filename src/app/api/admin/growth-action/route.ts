import { NextResponse } from 'next/server';
import { GROWTH_ACTIONS } from '@/lib/agents/growth/growth-actions';
import { getDb } from '@/lib/db';

// POST /api/admin/growth-action — Launch a specific automated growth action
export async function POST(request: Request) {
    try {
        const { actionId, taskId } = await request.json();

        if (!actionId) {
            return NextResponse.json({ error: 'Missing actionId' }, { status: 400 });
        }

        const action = GROWTH_ACTIONS[actionId];
        if (!action) {
            // Try to match by task title keywords
            const matchedAction = Object.entries(GROWTH_ACTIONS).find(([, a]) =>
                actionId.toLowerCase().includes(a.name.toLowerCase().split(' ')[0].toLowerCase())
            );
            if (!matchedAction) {
                return NextResponse.json({ error: `Unknown action: ${actionId}`, available: Object.keys(GROWTH_ACTIONS) }, { status: 400 });
            }
            // Use matched action
            const result = await matchedAction[1].run();

            // Update task status if taskId provided
            if (taskId) {
                try {
                    const db = getDb();
                    await db.execute({
                        sql: `UPDATE growth_tasks SET status = 'completed' WHERE id = ?`,
                        args: [taskId],
                    });
                } catch (e) { console.error('[growth-action] Failed to update task:', e); }
            }

            return NextResponse.json({ ...result, success: true });
        }

        console.log(`[growth-action] Launching: ${action.name}`);
        const result = await action.run();
        console.log(`[growth-action] Result:`, result);

        // Update task status if taskId provided
        if (taskId) {
            try {
                const db = getDb();
                await db.execute({
                    sql: `UPDATE growth_tasks SET status = 'completed' WHERE id = ?`,
                    args: [taskId],
                });
            } catch (e) { console.error('[growth-action] Failed to update task:', e); }
        }

        return NextResponse.json({ ...result, success: true });
    } catch (error) {
        console.error('[growth-action] Error:', error);
        return NextResponse.json({
            error: 'Growth action failed',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

// GET /api/admin/growth-action — List available automated actions
export async function GET() {
    const actions = Object.entries(GROWTH_ACTIONS).map(([id, action]) => ({
        id,
        name: action.name,
        description: action.description,
    }));
    return NextResponse.json({ actions });
}
