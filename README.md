# OrderFlow Pro
### Advanced Enterprise Order Management & Employee Performance Analytics System

OrderFlow Pro is a production-ready, full-stack enterprise web application designed for digital media agencies, editing studios, and operational teams. It provides end-to-end management of Order Takers, Editors, Managers, client orders, editor assignments, payments, invoices, monthly attendance, quality control mistakes, and advanced performance analytics.

---

## 🌟 Key Capabilities

- **Completely Empty Initial State**: Starts clean with zero mock employees, zero fake orders, and zero fabricated chart statistics. Professional empty states guide the user.
- **Supabase PostgreSQL Only**: Powered exclusively by normalized PostgreSQL tables with strict constraints, foreign keys, and Row Level Security (RLS). No SQLite, MongoDB, or local file databases.
- **Enterprise Setup Screen**: When Supabase credentials are missing or invalid, an in-app setup screen displays missing variables, allows instant connection testing, and provides the SQL migration path.
- **One Global UI Design System**:
  - Unified font: **Inter** across all pages.
  - Fixed typography scale: 12px min labels, 14px table/secondary, 16px body, 20px section titles, 24px page titles, 28-32px dashboard KPIs.
  - Light & Dark theme tokens with subtle enterprise glassmorphism.
  - 100% Lucide React SVG icons.
- **Operations Dashboard**:
  - Top 8 KPI cards: Total Orders, Completed, Pending, In Progress, Issues, Total Mistakes, Total Disbursements, Active Employees.
  - Additional 6 Analytical KPIs: Avg Orders/Calendar Day, Avg Orders/Active Day, Avg Completed/Day, Completion Rate %, Mistakes/100 Orders, Turnaround Velocity.
  - Filterable by: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, Custom Date Range.
  - Dynamic charts: Daily Pipeline Trend, Status Distribution, Top Performing Employees, Employees Requiring Improvement, Top 5 Mistakes.
- **Employee Management**:
  - Roles: `Order Taker`, `Editor`, `Manager`.
  - Sequential EMP IDs (`EMP-001`, `EMP-002`, etc.).
  - Activation/deactivation with record retention.
  - Role-filtered dropdowns (active staff only).
- **Work Management & Bulk Import**:
  - Add Order with auto-populated timestamp (Asia/Karachi display timezone), project name, PC number, deadline, multiple mistake records, editor assignment, and notes.
  - All Orders table with server-side pagination, search, status change modal (with audit trail), and editor reassignment modal (with audit log).
  - Bulk Import supporting CSV & XLSX, download of blank Excel template, row-by-row validation, and duplicate detection.
- **Finance (Payments & Invoices)**:
  - Employee disbursement management with cash/bank/easypaisa/jazzcash modes, audit logs, and Excel export.
  - Professional Multi-Item Invoice Generator: A4 PDF export with company branding, unlimited line items, subtotal, discount, tax, balance due, terms, and signature/stamp boxes.
  - Stored in Supabase with full invoice history.
- **Attendance Management**:
  - Daily Attendance with ON/OFF controls.
  - Monthly Attendance Calendar per employee (1–31 days) with idempotent toggling.
  - Individual and combined monthly attendance PDF generator and Excel exporter.
- **Advanced Performance Analytics Engine**:
  - Order Taker Average (Calendar Day Avg vs Active Day Avg, Completion %, Mistakes/100, Editor breakdowns).
  - Editor Average (Workload from actual assignments, turnaround velocity, Order Taker breakdowns).
  - Top 5 & Top 10 Mistake Categories, recurring patterns, and root causes.
  - 10 Dedicated Reports with interactive navigation.
- **Global Settings & Disaster Recovery**:
  - Organization profile, PDF branding, theme, and timezone (`Asia/Karachi`).
  - Full system JSON backup export and validated JSON restore with explicit `"CONFIRM RESTORE"` confirmation.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, TanStack Query, React Router, Recharts, jsPDF, jspdf-autotable, SheetJS (xlsx), PapaParse, date-fns.
- **Backend / API**: Vercel Serverless Function architecture (`/api`) + `@supabase/supabase-js`.
- **Database**: Supabase PostgreSQL.
- **Deployment**: Vercel.

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/orderflow-pro.git
cd orderflow-pro
pnpm install
```

### 2. Configure Supabase PostgreSQL
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the migration script:
   `supabase/migrations/20260221000000_orderflow_init.sql`
3. Copy your **Project URL** and **Anon Public Key**.
4. Create a `.env` file from `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```
*(Alternatively, simply launch the app and paste the credentials on the Setup Required screen).*

### 3. Run Locally
```bash
npm run dev
# or
pnpm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
# or
pnpm run build
```

---

## 📖 Documentation Index

- [Design System Guide](docs/DESIGN_SYSTEM.md)
- [Database Configuration & Schema](docs/DATABASE_CONFIGURATION.md)
- [API Architecture](docs/API_DOCUMENTATION.md)
- [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md)
- [Backup & Disaster Recovery Protocol](docs/BACKUP_AND_RECOVERY.md)
- [QA & Acceptance Test Report](docs/QA_TEST_REPORT.md)

---

## 📄 License
Enterprise Proprietary — Developed for Pixelads / OrderFlow Pro. All rights reserved.
