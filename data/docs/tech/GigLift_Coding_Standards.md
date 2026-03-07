# GigLift Coding Standards
All new code MUST adhere to these standards before merging to main.

## 1. API Route Design
- Every route must be safe, validated, and paginated by default.
- Always validate request body with Zod or type guards.
- Use `pickFields()` for mass-assignment protection.
- Validate URL params before database queries.
- Return consistent `{ data, error }` shape.
- Always include status codes (200, 201, 400, 404, 500).
- Use `safeErrorResponse()` — never expose internal errors or stack traces to the client.
- Include pagination metadata on list endpoints: `{ data: T[], total, limit, offset, hasMore }`.

## 2. Database Queries
- Pagination is MANDATORY — unbounded queries are the #1 scaling killer.
- Every list query MUST accept `PaginationOptions { limit, offset }`.
- Default page size: 200, max: 1,000 — enforced by `clampPageSize()`.
- Always use parameterized queries — NEVER string concatenation.
- Use `escapeLikeQuery()` for LIKE/search patterns and add `ESCAPE '\\'` to every LIKE query.
- Use `user_id` in every WHERE clause (tenant isolation).
- Prevent N+1 queries: Use `Promise.all()` for independent queries. Never query inside loops.

## 3. React Components & Reusability
- Default to React Server Components (no `'use client'`).
- Only add `'use client'` when you need state, effects, or browser APIs.
- Prioritize Reusability across modes/pages. Extract shared UI into `src/components/`.
- Pass data via props. Make components props-driven & state-agnostic.
- Each component = one file, one concern. Max size ~300 lines.
- Naming: Components use PascalCase, Hooks use camelCase.
- Avoid inline object/array literals in JSX props to prevent unnecessary re-renders.

## 4. State & Data Fetching
- Use `fetchWithRetry()` from `api-client.ts` for ALL API calls.
- Set timeouts on every fetch (default: 15s, AI: 30s).
- Use `Promise.all()` to parallelize independent fetches on page load and prevent waterfalls.
- Show skeleton/loading states during fetches — never block the UI.

## 5. Security & OWASP Top 10
- All API routes MUST verify Clerk auth via `auth()` or `currentUser()`. Extract `userId` from auth, never from the request body.
- Admin routes must check `role === 'admin'` explicitly on the server.
- Block SSRF: Use `validateExternalUrl()` on ALL user-supplied URLs to block private IPs, localhost, and metadata endpoints.
- All secrets MUST live in `.env.local` and never be prefixed with `NEXT_PUBLIC_` unless intentionally public.
- Stripe webhooks must be verified via `constructEvent()` with the signing secret.

## 6. TypeScript & Design Patterns
- Enable `strict: true` in tsconfig. No `'any'` or `@ts-ignore` allowed.
- Export interfaces from `types.ts` for shared models.
- Design for Reuse: Write code expecting it to be reused later. Separate business logic from UI. Avoid hardcoding page-specific titles/states. 
- Use Generic Types for flexible functions.

## 7. Error Handling
- Wrap every API route's main logic in a `try/catch`.
- Wrap page-level components in an `<ErrorBoundary>`.
- Fail gracefully: If AI fails, fallback to a manual form. If an external API fails, show a warning toast. Never show a blank page.
