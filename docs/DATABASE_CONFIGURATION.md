# OrderFlow Pro — Database Configuration Guide

## 1. Prerequisites

- A **Supabase** account ([https://supabase.com](https://supabase.com)).
- PostgreSQL 14+ (provided standard by Supabase).
- No local database, SQLite, or MongoDB dependencies exist or are permitted.

---

## 2. Step-by-Step Supabase Setup

### Step 1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Set your project name (e.g., `orderflow-pro`).
4. Generate a secure database password and choose your nearest data center region.

### Step 2: Run Database Schema Migration
1. In the Supabase project dashboard, navigate to the **SQL Editor** tab on the left sidebar.
2. Click **New Query**.
3. Open or copy the full SQL script from:
   `supabase/migrations/20260221000000_orderflow_init.sql`
4. Paste the SQL script into the query editor and click **Run**.
5. Verify that all 13 tables are created:
   - `company_settings`
   - `employees`
   - `mistake_categories`
   - `orders`
   - `order_assignments`
   - `order_status_history`
   - `order_mistakes`
   - `payments`
   - `invoices`
   - `invoice_items`
   - `attendance`
   - `backup_history`
   - `audit_logs`

### Step 3: Obtain Credentials
1. In Supabase, go to **Project Settings** → **API**.
2. Copy the **Project URL** (format: `https://[project-ref].supabase.co`).
3. Copy the **anon public key** (`eyJhbGciOi...`).

### Step 4: Configure OrderFlow Pro
You can supply these credentials in one of two ways:
- **Option A (Environment File)**:
  Create a `.env` file in the project root:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-actual-anon-key
  ```
- **Option B (In-App Setup Screen)**:
  Launch OrderFlow Pro (`npm run dev`). When credentials are not yet set, the app will automatically present the **Enterprise Setup Required** screen where you can paste the URL and key, test the live connection with one click, and proceed into the live dashboard.

---

## 3. Empty Database Verification Rule
As required by the non-negotiable enterprise specification:
- The initial database starts **completely empty** (no demo orders, no mock staff, no dummy payments).
- OrderFlow Pro displays zero counts and professional empty states until real operational records are created or imported.
