-- Enable pg_cron and schedule subscription/stock checks.
-- Run in SQL Editor after Database → Extensions → pg_cron is enabled.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('check-subscriptions', 'check-low-stock');

SELECT cron.schedule(
  'check-subscriptions',
  '0 9 * * *',
  $$SELECT public.check_subscriptions()$$
);

SELECT cron.schedule(
  'check-low-stock',
  '0 */6 * * *',
  $$SELECT public.check_low_stock()$$
);
