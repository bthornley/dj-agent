---
description: Sending Mass Outbound Email Campaigns
---

# Sending Outbound Email Campaigns

GigLift uses **Resend** to send transactional emails, system updates, and outbound marketing campaigns. Follow this workflow to orchestrate a mass delivery securely.

## Instructions:

1. **Verify Resend Configuration:**
   Campaigns require the `RESEND_API_KEY` to be set. Ensure the email service module `src/lib/email.ts` is accessible and properly configured.

2. **Write the Template:**
   Add a new function to `src/lib/email.ts` specific to your campaign. Utilize the existing GigLift HTML email wrapper to ensure branding consistency (dark theme, purple accents, GigLift logo).

3. **Query the Audience:**
   You will need to pull the list of target users. You can fetch user lists directly from Clerk using the backend client SDK (`clerkClient().users.getUserList()`), or query the LibSQL database if you need to filter users by GigLift-specific metrics (e.g., "Users with 0 leads").

4. **Implement Batching:**
   Resend enforces rate limits. When emailing a large user base:
   - Do **NOT** send emails synchronously in a single loop without a timeout.
   - Batch requests in small chunks (e.g., 50 at a time).
   - Alternatively, utilize Resend's Batch API to send up to 100 emails in a single HTTP request for faster delivery.

5. **Log Success and Failures:**
   Use robust `try/catch` blocks around the sending logic to ensure that if one email fails to send, the entire loop doesn't crash. Log successful deliveries or errors to the console or database for auditability.
