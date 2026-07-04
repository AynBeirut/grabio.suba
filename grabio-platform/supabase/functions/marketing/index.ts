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

async function sendBulkEmail(to: string[], subject: string, html: string) {
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
    for (const recipient of to) {
      await client.send({
        from: `Grabio <${Deno.env.get('SMTP_USER') || 'no-reply@grabio.space'}>`,
        to: recipient,
        subject,
        content: 'auto',
        html,
      });
    }
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';
    const db = getDb();

    if (path === 'subscribe' && req.method === 'POST') {
      const { storeId, email, name } = await req.json();
      if (!storeId || !email) return jsonResponse({ error: 'Missing storeId or email' }, 400);

      const { data: existing } = await db.from('store_subscribers')
        .select('id').eq('store_id', storeId).eq('email', email).single();

      if (existing) return jsonResponse({ error: 'Already subscribed' }, 409);

      await db.from('store_subscribers').insert({
        store_id: storeId, email, name: name || '', status: 'active',
      });

      return jsonResponse({ success: true, message: 'Subscribed successfully' });
    }

    if (path === 'unsubscribe' && req.method === 'POST') {
      const { storeId, email } = await req.json();
      if (!storeId || !email) return jsonResponse({ error: 'Missing storeId or email' }, 400);

      await db.from('store_subscribers')
        .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
        .eq('store_id', storeId).eq('email', email);

      return jsonResponse({ success: true, message: 'Unsubscribed' });
    }

    if (path === 'subscribers' && req.method === 'GET') {
      const storeId = url.searchParams.get('storeId');
      if (!storeId) return jsonResponse({ error: 'Missing storeId' }, 400);

      const { data: subscribers } = await db.from('store_subscribers')
        .select('*').eq('store_id', storeId).eq('status', 'active');

      return jsonResponse({ success: true, subscribers: subscribers || [] });
    }

    if (path === 'send-campaign' && req.method === 'POST') {
      const { storeId, subject, htmlContent } = await req.json();
      if (!storeId || !subject || !htmlContent) return jsonResponse({ error: 'Missing required fields' }, 400);

      const { data: subscribers } = await db.from('store_subscribers')
        .select('email').eq('store_id', storeId).eq('status', 'active');

      if (!subscribers || subscribers.length === 0) {
        return jsonResponse({ error: 'No active subscribers' }, 400);
      }

      const emails = subscribers.map((s: { email: string }) => s.email);

      await db.from('marketing_campaigns').insert({
        store_id: storeId, subject, html_content: htmlContent,
        recipients_count: emails.length, status: 'sent', sent_at: new Date().toISOString(),
      });

      await sendBulkEmail(emails, subject, htmlContent);

      return jsonResponse({ success: true, sent: emails.length });
    }

    if (path === 'campaigns' && req.method === 'GET') {
      const storeId = url.searchParams.get('storeId');
      if (!storeId) return jsonResponse({ error: 'Missing storeId' }, 400);

      const { data: campaigns } = await db.from('marketing_campaigns')
        .select('*').eq('store_id', storeId).order('created_at', { ascending: false });

      return jsonResponse({ success: true, campaigns: campaigns || [] });
    }

    return jsonResponse({ error: 'Unknown path. Use: subscribe, unsubscribe, subscribers, send-campaign, campaigns' }, 400);
  } catch (err) {
    console.error('Marketing error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
