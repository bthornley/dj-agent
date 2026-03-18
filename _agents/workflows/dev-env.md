---
description: Running the Local Development Server
---

# Local Development

To run the GigLift application locally for testing and development, follow these steps to spin up the Next.js development server.

1. **Install Dependencies:**
   If you have recently pulled new code or added new packages, ensure your node modules are up to date.
   ```bash
   npm install
   ```

2. **Check Environment Variables:**
   Ensure you have a `.env.local` file in the root of the project (`dj-agent/`). Since GigLift uses Clerk for authentication, Turso for the database, and Resend/Stripe for other services, the app will crash or malfunction if these keys are missing.
   
   *Required Keys:*
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

4. **Access the Application:**
   Open your browser and navigate to `http://localhost:3000`. Hot-reloading is enabled, so changes to your React components will automatically reflect in the browser.
