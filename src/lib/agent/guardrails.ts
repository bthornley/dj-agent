import { Event, Deliverable } from '../types';
import { DEFAULT_INVENTORY } from '../inventory';

// ============================================================
// Guardrails — Safety checks before outputting anything
// ============================================================

export interface GuardrailResult {
    passed: boolean;
    warnings: string[];
    blockers: string[];
}

/**
 * Run all guardrail checks on generated deliverables.
 */
export function checkGuardrails(
    event: Partial<Event>,
    deliverables: Deliverable[]
): GuardrailResult {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // 1) Check all gear references exist in inventory
    if (event.inventoryRequired) {
        for (const req of event.inventoryRequired) {
            const exists = DEFAULT_INVENTORY.find((i) => i.id === req.itemId);
            if (!exists) {
                blockers.push(`Gear item "${req.itemId}" is not in your inventory. Remove or replace it.`);
            } else if (req.quantity > exists.quantity) {
                warnings.push(
                    `Requesting ${req.quantity}× ${exists.name} but only ${exists.quantity} available.`
                );
            }
        }
    }

    // 2) Wireless mic check
    if (event.rawInquiry && /wireless/i.test(event.rawInquiry)) {
        warnings.push(
            'Client mentioned wireless mics — you currently have wired only. Flag this in your response.'
        );
    }

    // 3) Outdoor event without power mention
    if (
        (event.indoorOutdoor === 'outdoor' || event.indoorOutdoor === 'both') &&
        event.rawInquiry &&
        !/power|circuit|generator/i.test(event.rawInquiry)
    ) {
        warnings.push(
            'Outdoor event with no power details. Ask about generator / dedicated circuit availability.'
        );
    }

    // 4) Large crowd without subs
    if (event.attendanceEstimate && event.attendanceEstimate > 150) {
        warnings.push(
            `${event.attendanceEstimate} guests — confirm PA is sufficient. Consider renting additional subs.`
        );
    }

    // 5) No delivery should be marked "sent" — always draft
    for (const d of deliverables) {
        if (d.status === 'sent') {
            blockers.push(
                `Deliverable "${d.type}" is marked as "sent" but auto-send is disabled in v1. Reset to "draft".`
            );
        }
    }

    // 6) Surface assumptions
    const assumptions: string[] = [];
    if (!event.date) assumptions.push('Event date is unknown');
    if (!event.attendanceEstimate) assumptions.push('Attendance not confirmed');
    if (!event.indoorOutdoor) assumptions.push('Indoor/outdoor not specified');
    if (!event.budgetRange) assumptions.push('Budget not provided');
    if (assumptions.length > 0) {
        warnings.push(`Assumptions: ${assumptions.join('; ')}. Confirm with client.`);
    }

    return {
        passed: blockers.length === 0,
        warnings,
        blockers,
    };
}

/**
 * Ensure a price change has been explicitly confirmed.
 */
export function validatePriceChange(
    originalPrice: number,
    newPrice: number,
    confirmed: boolean
): { allowed: boolean; message: string } {
    if (originalPrice === newPrice) {
        return { allowed: true, message: '' };
    }
    if (!confirmed) {
        return {
            allowed: false,
            message: `Price change from $${originalPrice} to $${newPrice} requires explicit confirmation.`,
        };
    }
    return { allowed: true, message: 'Price change confirmed.' };
}
