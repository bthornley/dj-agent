---
description: Deploying to Production via Vercel
---

# Deploy to Production

GigLift is currently deployed and hosted on Vercel. Vercel is connected to the project's GitHub repository and will automatically trigger a production build whenever new code is pushed to the `main` branch.

To safely deploy changes to production, follow these steps:

1. **Verify your local branch is up to date:**
   Make sure you have pulled the latest changes from the remote repository.
   ```bash
   git pull origin main
   ```

2. **Perform Code Review & Build Check:**
   Review the local changes and ensure the codebase compiles without linting or build errors before pushing.
   ```bash
   git diff
   npm run lint && npm run build
   ```

3. **Commit your local changes:**
   Stage all the files you want to deploy and commit them to the repository with a descriptive message.
   ```bash
   git add .
   git commit -m "feat: description of the changes made"
   ```

4. **Push to GitHub (Triggers Deployment):**
   ```bash
   // turbo
   git push origin main
   ```

5. **Verify Deployment:**
   Vercel will automatically build and deploy the application. This usually takes between 1-3 minutes. 
   - If the build fails, Vercel will email the repository owner, and the production site will remain on the previous successful version.
   - You can review the Vercel logs directly from the Vercel Dashboard if you encounter issues.

**Note on Database Migrations:**
If your deployment includes schema changes to the `Turso/LibSQL` database, you **must** run the migration script locally before or immediately after deploying the code, since Vercel does not automatically migrate the database during its build process.
```bash
npx tsx scripts/migrate.ts
```
