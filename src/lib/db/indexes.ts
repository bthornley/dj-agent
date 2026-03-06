import { getDb } from '@/lib/db';

// ============================================================
// Database Performance Indexes
// Run once at deploy time via /api/admin/init-indexes
// ============================================================

export async function createPerformanceIndexes(): Promise<string[]> {
    const db = getDb();
    const results: string[] = [];

    const indexes = [
        // Users
        { name: 'idx_users_plan', sql: 'CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan)' },
        { name: 'idx_users_app_mode', sql: 'CREATE INDEX IF NOT EXISTS idx_users_app_mode ON users(app_mode)' },
        { name: 'idx_users_created', sql: 'CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at)' },

        // Leads
        { name: 'idx_leads_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)' },
        { name: 'idx_leads_status', sql: 'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)' },
        { name: 'idx_leads_user_status', sql: 'CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status)' },
        { name: 'idx_leads_score', sql: 'CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC)' },

        // Scan history
        { name: 'idx_scans_user', sql: 'CREATE INDEX IF NOT EXISTS idx_scans_user ON scan_history(user_id)' },
        { name: 'idx_scans_created', sql: 'CREATE INDEX IF NOT EXISTS idx_scans_created ON scan_history(created_at)' },
        { name: 'idx_scans_user_created', sql: 'CREATE INDEX IF NOT EXISTS idx_scans_user_created ON scan_history(user_id, created_at)' },

        // Events
        { name: 'idx_events_user', sql: 'CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id)' },
        { name: 'idx_events_status', sql: 'CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)' },
        { name: 'idx_events_date', sql: 'CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)' },

        // Sent emails
        { name: 'idx_sent_emails_user', sql: 'CREATE INDEX IF NOT EXISTS idx_sent_emails_user ON sent_emails(user_id)' },
        { name: 'idx_sent_emails_status', sql: 'CREATE INDEX IF NOT EXISTS idx_sent_emails_status ON sent_emails(status)' },

        // Seeds
        { name: 'idx_seed_keywords_user', sql: 'CREATE INDEX IF NOT EXISTS idx_seed_keywords_user ON seed_keywords(user_id)' },

        // Growth tasks
        { name: 'idx_growth_tasks_status', sql: 'CREATE INDEX IF NOT EXISTS idx_growth_tasks_status ON growth_tasks(status)' },
        { name: 'idx_growth_tasks_type', sql: 'CREATE INDEX IF NOT EXISTS idx_growth_tasks_type ON growth_tasks(type)' },

        // Outreach drafts
        { name: 'idx_outreach_status', sql: 'CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_drafts(status)' },

        // Ambassador applications
        { name: 'idx_ambassador_status', sql: 'CREATE INDEX IF NOT EXISTS idx_ambassador_status ON ambassador_applications(status)' },

        // School pipeline
        { name: 'idx_schools_status', sql: 'CREATE INDEX IF NOT EXISTS idx_schools_status ON school_pipeline(status)' },
        { name: 'idx_school_outreach_status', sql: 'CREATE INDEX IF NOT EXISTS idx_school_outreach_status ON school_outreach_log(status)' },
    ];

    for (const idx of indexes) {
        try {
            await db.execute({ sql: idx.sql, args: [] });
            results.push(`✅ ${idx.name}`);
        } catch (err) {
            results.push(`⚠️ ${idx.name}: ${err}`);
        }
    }

    return results;
}
