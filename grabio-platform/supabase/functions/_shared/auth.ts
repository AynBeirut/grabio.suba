import { getSupabaseForUser } from './supabaseAdmin.ts';
import { errorResponse } from './cors.ts';

export async function requireAuth(req: Request): Promise<{ userId: string; email: string } | Response> {
  const supabase = getSupabaseForUser(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return errorResponse('Unauthorized', 401);
  }
  return { userId: user.id, email: user.email || '' };
}

export async function optionalAuth(req: Request): Promise<{ userId: string | null; email: string }> {
  try {
    const supabase = getSupabaseForUser(req);
    const { data: { user } } = await supabase.auth.getUser();
    return { userId: user?.id || null, email: user?.email || '' };
  } catch {
    return { userId: null, email: '' };
  }
}
