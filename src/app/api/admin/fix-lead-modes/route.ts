import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { clerkClient } from '@clerk/nextjs/server';

// POST /api/admin/fix-lead-modes — One-time migration to fix leads whose mode
// was corrupted to 'performer' by the dbSaveLead bug.
//
// Strategy:
// 1. For each user, get their query_seeds (each seed has a definitive mode)
// 2. For each lead, check agent_trace for seed region/keyword matches
// 3. If a lead was discovered from a seed, use that seed's mode
// 4. Leads that can't be matched to a seed keep their current mode

export async function POST() {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    try {
        // Get all seeds grouped by user
        const seedRows = await db.execute('SELECT id, user_id, data, mode FROM query_seeds');
        const seedsByUser: Map<string, Array<{ id: string; mode: string; region: string; keywords: string[] }>> = new Map();

        for (const row of seedRows.rows) {
            const userId = row.user_id as string;
            const mode = row.mode as string;
            const data = JSON.parse(row.data as string);
            if (!seedsByUser.has(userId)) seedsByUser.set(userId, []);
            seedsByUser.get(userId)!.push({
                id: row.id as string,
                mode,
                region: (data.region || '').toLowerCase(),
                keywords: (data.keywords || []).map((k: string) => k.toLowerCase()),
            });
        }

        // Get all leads
        const leadRows = await db.execute('SELECT lead_id, user_id, data, mode FROM leads');
        let fixed = 0;
        let skipped = 0;
        let unchanged = 0;
        const details: Array<{ lead_id: string; entity_name: string; oldMode: string; newMode: string; matchedSeed: string }> = [];

        for (const row of leadRows.rows) {
            const leadId = row.lead_id as string;
            const userId = row.user_id as string;
            const currentMode = row.mode as string;
            const data = JSON.parse(row.data as string);
            const agentTrace = (data.agent_trace || '').toLowerCase();
            const entityName = data.entity_name || 'Unknown';

            const userSeeds = seedsByUser.get(userId) || [];
            if (userSeeds.length === 0) {
                skipped++;
                continue;
            }

            // Try to match this lead to a seed by checking region + keywords in the agent_trace
            let bestMatch: { mode: string; score: number; seedId: string } = { mode: currentMode, score: 0, seedId: '' };

            for (const seed of userSeeds) {
                let score = 0;

                // Check if region appears in agent_trace or lead city
                if (seed.region && (agentTrace.includes(seed.region) || (data.city || '').toLowerCase().includes(seed.region))) {
                    score += 3;
                }

                // Check if any seed keywords appear in agent_trace, entity_name, or notes
                for (const kw of seed.keywords) {
                    if (agentTrace.includes(kw) || (entityName || '').toLowerCase().includes(kw) || (data.notes || '').toLowerCase().includes(kw)) {
                        score += 2;
                    }
                }

                // Check if entity_type or music_fit_tags suggest a mode
                // instructor-mode entities often contain: school, academy, lesson, instructor, teacher
                const instructorSignals = ['school', 'academy', 'lesson', 'instructor', 'teacher', 'music lesson',
                    'music school', 'teaching', 'tutoring', 'education', 'conservatory', 'training'];
                // studio-mode entities: recording, studio, session, engineer, producer
                const studioSignals = ['recording', 'studio', 'session', 'engineer', 'producer', 'mixing',
                    'mastering', 'sound design', 'audio', 'sync licensing'];
                // touring-mode entities: tour, festival, booking agent
                const touringSignals = ['tour', 'festival', 'booking agent', 'concert', 'arena',
                    'amphitheater', 'touring', 'road'];

                const textToCheck = `${agentTrace} ${entityName.toLowerCase()} ${(data.entity_type || '').toLowerCase()} ${(data.notes || '').toLowerCase()}`;

                if (seed.mode === 'instructor' && instructorSignals.some(s => textToCheck.includes(s))) score += 5;
                if (seed.mode === 'studio' && studioSignals.some(s => textToCheck.includes(s))) score += 5;
                if (seed.mode === 'touring' && touringSignals.some(s => textToCheck.includes(s))) score += 5;

                if (score > bestMatch.score) {
                    bestMatch = { mode: seed.mode, score, seedId: seed.id };
                }
            }

            // Only update if we found a meaningful match and it differs from current
            if (bestMatch.score >= 3 && bestMatch.mode !== currentMode) {
                await db.execute({
                    sql: 'UPDATE leads SET mode = ? WHERE lead_id = ?',
                    args: [bestMatch.mode, leadId],
                });
                fixed++;
                details.push({
                    lead_id: leadId,
                    entity_name: entityName,
                    oldMode: currentMode,
                    newMode: bestMatch.mode,
                    matchedSeed: bestMatch.seedId,
                });
            } else {
                unchanged++;
            }
        }

        // Also get user info for report
        let userCount = 0;
        try {
            const client = await clerkClient();
            userCount = await client.users.getCount();
        } catch { /* ignore */ }

        return NextResponse.json({
            success: true,
            summary: {
                totalLeads: leadRows.rows.length,
                fixed,
                unchanged,
                skipped,
                userCount,
                seedCount: seedRows.rows.length,
            },
            fixed: details,
        });
    } catch (error) {
        console.error('[fix-lead-modes] Error:', error);
        return NextResponse.json({ error: 'Migration failed', detail: String(error) }, { status: 500 });
    }
}
