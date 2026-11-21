-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    logo_url TEXT,
    address TEXT,
    contact_number TEXT,
    email TEXT,
    website TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
    currency TEXT NOT NULL DEFAULT 'PKR',
    date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format TEXT NOT NULL DEFAULT '12h',
    theme TEXT NOT NULL DEFAULT 'light',
    pdf_header_text TEXT,
    pdf_footer_text TEXT,
    pdf_logo_position TEXT NOT NULL DEFAULT 'left',
    signature_url TEXT,
    stamp_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Order Taker', 'Editor', 'Manager')),
    contact_number TEXT,
    email TEXT,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    monthly_salary NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);

-- 3. MISTAKE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS mistake_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed standard categories if table is completely empty
INSERT INTO mistake_categories (name, description)
VALUES 
    ('Editing Mistake', 'Errors in cuts, transitions, pacing or layout'),
    ('Spelling Mistake', 'Typographical errors in titles, captions, or text'),
    ('Wording Mistake', 'Grammatical errors or awkward phrasing'),
    ('Thumbnail Mistake', 'Incorrect graphics, sizing, or thumbnail assets'),
    ('Voiceover Mistake', 'Audio desync, missing lines, or mispronounced audio'),
    ('Incorrect Data', 'Wrong numerical data, statistics, or specifications'),
    ('Incomplete Data', 'Missing information or incomplete required sections'),
    ('Customer Requirement Mistake', 'Failure to comply with client brief or guidelines'),
    ('Other', 'Uncategorized or miscellaneous mistakes')
ON CONFLICT (name) DO NOTHING;

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    order_taker_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    project_name TEXT NOT NULL,
    pc_number TEXT NOT NULL,
    delivery_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Issue')),
    assigned_editor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_order_taker ON orders(order_taker_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_editor ON orders(assigned_editor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- 5. ORDER ASSIGNMENTS (History of editor assignments)
CREATE TABLE IF NOT EXISTS order_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    editor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ,
    is_current BOOLEAN NOT NULL DEFAULT true,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_assignments_order ON order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_editor ON order_assignments(editor_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_current ON order_assignments(is_current);

-- 6. ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- 7. ORDER MISTAKES
CREATE TABLE IF NOT EXISTS order_mistakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    category_id UUID REFERENCES mistake_categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    details TEXT NOT NULL,
    reported_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_mistakes_order ON order_mistakes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_mistakes_category ON order_mistakes(category_name);
CREATE INDEX IF NOT EXISTS idx_order_mistakes_created ON order_mistakes(created_at);

-- 8. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other')),
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 9. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_contact TEXT,
    currency TEXT NOT NULL DEFAULT 'PKR',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 10. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 11. ATTENDANCE TABLE
-- Strict unique constraint on employee_id + attendance_date
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_employee_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- 12. BACKUP HISTORY TABLE
CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL,
    record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows internal business system operations via anon / authenticated key
-- ==============================================================================
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public/authenticated read and write for the enterprise app
CREATE POLICY "Enable all for company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for mistake_categories" ON mistake_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for order_assignments" ON order_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for order_status_history" ON order_status_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for order_mistakes" ON order_mistakes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for backup_history" ON backup_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
