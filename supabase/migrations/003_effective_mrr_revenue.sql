-- Add computed columns that combine override and calculated values.
-- These are STORED generated columns — automatically updated on every INSERT/UPDATE.
-- Enables correct sorting, filtering, and indexing.

ALTER TABLE crm_customers
  ADD COLUMN IF NOT EXISTS effective_mrr numeric
  GENERATED ALWAYS AS (COALESCE(mrr_override, calculated_mrr, 0)) STORED;

ALTER TABLE crm_customers
  ADD COLUMN IF NOT EXISTS effective_total_revenue numeric
  GENERATED ALWAYS AS (COALESCE(total_revenue_override, calculated_total_revenue, 0)) STORED;

-- Index for fast sorting / filtering on these columns
CREATE INDEX IF NOT EXISTS idx_crm_customers_effective_mrr ON crm_customers (effective_mrr);
CREATE INDEX IF NOT EXISTS idx_crm_customers_effective_revenue ON crm_customers (effective_total_revenue);
