-- Forward-looking last collected payment timestamp.
-- Intentionally nullable; do not backfill from historical revenue.

ALTER TABLE crm_customers
  ADD COLUMN IF NOT EXISTS last_payment timestamptz;

CREATE INDEX IF NOT EXISTS idx_crm_customers_last_payment
  ON crm_customers (last_payment);
