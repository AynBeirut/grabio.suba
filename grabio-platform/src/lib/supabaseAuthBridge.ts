import { supabase } from '@/lib/supabase';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { User, UserRole } from '@/types/product';

export async function resolveSupabaseAppUser(authUser: SupabaseAuthUser): Promise<User> {
  const uid = authUser.id;
  const firebaseUid =
    (authUser.user_metadata?.firebase_uid as string | undefined) ||
    authUser.user_metadata?.sub ||
    uid;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  let role: UserRole = (profile?.role as UserRole) || 'user';
  let storeId: string | undefined;
  let name =
    profile?.display_name ||
    authUser.user_metadata?.full_name ||
    authUser.email?.split('@')[0] ||
    'User';

  const { data: sellerRow } = await supabase
    .from('firestore_archive')
    .select('data')
    .eq('collection', 'sellers')
    .eq('firebase_id', firebaseUid)
    .maybeSingle();

  const seller = sellerRow?.data as Record<string, unknown> | undefined;
  if (seller?.role) {
    role = seller.role as UserRole;
    storeId = String(seller.storeId || firebaseUid);
    name = String(seller.name || name);
    localStorage.setItem('sellerInfo', JSON.stringify({ ...seller, storeId }));
  } else {
    const { data: ownedStore } = await supabase
      .from('stores')
      .select('firebase_id')
      .eq('owner_id', uid)
      .limit(1)
      .maybeSingle();
    if (ownedStore?.firebase_id) {
      role = role === 'user' ? 'admin' : role;
      storeId = ownedStore.firebase_id;
    }
  }

  const { data: userArch } = await supabase
    .from('firestore_archive')
    .select('data')
    .eq('collection', 'users')
    .eq('firebase_id', firebaseUid)
    .maybeSingle();
  const userDoc = userArch?.data as Record<string, unknown> | undefined;
  if (userDoc?.role === 'sub_account' && userDoc.subAccountId) {
    const { data: subRow } = await supabase
      .from('firestore_archive')
      .select('data')
      .eq('collection', 'subAccounts')
      .eq('firebase_id', String(userDoc.subAccountId))
      .maybeSingle();
    const subAccount = subRow?.data as Record<string, unknown> | undefined;
    if (subAccount) {
      role = 'sub_account';
      storeId = String(subAccount.storeId || storeId);
      name = String(subAccount.name || name);
    }
  }

  return {
    id: firebaseUid,
    name,
    email: authUser.email || profile?.email || '',
    role,
    storeId,
    avatar:
      profile?.avatar_url ||
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=38B2AC&color=fff`,
    dailyAdsWatched: 0,
    lastAdWatchDate: new Date().toISOString().split('T')[0],
  };
}
