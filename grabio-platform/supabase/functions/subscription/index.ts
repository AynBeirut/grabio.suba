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

type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'business';
type PaidTier = Exclude<SubscriptionTier, 'trial'>;
type Billing = 'monthly' | 'yearly';

const PRICING: Record<PaidTier, Record<Billing, number>> = {
  starter: { monthly: 1000, yearly: 10000 },
  pro: { monthly: 2000, yearly: 20000 },
  business: { monthly: 3000, yearly: 30000 },
};

const ADDON_PRICING: Record<string, Record<Billing, number>> = {
  domainPackage: { monthly: 1500, yearly: 15000 },
  whatsappBusiness: { monthly: 1000, yearly: 10000 },
  extraStoragePer5Gb: { monthly: 200, yearly: 2400 },
  salesCrm: { monthly: 1500, yearly: 15000 },
};

const PLAN_LIMITS: Record<SubscriptionTier, {
  productLimit: number; storageLimitMb: number;
  operationsPerMonth: number | null; revenueSharePercentage: number;
  allowsComposed: boolean; allowsManufacturing: boolean;
}> = {
  trial: { productLimit: 10, storageLimitMb: 500, operationsPerMonth: 30, revenueSharePercentage: 20, allowsComposed: false, allowsManufacturing: false },
  starter: { productLimit: 8, storageLimitMb: 5120, operationsPerMonth: null, revenueSharePercentage: 0, allowsComposed: true, allowsManufacturing: false },
  pro: { productLimit: 20, storageLimitMb: 10240, operationsPerMonth: null, revenueSharePercentage: 0, allowsComposed: true, allowsManufacturing: true },
  business: { productLimit: 50, storageLimitMb: 20480, operationsPerMonth: null, revenueSharePercentage: 0, allowsComposed: true, allowsManufacturing: true },
};

const TRIAL_DURATION_MONTHS = 3;
const TRIAL_GRACE_DAYS = 15;

function normalizeTier(tier?: string): SubscriptionTier {
  if (!tier) return 'starter';
  if (tier === 'premium') return 'starter';
  if (['trial', 'starter', 'pro', 'business'].includes(tier)) return tier as SubscriptionTier;
  return 'starter';
}

function normalizePaidTier(tier?: string): PaidTier {
  const t = normalizeTier(tier);
  return t === 'trial' ? 'starter' : t;
}

function normalizeAddOns(addOns: unknown) {
  if (Array.isArray(addOns)) {
    return {
      domainPackage: addOns.includes('domainPackage') || addOns.includes('customDomainHosting'),
      whatsappBusiness: addOns.includes('whatsappBusiness'),
      salesCrm: addOns.includes('salesCrm'),
      extraStorageBlocks: addOns.includes('extraStorage') || addOns.includes('storage') ? 1 : 0,
    };
  }
  const v = (addOns && typeof addOns === 'object' ? addOns : {}) as Record<string, unknown>;
  return {
    domainPackage: Boolean(v.domainPackage || v.customDomainHosting),
    whatsappBusiness: Boolean(v.whatsappBusiness),
    salesCrm: Boolean(v.salesCrm),
    extraStorageBlocks: Math.max(0, Number(v.extraStorageBlocks || (v.storage ? 1 : 0) || 0)),
  };
}

function calculateAmount(tier: PaidTier, billing: Billing, addOnsInput: unknown) {
  const addOns = normalizeAddOns(addOnsInput);
  let amount = PRICING[tier][billing];
  let description = `Grabio ${tier.toUpperCase()} - ${billing}`;
  if (addOns.domainPackage) { amount += ADDON_PRICING.domainPackage[billing]; description += ' + Domain Package'; }
  if (addOns.whatsappBusiness) { amount += ADDON_PRICING.whatsappBusiness[billing]; description += ' + WhatsApp Business'; }
  if (addOns.extraStorageBlocks > 0) { amount += addOns.extraStorageBlocks * ADDON_PRICING.extraStoragePer5Gb[billing]; description += ` + ${addOns.extraStorageBlocks}x Extra Storage`; }
  if (addOns.salesCrm) { amount += ADDON_PRICING.salesCrm[billing]; description += ' + Sales CRM'; }
  return { amount, description, addOns };
}

function getDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function handleStartTrial(body: Record<string, unknown>) {
  const { userId, email } = body;
  if (!userId || !email) return jsonResponse({ error: 'Missing required fields' }, 400);

  const db = getDb();
  const { data: profile } = await db.from('store_profiles').select('*').eq('owner_id', userId).maybeSingle();

  if (profile?.has_used_trial) return jsonResponse({ error: 'Trial already used' }, 400);
  if (profile?.is_legacy_user) return jsonResponse({ error: 'Legacy users do not need trial' }, 400);

  const limits = PLAN_LIMITS.trial;
  const trialEndsAt = new Date();
  trialEndsAt.setMonth(trialEndsAt.getMonth() + TRIAL_DURATION_MONTHS);
  const trialGraceEndsAt = new Date(trialEndsAt);
  trialGraceEndsAt.setDate(trialGraceEndsAt.getDate() + TRIAL_GRACE_DAYS);
  const now = new Date().toISOString();

  const billingEntry = {
    date: now, amount: 0, plan: 'monthly', tier: 'trial',
    status: 'success', transactionId: `TRIAL_${Date.now()}`,
    description: 'Trial plan - up to 3 months, 20% revenue share',
  };

  const { data: store } = await db.from('stores').select('id').eq('owner_id', userId).limit(1).maybeSingle();
  if (!store) return jsonResponse({ error: 'Store not found for user' }, 404);

  await db.from('store_profiles').upsert({
    store_id: store.id,
    owner_id: userId,
    subscription_status: 'trial',
    subscription_tier: 'trial',
    subscription_plan: 'monthly',
    is_trial_user: true,
    has_used_trial: true,
    trial_started_at: now,
    trial_ends_at: trialEndsAt.toISOString(),
    trial_grace_ends_at: trialGraceEndsAt.toISOString(),
    subscription_ends_at: trialEndsAt.toISOString(),
    next_billing_date: trialEndsAt.toISOString(),
    last_payment_date: now,
    last_payment_amount: 0,
    product_limit: limits.productLimit,
    storage_limit_mb: limits.storageLimitMb,
    monthly_operations_limit: limits.operationsPerMonth,
    revenue_share_percentage: limits.revenueSharePercentage,
    billing_history: [billingEntry],
    updated_at: now,
  }, { onConflict: 'store_id' });

  return jsonResponse({
    success: true, activated: true, tier: 'trial',
    trialMonths: TRIAL_DURATION_MONTHS, trialGraceDays: TRIAL_GRACE_DAYS,
  });
}

async function handleSubscribe(body: Record<string, unknown>) {
  const { userId, email, tier, billing, addOns } = body;
  if (!userId || !email || !tier || !billing) return jsonResponse({ error: 'Missing required fields' }, 400);

  const normalizedTier = normalizePaidTier(String(tier));
  const normalizedBilling: Billing = billing === 'yearly' ? 'yearly' : 'monthly';
  const { amount, description, addOns: normalizedAddOns } = calculateAmount(normalizedTier, normalizedBilling, addOns);

  const FRONTEND_BASE = Deno.env.get('FRONTEND_BASE_URL') || 'https://grabio.online';
  const API_BASE = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
  const externalId = Date.now();

  const whishChannel = Deno.env.get('WHISH_CHANNEL') || '';
  const whishSecret = Deno.env.get('WHISH_SECRET') || '';
  const websiteUrl = Deno.env.get('WEBSITE_URL') || 'https://grabio.online';

  const paymentResponse = await fetch('https://api.whish.money/itel-service/api/payment/whish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'channel': whishChannel,
      'secret': whishSecret,
      'websiteUrl': websiteUrl,
    },
    body: JSON.stringify({
      amount, currency: 'USD', invoice: description, externalId,
      successCallbackUrl: `${API_BASE}/webhook-whish?externalId=${externalId}&type=subscription&userId=${userId}`,
      failureCallbackUrl: `${API_BASE}/webhook-whish?externalId=${externalId}&type=subscription&userId=${userId}&status=failed`,
      successRedirectUrl: `${FRONTEND_BASE}/payment/success?type=subscription`,
      failureRedirectUrl: `${FRONTEND_BASE}/payment/failed?type=subscription`,
    }),
  });

  const payment = await paymentResponse.json();

  if (!payment.status || !payment.data?.collectUrl) {
    return jsonResponse({ error: payment.error || 'Payment initialization failed', code: payment.code || 'WHISH_ERROR' }, 502);
  }

  const db = getDb();
  const { data: store } = await db.from('stores').select('id').eq('owner_id', userId).limit(1).maybeSingle();
  if (!store) return jsonResponse({ error: 'Store not found for user' }, 404);

  await db.from('store_profiles').upsert({
    store_id: store.id,
    owner_id: userId,
    pending_subscription_payment_id: String(externalId),
    pending_subscription_tier: normalizedTier,
    pending_subscription_billing: normalizedBilling,
    pending_subscription_add_ons: normalizedAddOns,
    pending_subscription_amount: amount,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'store_id' });

  return jsonResponse({ success: true, paymentUrl: payment.data.collectUrl, externalId, amount });
}

