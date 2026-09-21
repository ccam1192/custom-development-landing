-- Operational flag: a Shopify usage charge was applied/created.
-- Independent of payment collection. Default No. Never infer from revenue.

ALTER TABLE crm_customers
  ADD COLUMN IF NOT EXISTS usage_charge_applied boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_crm_customers_usage_charge_applied
  ON crm_customers (usage_charge_applied);
