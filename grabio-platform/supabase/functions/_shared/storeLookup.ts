import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Firebase used storeProfiles/{ownerUserId}. Resolve store + profile by owner auth id. */
export async function getStoreProfileByOwnerId(db: SupabaseClient, ownerId: string) {
  const { data: store } = await db
    .from('stores')
    .select('id, owner_id, slug, name, email')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!store) return { store: null, profile: null };

  const { data: profile } = await db
    .from('store_profiles')
    .select('*')
    .eq('store_id', store.id)
    .maybeSingle();

  return { store, profile };
}

export async function getStoreProfileByStoreId(db: SupabaseClient, storeId: string) {
  const { data: store } = await db
    .from('stores')
    .select('id, owner_id, slug, name, email')
    .eq('id', storeId)
    .maybeSingle();

  if (!store) return { store: null, profile: null };

  const { data: profile } = await db
    .from('store_profiles')
    .select('*')
    .eq('store_id', store.id)
    .maybeSingle();

  return { store, profile };
}
