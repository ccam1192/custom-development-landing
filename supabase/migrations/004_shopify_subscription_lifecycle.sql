-- Shopify subscription lifecycle fields (Partner API managed pricing)
-- Additive: does not replace Stripe columns or existing shopify_shop_id/domain.

ALTER TABLE crm_customers
  ADD COLUMN IF NOT EXISTS shopify_subscription_id text,
  ADD COLUMN IF NOT EXISTS shopify_subscription_status text,
  ADD COLUMN IF NOT EXISTS shopify_subscription_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_cancel_effective_on timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_billing_interval text,
  ADD COLUMN IF NOT EXISTS shopify_subscription_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS shopify_cancel_at_end_of_cycle boolean,
  ADD COLUMN IF NOT EXISTS shopify_pending_update jsonb,
  ADD COLUMN IF NOT EXISTS shopify_last_status_sync_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_customers_shopify_shop_id_uid
  ON crm_customers (shopify_shop_id)
  WHERE shopify_shop_id IS NOT NULL AND shopify_shop_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_customers_shopify_subscription_id_uid
  ON crm_customers (shopify_subscription_id)
  WHERE shopify_subscription_id IS NOT NULL AND shopify_subscription_id <> '';

ALTER TABLE crm_revenue_transactions
  ADD COLUMN IF NOT EXISTS shopify_shop_id text;

CREATE INDEX IF NOT EXISTS idx_crm_revenue_txn_shopify_shop_id
  ON crm_revenue_transactions (shopify_shop_id);

CREATE TABLE IF NOT EXISTS crm_shopify_subscription_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_event_id      text UNIQUE NOT NULL,
  crm_customer_id       uuid REFERENCES crm_customers(id) ON DELETE SET NULL,
  shopify_shop_id       text,
  shopify_shop_domain   text,
  event_type            text NOT NULL,
  state                 text,
  occurred_at           timestamptz NOT NULL,
  cancel_effective_on   timestamptz,
  plan_handle           text,
  billing_period        text,
  details               jsonb DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_shopify_events_shop
  ON crm_shopify_subscription_events (shopify_shop_id);

CREATE INDEX IF NOT EXISTS idx_crm_shopify_events_customer
  ON crm_shopify_subscription_events (crm_customer_id);

DO $$ BEGIN
  ALTER TYPE crm_transaction_type ADD VALUE IF NOT EXISTS 'app_subscription_sale';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE crm_shopify_subscription_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY crm_shopify_events_auth_all ON crm_shopify_subscription_events
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
