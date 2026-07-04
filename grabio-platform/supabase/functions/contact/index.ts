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

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
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
      ...(replyTo ? { replyTo } : {}),
    });
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { name, email, subject, message, storeId } = await req.json();

    if (!name || !email || !subject || !message) {
      return jsonResponse({ error: 'Missing required fields: name, email, subject, message' }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }

    const db = getDb();
    let toEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@grabio.space';
    let storeName: string | undefined;

    if (storeId) {
      const { data: store } = await db.from('store_profiles').select('pro_email, email, owner_email, store_name, business_name').eq('store_id', storeId).single();
      if (store?.pro_email) toEmail = store.pro_email;
      storeName = store?.store_name || store?.business_name;
    }

    const collection = storeId ? 'store_contact_messages' : 'contact_messages';
    await db.from(collection).insert({
      name, email, subject, message,
      ...(storeId ? { store_id: storeId, store_name: storeName } : {}),
      to_email: toEmail, status: 'new',
    });

    const context = storeName
      ? `<p style="color:#6b7280;font-size:13px;">Sent via the store contact form for <strong>${storeName}</strong></p>`
      : `<p style="color:#6b7280;font-size:13px;">Sent via the Grabio platform Contact Us page</p>`;

    const html = `<html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <div style="max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0ea5e9;margin-bottom:4px;">New Message: ${subject}</h2>
        ${context}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:6px 0;color:#6b7280;width:100px;">From</td><td style="padding:6px 0;"><strong>${name}</strong> &lt;${email}&gt;</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Subject</td><td style="padding:6px 0;">${subject}</td></tr>
        </table>
        <div style="background:#f9fafb;border-left:4px solid #0ea5e9;padding:16px;border-radius:4px;white-space:pre-wrap;">${message}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Grabio</p>
      </div>
    </body></html>`;

    await sendEmail(toEmail, storeName ? `[${storeName}] ${subject}` : `[Grabio Contact] ${subject}`, html, `${name} <${email}>`);

    await sendEmail(email, 'We received your message', `<html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <div style="max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0ea5e9;">Hi ${name},</h2>
        <p>Thank you for reaching out${storeName ? ` to <strong>${storeName}</strong>` : ''}! We received your message and will get back to you as soon as possible.</p>
        <div style="background:#f9fafb;border-left:4px solid #0ea5e9;padding:16px;border-radius:4px;">
          <p style="margin:0;color:#6b7280;font-size:13px;">Your message:</p>
          <p style="margin:8px 0 0 0;white-space:pre-wrap;">${message}</p>
        </div>
      </div>
    </body></html>`);

    return jsonResponse({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact email error:', err);
    return jsonResponse({ error: 'Failed to send message. Please try again.' }, 500);
  }
});
