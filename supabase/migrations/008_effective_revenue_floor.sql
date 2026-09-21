-- Spreadsheet revenue is a snapshot floor, not a frozen cap.
-- Displayed / sortable revenue is the greater of override and live calculated.

ALTER TABLE crm_customers DROP COLUMN IF EXISTS effective_total_revenue;

ALTER TABLE crm_customers
  ADD COLUMN effective_total_revenue numeric
  GENERATED ALWAYS AS (
    GREATEST(COALESCE(total_revenue_override, 0), COALESCE(calculated_total_revenue, 0))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_crm_customers_effective_revenue
  ON crm_customers (effective_total_revenue);
