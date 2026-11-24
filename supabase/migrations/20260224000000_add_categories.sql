-- ==============================================================================
-- OrderFlow Pro: Add Categories to Orders and Payments
-- ==============================================================================

-- 1. Add category column to orders table if not exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category);

-- 2. Add category column to payments table if not exists
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Salary';

CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);