async function handleCancel(body: Record<string, unknown>) {
  const { userId } = body;
  if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);

  const db = getDb();
  const { data: profile } = await db.from('store_profiles').select('*').eq('owner_id', userId).maybeSingle();
  if (!profile) return jsonResponse({ error: 'Store not found' }, 404);
  if (profile.is_legacy_user) return jsonResponse({ error: 'Cannot cancel legacy user subscription' }, 400);

  await db.from('store_profiles').update({
    subscription_status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    subscription_ends_at: profile.subscription_ends_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('owner_id', userId);

  return jsonResponse({
    success: true,
    message: 'Subscription cancelled. Access continues until ' + new Date(profile.subscription_ends_at).toLocaleDateString(),
  });
}

async function handleGetInfo(req: Request) {
  const url = new URL(req.url);
  let userId = url.searchParams.get('userId');

  if (!userId) {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token) {
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }
  }

  if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);

  const db = getDb();
  const { data: profile } = await db.from('store_profiles').select('*').eq('owner_id', userId).maybeSingle();

  if (!profile) {
    return jsonResponse({
      success: true,
      subscription: {
        status: 'inactive', tier: 'trial', plan: null, isLegacyUser: false, isTrial: false,
        expiresAt: null, nextBillingDate: null, addOns: [], addOnsMeta: {},
        limits: { productLimit: null, storageLimitMb: null, monthlyOperationsLimit: null, revenueSharePercentage: null },
        billingHistory: [],
      },
    });
  }

  return jsonResponse({
    success: true,
    subscription: {
      status: profile.subscription_status || 'inactive',
      tier: normalizeTier(profile.subscription_tier),
      plan: profile.subscription_plan,
      isLegacyUser: profile.is_legacy_user || false,
      isTrial: profile.is_trial_user || false,
      expiresAt: profile.subscription_ends_at,
      nextBillingDate: profile.next_billing_date,
      addOns: profile.add_ons || [],
      addOnsMeta: profile.add_ons_meta || {},
      limits: {
        productLimit: profile.product_limit,
        storageLimitMb: profile.storage_limit_mb,
        monthlyOperationsLimit: profile.monthly_operations_limit,
        revenueSharePercentage: profile.revenue_share_percentage,
      },
      billingHistory: profile.billing_history || [],
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';

    if (req.method === 'GET' && path === 'info') {
      return await handleGetInfo(req);
    }

    const body = await req.json().catch(() => ({}));

    switch (path) {
      case 'trial': return await handleStartTrial(body);
      case 'subscribe': return await handleSubscribe(body);
      case 'cancel': return await handleCancel(body);
      default:
        if (req.method === 'GET') return await handleGetInfo(req);
        return jsonResponse({ error: 'Unknown action. Use: trial, subscribe, cancel, info' }, 400);
    }
  } catch (err) {
    console.error('Subscription error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
