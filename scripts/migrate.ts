#!/usr/bin/env tsx
/**
 * GigLift — Deploy-time database migration script
 *
 * Runs all CREATE TABLE, ALTER TABLE, and CREATE INDEX statements.
 * Designed to be idempotent — safe to run multiple times.
 *
 * Usage:  npx tsx scripts/migrate.ts
 * Called automatically during `npm run build`.
 */

import { createClient } from '@libsql/client';

async function migrate() {
    const url = process.env.TURSO_DATABASE_URL || 'file:data/giglift.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    console.log(`[migrate] Connecting to ${url.startsWith('file:') ? url : '(remote Turso)'}...`);

    const db = createClient({ url, authToken });

    // ── Core Tables ──────────────────────────────────────
    console.log('[migrate] Creating tables...');
    await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      lead_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      dedupe_key TEXT,
      lead_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new',
      priority TEXT DEFAULT 'P3',
      mode TEXT DEFAULT 'performer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS query_seeds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      mode TEXT DEFAULT 'performer',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS search_quota (
      quota_key TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      status TEXT DEFAULT 'idea',
      pillar TEXT DEFAULT '',
      post_type TEXT DEFAULT '',
      plan_id TEXT DEFAULT '',
      scheduled_for TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      week_of TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS engagement_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      type TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      requires_approval INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      file_name TEXT DEFAULT '',
      media_type TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS epk_configs (
      user_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT DEFAULT '',
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      resend_id TEXT DEFAULT '',
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_template TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flyer_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT DEFAULT '',
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

    // ── Column Migrations (idempotent via try/catch) ─────
    console.log('[migrate] Running column migrations...');

    const columnMigrations = [
        `ALTER TABLE leads ADD COLUMN mode TEXT DEFAULT 'performer'`,
        `ALTER TABLE query_seeds ADD COLUMN mode TEXT DEFAULT 'performer'`,
    ];

    for (const sql of columnMigrations) {
        try {
            await db.execute({ sql, args: [] });
            console.log(`  ✓ ${sql.substring(0, 60)}...`);
        } catch {
            // Column already exists — expected
        }
    }

    // ── Generated Columns (JSON blob queryability) ───────
    console.log('[migrate] Adding generated columns...');

    const generatedColumns = [
        // Events: extract commonly filtered fields from JSON blob
        `ALTER TABLE events ADD COLUMN venue_name TEXT GENERATED ALWAYS AS (json_extract(data, '$.venueName')) STORED`,
        `ALTER TABLE events ADD COLUMN event_type TEXT GENERATED ALWAYS AS (json_extract(data, '$.eventType')) STORED`,
        `ALTER TABLE events ADD COLUMN event_date TEXT GENERATED ALWAYS AS (json_extract(data, '$.date')) STORED`,
        `ALTER TABLE events ADD COLUMN event_status TEXT GENERATED ALWAYS AS (json_extract(data, '$.status')) STORED`,
        // Social posts: extract caption preview for search
        `ALTER TABLE social_posts ADD COLUMN caption_preview TEXT GENERATED ALWAYS AS (substr(json_extract(data, '$.caption'), 1, 100)) STORED`,
    ];

    for (const sql of generatedColumns) {
        try {
            await db.execute({ sql, args: [] });
            console.log(`  ✓ ${sql.substring(0, 70)}...`);
        } catch {
            // Column already exists — expected
        }
    }

    // ── Indexes ──────────────────────────────────────────
    console.log('[migrate] Creating indexes...');
    await db.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_leads_user_mode ON leads(user_id, mode);
    CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_leads_user_score ON leads(user_id, lead_score DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_dedupe ON leads(dedupe_key, user_id);
    CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_venue ON events(user_id, venue_name);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(user_id, event_date);
    CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_social_posts_plan ON social_posts(plan_id);
    CREATE INDEX IF NOT EXISTS idx_content_plans_user ON content_plans(user_id, week_of);
    CREATE INDEX IF NOT EXISTS idx_engagement_tasks_user ON engagement_tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_media_assets_user ON media_assets(user_id);
    CREATE INDEX IF NOT EXISTS idx_sent_emails_user ON sent_emails(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_flyer_configs_user ON flyer_configs(user_id);
    CREATE INDEX IF NOT EXISTS idx_query_seeds_user ON query_seeds(user_id, mode);
  `);

    console.log('[migrate] ✅ All migrations complete.');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('[migrate] ❌ Migration failed:', err);
    process.exit(1);
});
