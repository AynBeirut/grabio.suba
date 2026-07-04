-- ============================================================
-- Grabio Platform — Supabase Core Schema (Phase 1)
-- Migration: 20260704000001_core_schema
-- Replaces: Firebase Firestore collections
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,          -- Cloudflare R2 URL
  phone           TEXT,
  role            TEXT DEFAULT 'merchant',  -- merchant | admin | crm_rep
  plan            TEXT DEFAULT 'free',      -- free | starter | pro | enterprise
  plan_expires_at TIMESTAMPTZ,
  trial_ends_at   TIMESTAMPTZ,
  firebase_uid    TEXT,          -- keep during migration for lookup
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own" ON public.users
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "admin_all_users" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  logo_url        TEXT,          -- Cloudflare R2 URL
  cover_url       TEXT,          -- Cloudflare R2 URL
  category        TEXT,
  subcategory     TEXT,
  phone           TEXT,
  whatsapp        TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'LB',
  currency        TEXT DEFAULT 'LBP',
  status          TEXT DEFAULT 'active',  -- active | suspended | demo
  plan            TEXT DEFAULT 'free',
  firebase_id     TEXT,          -- original Firestore doc ID
  settings        JSONB DEFAULT '{}',    -- theme, delivery, etc.
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_owner_all" ON public.stores
  FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "store_public_read" ON public.stores
  FOR SELECT USING (status = 'active');

CREATE INDEX idx_stores_owner ON public.stores(owner_id);
CREATE INDEX idx_stores_slug ON public.stores(slug);

-- ============================================================
-- STORE PROFILES (merged from storeProfiles collection)
-- Stored as JSONB extension to stores for full builder config
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_profiles (
  store_id        UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  theme           JSONB DEFAULT '{}',     -- colors, fonts, layout
  sections        JSONB DEFAULT '[]',     -- section order + settings
  hero            JSONB DEFAULT '{}',
  about           JSONB DEFAULT '{}',
  contact         JSONB DEFAULT '{}',
  delivery        JSONB DEFAULT '{}',
  gallery         JSONB DEFAULT '[]',
  seo             JSONB DEFAULT '{}',
  custom_domain   TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_owner" ON public.store_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );
CREATE POLICY "profile_public_read" ON public.store_profiles
  FOR SELECT USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  price           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  compare_price   NUMERIC(12, 2),
  cost_price      NUMERIC(12, 2),
  sku             TEXT,
  barcode         TEXT,
  category        TEXT,
  subcategory     TEXT,
  image_url       TEXT,          -- Cloudflare R2 primary image
  images          JSONB DEFAULT '[]',    -- array of R2 URLs
  stock           INTEGER DEFAULT 0,
  track_stock     BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'active', -- active | draft | archived
  tags            TEXT[],
  attributes      JSONB DEFAULT '{}',    -- size, color, etc.
  firebase_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_owner_all" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );
CREATE POLICY "product_public_read" ON public.products
  FOR SELECT USING (status = 'active');

CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_products_status ON public.products(status);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL,
  customer_name   TEXT,
  customer_phone  TEXT,
  customer_email  TEXT,
  customer_address TEXT,
  items           JSONB NOT NULL DEFAULT '[]',  -- [{product_id, name, qty, price}]
  subtotal        NUMERIC(12, 2) DEFAULT 0,
  delivery_fee    NUMERIC(12, 2) DEFAULT 0,
  discount        NUMERIC(12, 2) DEFAULT 0,
  total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency        TEXT DEFAULT 'LBP',
  status          TEXT DEFAULT 'pending',  -- pending | confirmed | preparing | delivered | cancelled
  payment_method  TEXT,
  payment_status  TEXT DEFAULT 'unpaid',
  notes           TEXT,
  source          TEXT DEFAULT 'web',      -- web | whatsapp | pos | api
  firebase_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_store_owner" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE INDEX idx_orders_store ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

-- ============================================================
-- CUSTOMERS (per-store CRM)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  notes           TEXT,
  tags            TEXT[],
  total_orders    INTEGER DEFAULT 0,
  total_spent     NUMERIC(12, 2) DEFAULT 0,
  firebase_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_store_owner" ON public.customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

CREATE INDEX idx_customers_store ON public.customers(store_id);

-- ============================================================
-- BUILDERS (store builder/theme snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  version         INTEGER DEFAULT 1,
  config          JSONB NOT NULL DEFAULT '{}',  -- full builder state
  published       BOOLEAN DEFAULT FALSE,
  firebase_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.builders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "builder_store_owner" ON public.builders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id        UUID REFERENCES public.stores(id),
  plan            TEXT NOT NULL,          -- free | starter | pro | enterprise
  status          TEXT DEFAULT 'active',  -- active | expired | cancelled
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  payment_ref     TEXT,
  firebase_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_owner" ON public.subscriptions
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "admin_all_subs" ON public.subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id),
  store_id        UUID REFERENCES public.stores(id),
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  details         JSONB DEFAULT '{}',
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_owner" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_all_audit" ON public.audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_store ON public.audit_logs(store_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- AUTO-UPDATE updated_at via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_store_profiles_updated BEFORE UPDATE ON public.store_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
