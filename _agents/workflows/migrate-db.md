---
description: Running Database Migrations
---

# Database Migrations

GigLift uses a **Turso (LibSQL)** database, and the schema is managed via Drizzle ORM (or raw SQL scripts, depending on the implementation). When modifying the database structure (adding tables, altering columns, etc.), you must run the migration script to apply these changes to the live database.

1. **Ensure your `.env.local` is configured:**
   Verify that you have the correct Turso credentials in your environment file.
   ```
   TURSO_DATABASE_URL=libsql://your-db-name.turso.io
   TURSO_AUTH_TOKEN=your_auth_token
   ```

2. **Run the migration script:**
   GigLift has a custom migration script configured in `package.json`. Run this command to apply all pending schema changes to the Turso database.
   ```bash
   // turbo
   npm run migrate
   ```

   *(Note: This executes `npx tsx scripts/migrate.ts` behind the scenes).*

3. **Verify:**
   Check the terminal output to ensure the migration completed successfully without SQL errors. If you are deploying these changes to production, ensure this script is run against the production database URL.
