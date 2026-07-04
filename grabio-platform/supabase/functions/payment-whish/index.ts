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

async function initiateStorePayment(
  credentials: { whishChannel: string; whishSecret: string; websiteUrl: string },
  amount: number, invoice: string, externalId: number,
  successCallbackUrl: string, failureCallbackUrl: string,
  successRedirectUrl: string, failureRedirectUrl: string,
) {
  try {
    const response = await fetch('https://api.whish.money/itel-service/api/payment/whish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        channel: credentials.whishChannel,
        secret: credentials.whishSecret,
        websiteUrl: credentials.websiteUrl,
        'User-Agent': 'Whish/1.0 (https://whish.money; support@whish.money)',
      },
      body: JSON.stringify({
        amount, currency: 'USD', invoice, externalId,
        successCallbackUrl, failureCallbackUrl,
        successRedirectUrl, failureRedirectUrl,
      }),
    });
    const data = await response.json();
    if (data.status && data.data?.collectUrl) {
      return { status: true, data: { collectUrl: data.data.collectUrl } };
    }
    return { status: false, error: data.dialog?.message || 'Payment initiation failed', code: data.code };
  } catch (err) {
    return { status: false, error: err instanceof Error ? err.message : 'Payment service unavailable' };
  }
}

async function checkStorePaymentStatus(
  credentials: { whishChannel: string; whishSecret: string; websiteUrl: string },
  externalId: number,
) {
  try {
    const response = await fetch('https://api.whish.money/itel-service/api/payment/collect/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        channel: credentials.whishChannel,
        secret: credentials.whishSecret,
        websiteUrl: credentials.websiteUrl,
      },
      body: JSON.stringify({ currency: 'USD', externalId }),
    });
    const data = await response.json();
    return { status: data.status, collectStatus: data.data?.collectStatus, error: data.dialog?.message };
  } catch (err) {
    return { status: false, error: err instanceof Error ? err.message : 'Status check failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';

    const db = getDb();

    // POST /checkout — create payment for an existing order
    if (path === 'checkout' && req.method === 'POST') {
      const { orderId } = await req.json();
      if (!orderId) return jsonResponse({ error: 'Missing order ID' }, 400);

      const { data: order } = await db.from('orders').select('*').eq('id', orderId).single();
      if (!order) return jsonResponse({ error: 'Order not found' }, 404);

      const storeId = order.store_id;
      const totalAmount = order.total;
      if (!storeId || !totalAmount) return jsonResponse({ error: 'Invalid order data' }, 400);

      const { data: storeProfile } = await db.from('store_profiles').select('*').eq('store_id', storeId).single();
      if (!storeProfile) return jsonResponse({ error: 'Store not found' }, 404);

      const credentials = {
        whishChannel: storeProfile.whish_channel,
        whishSecret: storeProfile.whish_secret,
        websiteUrl: storeProfile.website_url,
      };

      if (!credentials.whishChannel || !credentials.whishSecret || !credentials.websiteUrl) {
        return jsonResponse({ error: 'Store has not configured payment credentials' }, 400);
      }

      const externalId = Date.now();
      const amountInCents = Math.round(totalAmount * 100);
      const invoice = `Order #${orderId}`;

      const FRONTEND_BASE = Deno.env.get('FRONTEND_BASE_URL') || 'https://grabio.online';
      const API_BASE = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
      const storeSlug = storeProfile.slug || storeId;

      const successCallbackUrl = `${API_BASE}/payment-whish/callback?externalId=${externalId}&orderId=${orderId}`;
      const failureCallbackUrl = `${API_BASE}/payment-whish/callback?externalId=${externalId}&orderId=${orderId}&status=failed`;
      const successRedirectUrl = `${FRONTEND_BASE}/${storeSlug}?order=success&orderId=${orderId}`;
      const failureRedirectUrl = `${FRONTEND_BASE}/${storeSlug}?order=failed&orderId=${orderId}`;

      await db.from('orders').update({ external_id: externalId, payment_status: 'pending', updated_at: new Date().toISOString() }).eq('id', orderId);

      const payment = await initiateStorePayment(credentials, amountInCents, invoice, externalId, successCallbackUrl, failureCallbackUrl, successRedirectUrl, failureRedirectUrl);

      if (!payment.status) {
        await db.from('orders').update({ payment_status: 'failed', payment_error: payment.error, updated_at: new Date().toISOString() }).eq('id', orderId);
        return jsonResponse({ error: payment.error || 'Payment initialization failed' }, 500);
      }

      return jsonResponse({ success: true, paymentUrl: payment.data!.collectUrl, orderId, externalId });
    }

    // GET /callback — Whish payment callback for order payments
    if (path === 'callback') {
      const externalId = url.searchParams.get('externalId');
      const orderId = url.searchParams.get('orderId');
      const status = url.searchParams.get('status');

      if (!externalId || !orderId) return new Response('Missing required parameters', { status: 400 });

      const { data: order } = await db.from('orders').select('*').eq('id', orderId).single();
      if (!order) return new Response('Order not found', { status: 404 });

      const storeId = order.store_id;
      const { data: storeProfile } = await db.from('store_profiles').select('*').eq('store_id', storeId).single();
      if (!storeProfile) return new Response('Store not found', { status: 404 });

      const storeSlug = storeProfile.slug || storeId;
      const FRONTEND_BASE = Deno.env.get('FRONTEND_BASE_URL') || 'https://grabio.online';
      const successRedirectUrl = `${FRONTEND_BASE}/${storeSlug}?order=success&orderId=${orderId}`;
      const failureRedirectUrl = `${FRONTEND_BASE}/${storeSlug}?order=failed&orderId=${orderId}`;

      if (status === 'failed') {
        await db.from('orders').update({ status: 'payment_failed', payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', orderId);
        return Response.redirect(failureRedirectUrl, 302);
      }

      const credentials = {
        whishChannel: storeProfile.whish_channel,
        whishSecret: storeProfile.whish_secret,
        websiteUrl: storeProfile.website_url,
      };

      const statusCheck = await checkStorePaymentStatus(credentials, parseInt(externalId));

      if (statusCheck.status && statusCheck.collectStatus === 'success') {
        await db.from('orders').update({
          status: 'paid', payment_status: 'paid',
          amount_paid: order.total || 0,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', orderId);
        return Response.redirect(successRedirectUrl, 302);
      } else if (statusCheck.collectStatus === 'failed') {
        await db.from('orders').update({ status: 'payment_failed', payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', orderId);
        return Response.redirect(failureRedirectUrl, 302);
      }

      return new Response('Payment pending - please wait', { status: 202 });
    }

    return jsonResponse({ error: 'Unknown path. Use: checkout, callback' }, 400);
  } catch (err) {
    console.error('Payment Whish error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
