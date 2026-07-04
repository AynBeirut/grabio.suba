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

function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeSubscriptionTier(rawTier: unknown): 'trial' | 'starter' | 'pro' | 'business' {
  if (typeof rawTier !== 'string') return 'starter';
  const tier = rawTier.toLowerCase();
  if (tier === 'premium') return 'starter';
  if (['trial', 'starter', 'pro', 'business'].includes(tier)) return tier as 'trial' | 'starter' | 'pro' | 'business';
  return 'starter';
}

interface CheckoutItem {
  productId: string;
  storeId: string;
  quantity?: number;
}

interface DeliveryInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  coordinates?: unknown;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const { items, deliveryInfo } = body as { items?: unknown[]; deliveryInfo?: DeliveryInfo };

    // Auth is optional (supports guest checkout)
    let userId: string | null = null;
    let customerName = '';
    let customerPhone = '';
    let customerEmail = '';
    let isGuest = false;

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (token) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return jsonResponse({ error: 'Invalid auth token' }, 401);
      }
      userId = user.id;
      customerName = user.user_metadata?.full_name || user.email || '';
      customerEmail = user.email || '';
      customerPhone = user.user_metadata?.phone || '';
    } else {
      isGuest = true;
      userId = `guest_${Date.now()}`;
      customerName = deliveryInfo?.name || 'Guest Customer';
      customerPhone = deliveryInfo?.phone || '';
      customerEmail = deliveryInfo?.email || '';

      if (!customerPhone) {
        return jsonResponse({ error: 'Guest checkout requires a phone number' }, 400);
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: 'No items' }, 400);
    }

    const checkoutItems = items.map((i) => i as CheckoutItem);
    const itemsByStore: Record<string, CheckoutItem[]> = {};
    for (const it of checkoutItems) {
      if (!it.storeId) continue;
      itemsByStore[it.storeId] = itemsByStore[it.storeId] || [];
      itemsByStore[it.storeId].push(it);
    }

    const orderIds: string[] = [];

    for (const storeId of Object.keys(itemsByStore)) {
      const storeItems = itemsByStore[storeId];
      let storeSubtotal = 0;
      const orderItems: Array<{ productId: string; name: string; price: number; quantity: number; currency: string }> = [];

      // Fetch products and validate stock
      for (const it of storeItems) {
        if (!it.productId) throw new Error('Invalid item');

        const { data: product, error: prodErr } = await db
          .from('products')
          .select('*')
          .eq('id', it.productId)
          .single();

        if (prodErr || !product) throw new Error(`Product not found: ${it.productId}`);
        const outOfStock = product.track_stock !== false && typeof product.stock === 'number' && product.stock <= 0;
        if (outOfStock) throw new Error(`Product out of stock: ${it.productId}`);

        const serverPrice = typeof product.price === 'number' ? product.price : 0;
        const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;

        if (typeof product.stock === 'number' && product.stock > 0 && product.stock < qty) {
          throw new Error(`Insufficient stock for product: ${it.productId}`);
        }

        orderItems.push({
          productId: it.productId,
          name: product.name || it.productId,
          price: serverPrice,
          quantity: qty,
          currency: product.currency || 'USD',
        });
        storeSubtotal += serverPrice * qty;

        // Deduct stock if tracking enabled
        if (typeof product.stock === 'number' && product.stock > 0) {
          await db
            .from('products')
            .update({ stock: product.stock - qty })
            .eq('id', it.productId);
        }
      }

      // Get store profile
      const { data: storeProfile } = await db
        .from('store_profiles')
        .select('*')
        .eq('id', storeId)
        .single();

      // Trial operation limit check
      const tier = normalizeSubscriptionTier(storeProfile?.subscription_tier);
      if (tier === 'trial') {
        const now = new Date();
        const monthKey = now.toISOString().slice(0, 7);
        const usageMonth = storeProfile?.operations_usage_month || '';
        const currentUsed = usageMonth === monthKey ? (storeProfile?.operations_used_this_month || 0) : 0;
        const monthlyLimit = storeProfile?.monthly_operations_limit || 200;
        const nextUsed = currentUsed + 1;

        if (nextUsed > monthlyLimit) {
          throw new Error(`Trial operation limit reached for store ${storeId}. Upgrade plan to continue.`);
        }

        await db.from('store_profiles').update({
          operations_usage_month: monthKey,
          operations_used_this_month: nextUsed,
          updated_at: now.toISOString(),
        }).eq('store_id', storeId);
      }

      // Generate invoice number
      const lastNumber = storeProfile?.last_invoice_number || 0;
      const newNumber = lastNumber + 1;
      const invoiceNumber = `ON-${String(newNumber).padStart(3, '0')}`;

      await db.from('store_profiles').update({
        last_invoice_number: newNumber,
      }).eq('store_id', storeId);

      // Create order
      const { data: newOrder, error: orderErr } = await db
        .from('orders')
        .insert({
          store_id: storeId,
          order_number: invoiceNumber,
          store_name: storeProfile?.store_name || storeProfile?.business_name || '',
          currency: orderItems[0]?.currency || 'LBP',
          customer_id: userId,
          customer_name: customerName,
          customer_phone: deliveryInfo?.phone || customerPhone || '',
          customer_email: deliveryInfo?.email || customerEmail || '',
          is_guest: isGuest,
          invoice_number: invoiceNumber,
          items: orderItems,
          subtotal: roundMoney(storeSubtotal),
          tax_type: 'none',
          tax_rate: 0,
          tax_amount: 0,
          discount_type: 'fixed',
          discount_value: 0,
          discount_amount: 0,
          total: roundMoney(storeSubtotal),
          status: 'pending',
          delivery_address: deliveryInfo?.address || '',
          delivery_city: deliveryInfo?.city || '',
          delivery_notes: deliveryInfo?.notes || '',
          delivery_coordinates: deliveryInfo?.coordinates || null,
        })
        .select('id')
        .single();

      if (orderErr || !newOrder) throw new Error('Failed to create order');
      orderIds.push(newOrder.id);
    }

    return jsonResponse({ ok: true, ordersCreated: orderIds.length, orderIds });
  } catch (err) {
    console.error('Checkout failed', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Checkout failed' }, 500);
  }
});
