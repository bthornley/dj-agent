---
description: Syncing Stripe Configuration
---

# Syncing Stripe Configuration

GigLift uses Stripe to manage user subscriptions and payments. When making changes to pricing, adding new subscription tiers, or adjusting features, both Stripe and the GigLift codebase must be updated in tandem to prevent discrepancies.

## Instructions:

1. **Update `src/lib/stripe.ts`:**
   Locate the `PlanId` type and the `PLANS` constant dictionary. Any new tier must be registered here with its corresponding exact Stripe `priceId`.

2. **Update the Pricing Page UI:**
   Navigate to `src/app/pricing/page.tsx`. Ensure the new or modified plan is accurately reflected in the UI features list and pricing matrix.

3. **Verify Checkout Route:**
   Ensure the `POST /api/checkout` route handles the new plan ID correctly, especially if the plan involves special subscription data overrides (e.g., free trials).

4. **Verify Clerk Metadata Updates:**
   The Stripe webhook handler (`src/app/api/webhooks/stripe/route.ts`) is responsible for automatically syncing a user's subscription status and `planId` to their Clerk `publicMetadata`. Verify that any new plan ID strings conform to the metadata schema expected by the application.

## Testing:
When deploying changes to Stripe logic, always use Stripe Test Mode keys in your local `.env.local` to verify the checkout flow and webhook delivery before pushing to production.
