import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

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

function getStripe() {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2023-10-16' });
}

async function markOrderPaid(db: ReturnType<typeof getDb>, orderId: string, sessionId: string, paymentIntentId: string | null) {
  const { data: order } = await db.from('orders').select('*').eq('id', orderId).single();
  if (!order) throw new Error('Order not found');
  if (order.payment_status === 'paid') return;

  await db.from('orders').update({
    status: 'paid',
    payment_status: 'paid',
    amount_paid: order.total || 0,
    payment_date: new Date().toISOString(),
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';

    // Stripe webhook (POST with raw body)
    if (path === 'webhook' || req.headers.get('stripe-signature')) {
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });

      const signature = req.headers.get('stripe-signature');
      if (!signature) return new Response('Missing stripe-signature header', { status: 400 });

      const body = await req.text();
      const stripe = getStripe();
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId || session.client_reference_id || '';
        if (session.payment_status === 'paid' && orderId) {
          const db = getDb();
          await markOrderPaid(db, orderId, session.id, typeof session.payment_intent === 'string' ? session.payment_intent : null);
        }
      }

      return jsonResponse({ received: true });
    }

    // Create checkout session
    if (path === 'checkout') {
      const body = await req.json();
      const { orderId, paymentMethod } = body;
      if (!orderId) return jsonResponse({ error: 'Missing order ID' }, 400);

      const db = getDb();
      const { data: order } = await db.from('orders').select('*').eq('id', orderId).single();
      if (!order) return jsonResponse({ error: 'Order not found' }, 404);
      if (order.payment_status === 'paid') return jsonResponse({ error: 'Order already paid' }, 409);

      const FRONTEND_BASE = Deno.env.get('FRONTEND_BASE_URL') || 'https://grabio.online';
      const stripe = getStripe();
      const amountInCents = Math.round((order.total || 0) * 100);

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountInCents,
            product_data: { name: `Order ${order.invoice_number || orderId}` },
          },
        }],
        client_reference_id: orderId,
        metadata: { orderId, storeId: order.store_id, paymentMethod: paymentMethod || 'card' },
        success_url: `${FRONTEND_BASE}/cart?stripe=success&orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_BASE}/cart?stripe=cancel&orderId=${encodeURIComponent(orderId)}`,
      });

      await db.from('orders').update({
        payment_status: 'pending',
        payment_method: paymentMethod || 'card',
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      }).eq('id', orderId);

      return jsonResponse({ success: true, paymentUrl: session.url, orderId, sessionId: session.id });
    }

    // Confirm checkout session
    if (path === 'confirm') {
      const body = await req.json();
      const sessionId = body.sessionId;
      if (!sessionId) return jsonResponse({ error: 'Missing session ID' }, 400);

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const orderId = session.metadata?.orderId || session.client_reference_id || '';
      if (!orderId) return jsonResponse({ error: 'Cannot resolve order ID' }, 400);

      if (session.payment_status !== 'paid') {
        return jsonResponse({ success: false, orderId, paymentStatus: 'pending', stripeStatus: session.payment_status }, 202);
      }

      const db = getDb();
      await markOrderPaid(db, orderId, session.id, typeof session.payment_intent === 'string' ? session.payment_intent : null);
      return jsonResponse({ success: true, orderId, paymentStatus: 'paid' });
    }

    return jsonResponse({ error: 'Unknown path. Use: webhook, checkout, confirm' }, 400);
  } catch (err) {
    console.error('Stripe edge function error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
