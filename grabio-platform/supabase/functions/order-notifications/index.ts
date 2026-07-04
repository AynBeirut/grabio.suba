import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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

async function sendEmail(to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get('SMTP_HOST') || 'mail.grabio.space',
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      tls: false,
      auth: {
        username: Deno.env.get('SMTP_USER') || 'no-reply@grabio.space',
        password: Deno.env.get('SMTP_PASS') || '',
      },
    },
  });
  try {
    await client.send({
      from: `Grabio <${Deno.env.get('SMTP_USER') || 'no-reply@grabio.space'}>`,
      to,
      subject,
      content: 'auto',
      html,
    });
  } finally {
    await client.close();
  }
}

async function processNotification(db: ReturnType<typeof getDb>, row: {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
}) {
  const { event_type, payload } = row;

  if (event_type === 'new_order') {
    const storeId = String(payload.store_id || '');
    const customerName = String(payload.customer_name || 'A customer');
    const total = Number(payload.total || 0);
    const currency = String(payload.currency || 'USD');

    const { data: profile } = await db
      .from('store_profiles')
      .select('pro_email, email, owner_email')
      .eq('store_id', storeId)
      .maybeSingle();

    const toEmail = profile?.pro_email || profile?.email || profile?.owner_email;
    if (!toEmail) return { ok: false, reason: 'No store owner email' };

    await sendEmail(
      toEmail,
      'New order received',
      `<p><strong>${customerName}</strong> placed an order for ${currency} ${total.toFixed(2)}.</p>`,
    );
    return { ok: true };
  }

  if (event_type === 'order_status_changed' || event_type === 'payment_status_changed') {
    return { ok: true, reason: 'Logged — FCM handled by mobile Firebase during parallel run' };
  }

  if (event_type === 'low_stock') {
    const storeId = String(payload.store_id || '');
    const productName = String(payload.product_name || 'Product');
    const stock = Number(payload.current_stock || 0);

    const { data: profile } = await db
      .from('store_profiles')
      .select('pro_email, email, owner_email')
      .eq('store_id', storeId)
      .maybeSingle();

    const toEmail = profile?.pro_email || profile?.email || profile?.owner_email;
    if (!toEmail) return { ok: false, reason: 'No store owner email' };

    await sendEmail(
      toEmail,
      `Low stock: ${productName}`,
      `<p><strong>${productName}</strong> is down to ${stock} units.</p>`,
    );
    return { ok: true };
  }

  return { ok: false, reason: `Unknown event type: ${event_type}` };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const db = getDb();
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);

    const { data: pending, error } = await db
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!pending?.length) return jsonResponse({ processed: 0, message: 'No pending notifications' });

    let processed = 0;
    const results: Array<{ id: string; ok: boolean; reason?: string }> = [];

    for (const row of pending) {
      try {
        const result = await processNotification(db, row);
        await db.from('notification_queue').update({
          status: result.ok ? 'sent' : 'failed',
          attempts: (row.attempts || 0) + 1,
          last_error: result.reason || null,
          processed_at: new Date().toISOString(),
        }).eq('id', row.id);

        if (result.ok) processed += 1;
        results.push({ id: row.id, ok: result.ok, reason: result.reason });
      } catch (err) {
        await db.from('notification_queue').update({
          status: 'failed',
          attempts: (row.attempts || 0) + 1,
          last_error: err instanceof Error ? err.message : 'Processing failed',
        }).eq('id', row.id);
        results.push({ id: row.id, ok: false, reason: err instanceof Error ? err.message : 'Error' });
      }
    }

    return jsonResponse({ processed, total: pending.length, results });
  } catch (err) {
    console.error('order-notifications error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
