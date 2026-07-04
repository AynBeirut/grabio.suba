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

function getUserClient(req: Request) {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';
    const body = await req.json().catch(() => ({}));
    const db = getDb();

    if (path === 'models') {
      return jsonResponse({
        success: true,
        models: [
          { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', available: true },
          { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', available: true },
          { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', available: true },
        ],
      });
    }

    if (path === 'generate') {
      const { storeId, prompt, model } = body;
      if (!prompt) return jsonResponse({ error: 'Missing prompt' }, 400);

      const { data: profile } = await db.from('store_profiles')
        .select('ai_credits_remaining').eq('id', storeId || user.id).single();

      const credits = profile?.ai_credits_remaining ?? 0;
      if (credits <= 0) return jsonResponse({ error: 'Insufficient AI credits' }, 402);

      const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_KEY) return jsonResponse({ error: 'AI service not configured' }, 503);

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful e-commerce content assistant for the Grabio platform. Generate product descriptions, marketing copy, and store content.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1000,
        }),
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';

      await db.from('store_profiles')
        .update({ ai_credits_remaining: Math.max(0, credits - 1), updated_at: new Date().toISOString() })
        .eq('id', storeId || user.id);

      return jsonResponse({ success: true, content, creditsRemaining: credits - 1 });
    }

    if (path === 'settings') {
      const { storeId, settings } = body;
      await db.from('store_profiles')
        .update({ ai_settings: settings, updated_at: new Date().toISOString() })
        .eq('id', storeId || user.id);
      return jsonResponse({ success: true });
    }

    if (path === 'credits') {
      const storeId = body.storeId || user.id;
      const { data: profile } = await db.from('store_profiles')
        .select('ai_credits_remaining').eq('id', storeId).single();
      return jsonResponse({ success: true, credits: profile?.ai_credits_remaining ?? 0 });
    }

    return jsonResponse({ error: 'Unknown path. Use: models, generate, settings, credits' }, 400);
  } catch (err) {
    console.error('AI error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
