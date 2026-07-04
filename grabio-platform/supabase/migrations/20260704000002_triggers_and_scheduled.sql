-- ============================================================
-- Database triggers replacing Firebase Firestore triggers
-- and pg_cron scheduled jobs replacing Firebase scheduled functions
-- ============================================================

-- Supporting tables for marketing, contact, campaigns
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  to_email text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  store_name text,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  to_email text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  email text NOT NULL,
  name text DEFAULT '',
  status text DEFAULT 'active',
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, email)
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  subject text NOT NULL,
  html_content text,
  recipients_count integer DEFAULT 0,
  status text DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text,
  service_name text,
  customer_id text,
  customer_name text,
  store_id text NOT NULL,
  payment_type text CHECK (payment_type IN ('monthly', 'yearly')),
  price numeric(10,2) DEFAULT 0,
  next_billing_date timestamptz,
  renewal_reminder_days integer DEFAULT 7,
  status text DEFAULT 'active',
  last_reminder_for_billing_date text,
  last_charge_for_billing_date text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGER: Auto-update updated_at on orders
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'orders_updated_at'
  ) THEN
    CREATE TRIGGER orders_updated_at
      BEFORE UPDATE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'products_updated_at'
  ) THEN
    CREATE TRIGGER products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- ============================================================
-- TRIGGER: Notify on new order (replaces Firestore onOrderCreated)
-- Inserts into a notification_queue table for async processing
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notification_queue (event_type, payload)
  VALUES ('new_order', jsonb_build_object(
    'order_id', NEW.id,
    'store_id', NEW.store_id,
    'customer_name', NEW.customer_name,
    'total', NEW.total,
    'currency', NEW.currency
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_order_created'
  ) THEN
    CREATE TRIGGER on_order_created
      AFTER INSERT ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();
  END IF;
END $$;

-- ============================================================
-- TRIGGER: Notify on order status/payment change
-- (replaces Firestore onOrderStatusChanged)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notification_queue (event_type, payload)
    VALUES ('order_status_changed', jsonb_build_object(
      'order_id', NEW.id,
      'store_id', NEW.store_id,
      'customer_id', NEW.customer_id,
      'old_status', OLD.status,
      'new_status', NEW.status
    ));
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.notification_queue (event_type, payload)
    VALUES ('payment_status_changed', jsonb_build_object(
      'order_id', NEW.id,
      'store_id', NEW.store_id,
      'customer_id', NEW.customer_id,
      'old_payment_status', OLD.payment_status,
      'new_payment_status', NEW.payment_status,
      'total', NEW.total
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_order_status_changed'
  ) THEN
    CREATE TRIGGER on_order_status_changed
      AFTER UPDATE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_changed();
  END IF;
END $$;

-- ============================================================
-- FUNCTION: Check expired subscriptions (replaces Firebase scheduled)
-- Called by pg_cron daily at 09:00 UTC
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_subscriptions()
RETURNS void AS $$
DECLARE
  store RECORD;
  grace_ends_at timestamptz;
  data_delete_at timestamptz;
BEGIN
  FOR store IN
    SELECT * FROM public.store_profiles
    WHERE subscription_status IN ('active', 'trial', 'grace_period', 'blocked')
      AND is_legacy_user IS NOT TRUE
      AND subscription_ends_at IS NOT NULL
  LOOP
    -- Active/trial subscription expired → start grace period
    IF store.subscription_status IN ('active', 'trial')
       AND store.subscription_ends_at <= now() THEN
      grace_ends_at := now() + interval '7 days';
      UPDATE public.store_profiles SET
        subscription_status = 'grace_period',
        grace_started_at = now()::text,
        grace_ends_at = grace_ends_at::text,
        updated_at = now()::text
      WHERE id = store.id;
    END IF;

    -- Grace period expired → block account
    IF store.subscription_status = 'grace_period'
       AND store.grace_ends_at IS NOT NULL
       AND store.grace_ends_at::timestamptz <= now() THEN
      data_delete_at := now() + interval '30 days';
      UPDATE public.store_profiles SET
        subscription_status = 'blocked',
        blocked_at = now()::text,
        data_will_delete_at = data_delete_at::text,
        updated_at = now()::text
      WHERE id = store.id;
    END IF;

    -- Blocked for 30+ days → mark as deleted
    IF store.subscription_status = 'blocked'
       AND store.data_will_delete_at IS NOT NULL
       AND store.data_will_delete_at::timestamptz <= now() THEN
      UPDATE public.store_profiles SET
        subscription_status = 'deleted',
        data_deleted_at = now()::text,
        updated_at = now()::text
      WHERE id = store.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Check low stock alerts
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS void AS $$
BEGIN
  INSERT INTO public.notification_queue (event_type, payload)
  SELECT 'low_stock', jsonb_build_object(
    'product_id', p.id,
    'store_id', p.store_id,
    'product_name', p.name,
    'current_stock', p.stock,
    'low_stock_threshold', COALESCE(sp.low_stock_threshold, 5)
  )
  FROM public.products p
  LEFT JOIN public.store_profiles sp ON sp.id = p.store_id
  WHERE p.stock IS NOT NULL
    AND p.stock > 0
    AND p.stock <= COALESCE(sp.low_stock_threshold, 5)
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_queue nq
      WHERE nq.event_type = 'low_stock'
        AND nq.payload->>'product_id' = p.id::text
        AND nq.created_at > now() - interval '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS for new tables
-- ============================================================
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on contact_messages"
  ON public.contact_messages FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on store_contact_messages"
  ON public.store_contact_messages FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Store owners manage subscribers"
  ON public.store_subscribers FOR ALL
  USING (store_id::uuid IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id::uuid IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Anyone can subscribe"
  ON public.store_subscribers FOR INSERT WITH CHECK (true);

CREATE POLICY "Store owners manage campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (store_id::uuid IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id::uuid IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Service role full access on notification_queue"
  ON public.notification_queue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on service_subscriptions"
  ON public.service_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- pg_cron scheduled jobs (requires pg_cron extension)
-- Run these manually in SQL Editor after enabling pg_cron:
--
-- SELECT cron.schedule('check-subscriptions', '0 9 * * *', 'SELECT public.check_subscriptions()');
-- SELECT cron.schedule('check-low-stock', '0 */6 * * *', 'SELECT public.check_low_stock()');
-- ============================================================
