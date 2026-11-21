# OrderFlow Pro — Backup & Recovery Protocol

## 1. Overview
OrderFlow Pro features a built-in enterprise disaster recovery module located at `/settings/backup`.
It provides:
- One-click full system JSON backups.
- Modular table-level exports (Orders, Employees, Payments, Attendance, Invoices).
- Schema-validated restoration with safety confirmations to prevent accidental overwrites.

---

## 2. Generating Backups

### Generating a Full Backup
1. In the sidebar, navigate to **System** → **Backup & Restore**.
2. Under **Create New Data Export**, click **Export Complete Database**.
3. A JSON file named `OrderFlow_Backup_FULL_YYYY-MM-DD_HHmm.json` will download.
4. The transaction is cataloged in the **Recent Backup Exports** audit table with record counts and file size.

### Modular Backups
- **Orders Only**: Exports orders, editor assignments, status history, and mistakes.
- **Employees Only**: Exports staff profiles and roles.
- **Payments Only**: Exports all financial disbursements.
- **Attendance Only**: Exports all daily attendance records.
- **Invoices Only**: Exports all client invoices and line items.

---

## 3. Data Restoration Protocol

Restoration executes **idempotent upserts** into Supabase PostgreSQL following foreign-key dependency order:
`employees` → `mistake_categories` → `orders` → `order_assignments` → `order_status_history` → `order_mistakes` → `payments` → `invoices` → `invoice_items` → `attendance` → `company_settings`.

### Restoration Steps
1. Navigate to **Backup & Restore**.
2. Drag and drop or browse for an authorized OrderFlow Pro backup JSON file.
3. The system parses the JSON, verifies the metadata signature (`app: "OrderFlow Pro"`), and counts records per table.
4. Click **Proceed to Restore Confirmation**.
5. Type **`CONFIRM RESTORE`** into the modal prompt.
6. Click **Execute Restore**.
7. The system synchronizes the database and logs the restoration event in `audit_logs`.
