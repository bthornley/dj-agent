import { Event, PlannerResult, PlannerTask, DeliverableType } from '../types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Planner Module — Decide which artifacts to generate
// ============================================================

export function plan(event: Partial<Event>): PlannerResult {
    const tasks: PlannerTask[] = [];

    // 1) Run of Show — needs at least date + times
    tasks.push(makeTask('run_of_show', 'Run of Show', event, ['date', 'startTime']));

    // 2) Gear Checklist — needs attendance + indoor/outdoor
    tasks.push(makeTask('gear_checklist', 'Equipment Checklist', event, ['attendanceEstimate']));

    // 3) Proposal — needs attendance + event type
    tasks.push(makeTask('proposal', 'Proposal / Quote', event, ['attendanceEstimate', 'eventType']));

    // 4) Show Sheet — needs venue + contacts + date
    tasks.push(makeTask('show_sheet', 'Day-of Show Sheet', event, ['venueName', 'date', 'clientName']));

    // 5) Email Draft — always generate (uses whatever info we have)
    tasks.push({
        id: uuid(),
        type: 'email_draft',
        label: 'Client Email Draft',
        ready: true,
        blockers: [],
    });

    const readyCount = tasks.filter((t) => t.ready).length;
    const summary =
        readyCount === tasks.length
            ? `All ${tasks.length} deliverables are ready to generate.`
            : `${readyCount} of ${tasks.length} deliverables ready. ${tasks.length - readyCount} blocked on missing info.`;

    return { tasks, summary };
}

function makeTask(
    type: DeliverableType,
    label: string,
    event: Partial<Event>,
    requiredFields: (keyof Event)[]
): PlannerTask {
    const blockers: string[] = [];
    for (const field of requiredFields) {
        const val = event[field];
        if (val === undefined || val === null || val === '' || val === 0) {
            blockers.push(field as string);
        }
    }
    return {
        id: uuid(),
        type,
        label,
        ready: blockers.length === 0,
        blockers,
    };
}
