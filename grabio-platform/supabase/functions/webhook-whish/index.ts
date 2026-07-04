import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function checkPaymentStatus(externalId: number, currency: string) {
  const whishChannel = Deno.env.get('WHISH_CHANNEL') || '';
  const whishSecret = Deno.env.get('WHISH_SECRET') || '';
  const websiteUrl = Deno.env.get('WEBSITE_URL') || 'https://grabio.online';

  const response = await fetch('https://api.whish.money/itel-service/api/payment/collect/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      channel: whishChannel,
      secret: whishSecret,
      websiteUrl: websiteUrl,
    },
    body: JSON.stringify({ currency, externalId }),
  });
  return await response.json();
}

const PLAN_LIMITS = {
  trial: { productLimit: 10, storageLimitMb: 500, operationsPerMonth: 30, revenueSharePercentage: 20 },
  starter: { productLimit: 8, storageLimitMb: 5120, operationsPerMonth: null, revenueSharePercentage: 0 },
  pro: { productLimit: 20, storageLimitMb: 10240, operationsPerMonth: null, revenueSharePercentage: 0 },
  business: { productLimit: 50, storageLimitMb: 20480, operationsPerMonth: null, revenueSharePercentage: 0 },
} as const;

function normalizePaidTier(tier?: string): 'starter' | 'pro' | 'business' {
  if (tier === 'pro') return 'pro';
  if (tier === 'business') return 'business';
  return 'starter';
}

async function activateTrial(db: ReturnType<typeof getDb>, userId: string, paymentId: string) {
  const { data: store } = await db.from('stores').select('id').eq('owner_id', userId).limit(1).maybeSingle();
  if (!store) throw new Error('Store not found');

  const limits = PLAN_LIMITS.trial;
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setMonth(trialEndsAt.getMonth() + 3);
  const trialGraceEndsAt = new Date(trialEndsAt);
  trialGraceEndsAt.setDate(trialGraceEndsAt.getDate() + 15);

  await db.from('store_profiles').upsert({
    store_id: store.id,
    owner_id: userId,
    subscription_status: 'trial',
    subscription_tier: 'trial',
    subscription_plan: 'monthly',
    is_trial_user: true,
    has_used_trial: true,
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt.toISOString(),
    trial_grace_ends_at: trialGraceEndsAt.toISOString(),
    subscription_ends_at: trialEndsAt.toISOString(),
    next_billing_date: trialEndsAt.toISOString(),
    last_payment_date: now.toISOString(),
    last_payment_amount: 0,
    product_limit: limits.productLimit,
    storage_limit_mb: limits.storageLimitMb,
    monthly_operations_limit: limits.operationsPerMonth,
    revenue_share_percentage: limits.revenueSharePercentage,
    pending_subscription_payment_id: null,
    pending_subscription_tier: null,
    pending_subscription_billing: null,
    pending_subscription_add_ons: null,
    pending_subscription_amount: null,
    billing_history: [{ date: now.toISOString(), amount: 0, plan: 'monthly', tier: 'trial', status: 'success', transactionId: paymentId, description: 'Trial plan' }],
    updated_at: now.toISOString(),
  }, { onConflict: 'store_id' });
}

async function activateSubscription(db: ReturnType<typeof getDb>, userId: string, paymentId: string) {
  const { data: profile } = await db.from('store_profiles').select('*').eq('owner_id', userId).single();
  if (!profile) throw new Error('Store not found');

  const tier = normalizePaidTier(profile.pending_subscription_tier);
  const billing = profile.pending_subscription_billing === 'yearly' ? 'yearly' : 'monthly';
  const amount = profile.pending_subscription_amount || 0;
  const limits = PLAN_LIMITS[tier];

  const endsAt = new Date();
  if (billing === 'yearly') endsAt.setFullYear(endsAt.getFullYear() + 1);
  else endsAt.setMonth(endsAt.getMonth() + 1);

  const existingHistory = Array.isArray(profile.billing_history) ? profile.billing_history : [];
  existingHistory.push({
    date: new Date().toISOString(), amount: amount / 100, plan: billing,
    tier, status: 'success', transactionId: paymentId, description: `${tier.toUpperCase()} - ${billing}`,
  });

  await db.from('store_profiles').update({
    subscription_status: 'active',
    subscription_tier: tier,
    subscription_plan: billing,
    subscription_started_at: new Date().toISOString(),
    subscription_ends_at: endsAt.toISOString(),
    next_billing_date: endsAt.toISOString(),
    last_payment_date: new Date().toISOString(),
    last_payment_amount: amount / 100,
    product_limit: limits.productLimit,
    storage_limit_mb: limits.storageLimitMb,
    monthly_operations_limit: limits.operationsPerMonth,
    revenue_share_percentage: limits.revenueSharePercentage,
    pending_subscription_payment_id: null,
    pending_subscription_tier: null,
    pending_subscription_billing: null,
    pending_subscription_add_ons: null,
    pending_subscription_amount: null,
    billing_history: existingHistory,
    updated_at: new Date().toISOString(),
  }).eq('owner_id', userId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const externalId = url.searchParams.get('externalId');
    const type = url.searchParams.get('type');
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');

    if (!externalId || !type || !userId) {
      return jsonResponse({ error: 'Missing parameters' }, 400);
    }

    const paymentStatus = await checkPaymentStatus(Number(externalId), 'USD');
    const db = getDb();

    if (paymentStatus.data?.collectStatus === 'success') {
      if (type === 'trial') {
        await activateTrial(db, String(userId), String(externalId));
      } else if (type === 'subscription' || type === 'subscription_modular') {
        await activateSubscription(db, String(userId), String(externalId));
      }
    } else if (paymentStatus.data?.collectStatus === 'failed' || status === 'failed') {
      const { data: profile } = await db.from('store_profiles').select('billing_history').eq('owner_id', userId).single();
      const history = Array.isArray(profile?.billing_history) ? profile.billing_history : [];
      history.push({
        date: new Date().toISOString(), status: 'failed',
        transactionId: String(externalId), description: `${type} payment failed`,
      });

      await db.from('store_profiles').update({
        last_failed_payment: { externalId, date: new Date().toISOString(), type, reason: 'Payment failed via callback' },
        billing_history: history,
        updated_at: new Date().toISOString(),
      }).eq('owner_id', userId);
    }

    return jsonResponse({ success: true, message: 'Callback processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Webhook processing failed' }, 500);
  }
});
