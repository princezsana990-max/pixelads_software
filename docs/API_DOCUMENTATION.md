# OrderFlow Pro — API & Backend Architecture Documentation

## 1. Architectural Overview

OrderFlow Pro utilizes a **Vercel-compatible Serverless REST & Supabase PostgreSQL architecture**:
- **Data Access Layer**: Fully managed via the `@supabase/supabase-js` SDK connecting to a normalized PostgreSQL database.
- **Serverless API Layer**: Located under `/api` for Vercel Serverless Function execution (such as `/api/health`).
- **Security & Validation**: Enforced at the PostgreSQL level via Row Level Security (RLS), constraints, foreign keys, and TypeScript DTOs.
- **Pure Client/Serverless Portability**: Works out of the box in local development, on Vercel preview/production branches, and behind enterprise proxies without requiring a permanent Node daemon.

---

## 2. PostgreSQL Schema & Table Entities

### A. Core Business Tables
1. **`company_settings`**: Enterprise company identity, regional options, and PDF letterhead preferences.
2. **`employees`**: Staff profiles with roles (`Order Taker`, `Editor`, `Manager`), sequential IDs (`EMP-001`), salary, and active state.
3. **`orders`**: Orders with sequential IDs (`ORD-2026-XXXX`), project name, PC workstation, delivery timestamp, status, order taker reference, assigned editor, and completion timestamp.
4. **`order_assignments`**: Full audit history of editor assignments, current assignment flag (`is_current`), assignment notes, and unassignment timestamps.
5. **`order_status_history`**: Audit trail of order status transitions (`Pending`, `In Progress`, `Completed`, `Issue`) with change reason and timestamps.
6. **`mistake_categories`**: Standardized and configurable mistake taxonomy.
7. **`order_mistakes`**: Multi-mistake records per order with category reference, category name, details, and reporter reference.
8. **`payments`**: Employee disbursements, salaries, and bonuses with payment mode (`Cash`, `Bank Transfer`, `Easypaisa`, `JazzCash`, `Other`), reference numbers, and notes.
9. **`invoices`**: Multi-item customer invoices with subtotal, discount, tax, grand total, amount paid, balance due, and status.
10. **`invoice_items`**: Dynamic line items with quantity, unit price, item discount, and total.
11. **`attendance`**: Daily employee presence logs with strict `(employee_id, attendance_date)` uniqueness constraint preventing duplicate counting.
12. **`backup_history`**: Audit catalog of full and modular JSON snapshots.
13. **`audit_logs`**: Immutable audit logs of administrative actions.

---

## 3. Analytics Calculation Engine (`src/lib/analyticsEngine.ts`)

All performance statistics are calculated strictly adhering to the mathematical specifications:

### Order Taker Calculations
- **Avg Orders Per Calendar Day**:
  $$\text{Average Orders Per Calendar Day} = \frac{\text{Total Orders}}{\text{Calendar Days in Date Range}}$$
- **Avg Orders Per Active Working Day**:
  $$\text{Average Orders Per Active Working Day} = \frac{\text{Total Orders}}{\text{Distinct Dates with } \ge 1 \text{ Order}}$$
- **Avg Completed Orders Per Day**:
  $$\text{Average Completed Orders Per Day} = \frac{\text{Completed Orders}}{\text{Calendar Days in Date Range}}$$
- **Completion Rate**:
  $$\text{Completion Rate (\%)} = \frac{\text{Completed Orders}}{\text{Total Orders}} \times 100$$
- **Issue Rate**:
  $$\text{Issue Rate (\%)} = \frac{\text{Issue Orders}}{\text{Total Orders}} \times 100$$
- **Mistakes Per 100 Orders**:
  $$\text{Mistakes Per 100 Orders} = \frac{\text{Total Mistake Incidents}}{\text{Total Orders}} \times 100$$
- **Average Mistakes Per Order**:
  $$\text{Average Mistakes Per Order} = \frac{\text{Total Mistake Incidents}}{\text{Total Orders}}$$

### Editor Workload Calculations
- Calculated using **actual assignment records** (`assigned_editor_id`), not the creator of the order.
- **Turnaround Velocity**: Elapsed hours between order creation and recorded completion.

---

## 4. API Endpoints

### `GET /api/health`
- **Description**: Verifies API operational status, service health, and server uptime.
- **Response**:
```json
{
  "status": "operational",
  "service": "OrderFlow Pro Enterprise API",
  "database": "Supabase PostgreSQL",
  "timestamp": "2026-11-21T10:45:00.000Z",
  "uptime": 124.5
}
```
