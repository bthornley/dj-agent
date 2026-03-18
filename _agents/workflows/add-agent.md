---
description: Creating a New AI Agent
---

# Creating a New AI Agent

GigLift relies heavily on specialized AI agents to generate content, analyze leads, and build tools for users. Follow this workflow when adding a new agent to the system.

## Instructions:

1. **Create the API Route:**
   New agents must be exposed via a dedicated API route inside the `src/app/api/agents/` directory (e.g., `src/app/api/agents/booking/route.ts`).

2. **Use the OpenAI Client:**
   GigLift expects all agents to utilize the official OpenAI Node SDK. Instantiate the client using the existing `process.env.OPENAI_API_KEY`.
   ```typescript
   import OpenAI from 'openai';
   const openai = new OpenAI();
   ```

3. **Implement Rate Limiting & Auth:**
   All agent routes must be protected. You **must** verify the user's session using Clerk's `auth()` helper, and you **must** implement rate-limiting via `src/lib/rate-limit.ts` to prevent API abuse and excessive OpenAI costs.

4. **Add to Agent Registry (If Applicable):**
   If the agent is tracked centrally, ensure it is added to the UI dashboard where users select their active agents or view agent activity stats.

5. **Error Handling:**
   Return consistent JSON error responses. Do not leak raw OpenAI error messages to the client frontend.

6. **Long-Running Agents:**
   If the agent requires more than 10 seconds to respond, verify that the Vercel function timeout is configured (e.g., `export const maxDuration = 60;`) at the top of the route file.
