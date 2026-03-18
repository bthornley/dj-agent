---
description: Run an AI Code Audit
---

# Code Review Audit

Run this workflow whenever a significant chunk of work or a new feature has been completed, before committing changes to the `main` branch. This ensures the codebase strictly adheres to the established standards.

## Instructions for the AI Agent:

1. **Review Standards:**
   Silently read `data/docs/tech/GigLift_Coding_Standards.md` using the `view_file` tool to load the most up-to-date rules into your context window.

2. **Identify Uncommitted Changes:**
   Execute a `git status` or `git diff` command to see exactly what files have been modified or added in the current working directory.

3. **Audit the Changes:**
   Review the contents of the modified files against the rules defined in `GigLift_Coding_Standards.md`. Pay special attention to:
   - TypeScript strictness (Are there any `any` types or `@ts-ignore` flags?)
   - API Validation (Are requests validated with Zod? Are errors handled safely?)
   - Database queries (Is pagination enforced? Is `user_id` used for tenant isolation?)
   - React architecture (Are Server Components prioritized over Client Components?)

4. **Remediate:**
   If you find any code that violates these standards, use your `replace_file_content` or `multi_replace_file_content` tools to fix the code directly.

5. **Report to User:**
   Once the audit and fixes are complete, use the `notify_user` tool to summarize what violations were found and what fixes were automatically applied. If no violations were found, report a clean bill of health.
