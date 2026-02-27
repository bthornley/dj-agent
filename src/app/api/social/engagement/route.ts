import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetEngagementTasks, dbSaveEngagementTask, dbGetBrandProfile } from '@/lib/db';
import { dbGetAllLeads } from '@/lib/db';
import { generateDailyEngagement } from '@/lib/agent/social/community';
import { checkEngagementGuardrails } from '@/lib/agent/social/guardrails';

// GET /api/social/engagement — List engagement tasks
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const tasks = await dbGetEngagementTasks(userId, status);
    return NextResponse.json(tasks);
}

// POST /api/social/engagement — Generate new engagement tasks
export async function POST() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const brand = await dbGetBrandProfile(userId);
    const leads = await dbGetAllLeads(userId);
    const tasks = generateDailyEngagement(brand, leads);

    // Save all tasks
    for (const task of tasks) {
        await dbSaveEngagementTask(task, userId);
    }

    return NextResponse.json({ success: true, tasks }, { status: 201 });
}

// PATCH /api/social/engagement — Approve/complete a task
export async function PATCH(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, draftReply } = await request.json();
    if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 });

    // Find the task
    const tasks = await dbGetEngagementTasks(userId);
    const task = tasks.find(t => t.id === id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (status) task.status = status;
    if (draftReply !== undefined) task.draftReply = draftReply;
    task.updatedAt = new Date().toISOString();

    // Run guardrails on approval
    if (status === 'approved') {
        const guardrails = checkEngagementGuardrails(task);
        if (!guardrails.passed) {
            return NextResponse.json({
                error: 'Guardrail check failed',
                blockers: guardrails.blockers,
                warnings: guardrails.warnings,
            }, { status: 422 });
        }
    }

    await dbSaveEngagementTask(task, userId);
    return NextResponse.json({ success: true, task });
}
