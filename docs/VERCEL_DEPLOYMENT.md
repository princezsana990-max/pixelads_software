# OrderFlow Pro — Vercel Deployment Instructions

## 1. Overview
OrderFlow Pro is engineered specifically for Vercel deployment:
- **Build Output**: Static assets compiled to `dist/`.
- **SPA Routing**: Handled seamlessly by `vercel.json` rewrites.
- **Serverless API**: Handled in `/api` functions.
- **Database**: External Supabase PostgreSQL.

---

## 2. Deployment Steps

### Method 1: Deploy with Vercel CLI
1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```
2. In the project root, run:
   ```bash
   vercel
   ```
3. Follow the CLI prompts to link or create a project.
4. Set Environment Variables when prompted or run:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
5. Deploy to production:
   ```bash
   vercel --prod
   ```

### Method 2: Deploy via GitHub & Vercel Dashboard
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: OrderFlow Pro enterprise release"
   git remote add origin https://github.com/your-org/orderflow-pro.git
   git push -u origin main
   ```
2. Go to [https://vercel.com/new](https://vercel.com/new).
3. Import the `orderflow-pro` repository.
4. Framework Preset: **Vite**.
5. Root Directory: `./`.
6. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key.
7. Click **Deploy**.

---

## 3. Post-Deployment Verification Checklist
- [ ] Visit the production Vercel URL.
- [ ] Verify that direct links and page refreshes work without 404s (e.g. `/analytics/averages`).
- [ ] Verify that unknown routes (e.g. `/unknown-path`) render the branded 404 page with the "Go to Dashboard" button.
- [ ] Verify that the database connection pill displays **PostgreSQL Active**.
