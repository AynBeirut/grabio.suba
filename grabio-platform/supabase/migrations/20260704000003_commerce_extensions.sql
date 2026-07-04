-- Commerce + subscription columns needed by Edge Functions
-- Maps Firebase storeProfiles/{ownerId} fields onto store_profiles by store_id

ALTER TABLE public.store_profiles
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS pro_email TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS whish_channel TEXT,
  ADD COLUMN IF NOT EXISTS whish_secret TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_trial_user BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_legacy_user BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_grace_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_will_delete_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_limit INTEGER,
  ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_operations_limit INTEGER DEFAULT 200,
  ADD COLUMN IF NOT EXISTS operations_used_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operations_usage_month TEXT,
  ADD COLUMN IF NOT EXISTS revenue_share_percentage NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_invoice_number INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS billing_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS add_ons JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS add_ons_meta JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pending_subscription_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_subscription_tier TEXT,
  ADD COLUMN IF NOT EXISTS pending_subscription_billing TEXT,
  ADD COLUMN IF NOT EXISTS pending_subscription_add_ons JSONB,
  ADD COLUMN IF NOT EXISTS pending_subscription_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS last_failed_payment JSONB,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_credits_remaining INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_gateway_settings JSONB DEFAULT '{}';

-- Backfill owner_id + slug from stores
UPDATE public.store_profiles sp
SET
  owner_id = s.owner_id,
  slug = s.slug,
  store_name = COALESCE(sp.store_name, s.name),
  email = COALESCE(sp.email, s.email)
FROM public.stores s
WHERE sp.store_id = s.id AND sp.owner_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_profiles_owner ON public.store_profiles(owner_id);

-- Orders: extra checkout fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_id TEXT,
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS tax_type TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_city TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS delivery_coordinates JSONB,
  ADD COLUMN IF NOT EXISTS external_id BIGINT,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_error TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Products: alias-friendly column for edge functions
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS in_stock BOOLEAN GENERATED ALWAYS AS (
    CASE WHEN track_stock = FALSE THEN TRUE ELSE stock > 0 END
  ) STORED;
