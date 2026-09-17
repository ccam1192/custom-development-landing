-- Boardroom CRM Schema
-- Additive migration — does NOT drop or reset any existing tables.

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE crm_user_type AS ENUM ('agency', 'agency_client', 'standard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_billing_channel AS ENUM ('stripe', 'shopify', 'other', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_source AS ENUM ('stripe', 'shopify', 'agency', 'appsumo', 'custom', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_client_status AS ENUM ('prospect', 'in_trial', 'active_customer', 'canceled', 'agency_client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_sync_provider AS ENUM ('boardroom', 'stripe', 'shopify', 'spreadsheet');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_transaction_provider AS ENUM ('stripe', 'shopify', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_transaction_status AS ENUM ('succeeded', 'failed', 'pending', 'refunded', 'adjusted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_transaction_type AS ENUM (
    'payment', 'refund', 'credit', 'adjustment',
    'app_usage_sale', 'app_sale_adjustment', 'app_sale_credit'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_sync_status AS ENUM ('running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_data_issue_severity AS ENUM ('warning', 'error', 'info');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── PRIMARY CUSTOMERS TABLE ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_customers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boardroom_user_id       text UNIQUE,
  name                    text,
  email                   text,
  store_url               text,
  signup_date             timestamptz,
  user_type               crm_user_type DEFAULT 'standard',
  billing_channel         crm_billing_channel DEFAULT 'none',
  client_status           crm_client_status DEFAULT 'prospect',
  cancellation_date       timestamptz,
  -- MRR: calculated vs override
  calculated_mrr          numeric(12,2) DEFAULT 0,
  mrr_override            numeric(12,2),
  -- Total Revenue: calculated vs override
  calculated_total_revenue numeric(14,2) DEFAULT 0,
  total_revenue_override  numeric(14,2),
  source                  crm_source,
  notes                   text,
  -- External identifiers
  stripe_customer_id      text,
  stripe_subscription_id  text,
  shopify_shop_id         text,
  shopify_shop_domain     text,
  -- Boardroom details
  boardroom_subscription_id text,
  boardroom_subscription_status text,
  agency_parent_id        text,
  -- Stripe details
  stripe_subscription_status text,
  stripe_trial_end        timestamptz,
  stripe_current_period_end timestamptz,
  stripe_plan_amount      numeric(12,2),
  stripe_cancel_at        timestamptz,
  stripe_canceled_at      timestamptz,
  -- MailerLite (future)
  mailerlite_subscriber_id text,
  mailerlite_group        text,
  mailerlite_sequence_status text,
  mailerlite_last_synced  timestamptz,
  -- Metadata
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  updated_by              text,
  last_synced_at          timestamptz
);

-- ─── REVENUE TRANSACTIONS LEDGER ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_revenue_transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_customer_id           uuid REFERENCES crm_customers(id) ON DELETE SET NULL,
  provider                  crm_transaction_provider NOT NULL,
  provider_transaction_id   text NOT NULL,
  provider_customer_id      text,
  provider_subscription_id  text,
  amount                    numeric(14,2) NOT NULL,
  currency                  text DEFAULT 'USD',
  transaction_date          timestamptz NOT NULL,
  status                    crm_transaction_status DEFAULT 'succeeded',
  transaction_type          crm_transaction_type NOT NULL,
  -- Shopify-specific fields
  shopify_charge_id         text,
  shopify_shop_domain       text,
  shopify_gross_amount      numeric(14,2),
  shopify_net_amount        numeric(14,2),
  shopify_fee               numeric(14,2),
  shopify_processing_fee    numeric(14,2),
  shopify_regulatory_fee    numeric(14,2),
  -- General metadata
  description               text,
  metadata                  jsonb DEFAULT '{}',
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  UNIQUE(provider, provider_transaction_id)
);

-- ─── SYNC LOGS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          crm_sync_provider NOT NULL,
  sync_type         text DEFAULT 'full',
  started_at        timestamptz DEFAULT now(),
  completed_at      timestamptz,
  status            crm_sync_status DEFAULT 'running',
  records_processed integer DEFAULT 0,
  records_created   integer DEFAULT 0,
  records_updated   integer DEFAULT 0,
  records_skipped   integer DEFAULT 0,
  errors            integer DEFAULT 0,
  error_details     jsonb DEFAULT '[]',
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);

-- ─── DATA HEALTH ISSUES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_data_health_issues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type      text NOT NULL,
  severity        crm_data_issue_severity DEFAULT 'warning',
  description     text NOT NULL,
  crm_customer_id uuid REFERENCES crm_customers(id) ON DELETE CASCADE,
  details         jsonb DEFAULT '{}',
  resolved        boolean DEFAULT false,
  resolved_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── SYNC STATE (tracks last sync cursors) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_sync_state (
  provider          crm_sync_provider PRIMARY KEY,
  last_sync_at      timestamptz,
  last_successful_at timestamptz,
  sync_cursor       text,
  status            text DEFAULT 'idle',
  error_message     text,
  updated_at        timestamptz DEFAULT now()
);

INSERT INTO crm_sync_state (provider) VALUES ('boardroom'), ('stripe'), ('shopify'), ('spreadsheet')
ON CONFLICT (provider) DO NOTHING;

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_crm_customers_email ON crm_customers(email);
CREATE INDEX IF NOT EXISTS idx_crm_customers_boardroom_user_id ON crm_customers(boardroom_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_stripe_customer_id ON crm_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_stripe_subscription_id ON crm_customers(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_shopify_shop_id ON crm_customers(shopify_shop_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_shopify_shop_domain ON crm_customers(shopify_shop_domain);
CREATE INDEX IF NOT EXISTS idx_crm_customers_client_status ON crm_customers(client_status);
CREATE INDEX IF NOT EXISTS idx_crm_customers_billing_channel ON crm_customers(billing_channel);
CREATE INDEX IF NOT EXISTS idx_crm_customers_signup_date ON crm_customers(signup_date);
CREATE INDEX IF NOT EXISTS idx_crm_customers_cancellation_date ON crm_customers(cancellation_date);
CREATE INDEX IF NOT EXISTS idx_crm_customers_user_type ON crm_customers(user_type);
CREATE INDEX IF NOT EXISTS idx_crm_customers_source ON crm_customers(source);

CREATE INDEX IF NOT EXISTS idx_crm_transactions_customer ON crm_revenue_transactions(crm_customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_transactions_provider ON crm_revenue_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_crm_transactions_date ON crm_revenue_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_crm_transactions_provider_tx ON crm_revenue_transactions(provider, provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_provider ON crm_sync_logs(provider);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_started ON crm_sync_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_data_health_resolved ON crm_data_health_issues(resolved);
CREATE INDEX IF NOT EXISTS idx_crm_data_health_customer ON crm_data_health_issues(crm_customer_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_crm_customers_updated
    BEFORE UPDATE ON crm_customers
    FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_crm_transactions_updated
    BEFORE UPDATE ON crm_revenue_transactions
    FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_crm_data_health_updated
    BEFORE UPDATE ON crm_data_health_issues
    FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

ALTER TABLE crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_data_health_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_state ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write all CRM data (internal admin tool)
DO $$ BEGIN
  CREATE POLICY crm_customers_auth_all ON crm_customers
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY crm_transactions_auth_all ON crm_revenue_transactions
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY crm_sync_logs_auth_all ON crm_sync_logs
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY crm_data_health_auth_all ON crm_data_health_issues
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY crm_sync_state_auth_all ON crm_sync_state
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
