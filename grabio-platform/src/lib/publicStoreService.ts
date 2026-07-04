/**
 * Public storefront reads — Supabase when VITE_USE_SUPABASE=true, else Firestore.
 */
import type { Product, Store } from '@/types/product';
import { useSupabase } from '@/lib/ecosystemFlags';
import { supabase } from '@/lib/supabase';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

type StoreRow = Record<string, unknown> & {
  id: string;
  firebase_id?: string | null;
  owner_id?: string;
  slug?: string;
  name?: string;
  store_profiles?: Record<string, unknown> | Record<string, unknown>[] | null;
};

export type ResolvedPublicStore = {
  store: Store;
  /** Supabase stores.id (UUID) */
  storeUuid: string;
  /** Firestore-era storeProfiles doc id — used in product.storeId */
  legacyStoreId: string;
};

function profileOf(row: StoreRow): Record<string, unknown> {
  const p = row.store_profiles;
  if (Array.isArray(p)) return (p[0] as Record<string, unknown>) || {};
  return (p as Record<string, unknown>) || {};
}

export function mapSupabaseRowToStore(row: StoreRow): Store {
  const profile = profileOf(row);
  const theme = (profile.theme as Record<string, unknown>) || {};
  const contact = (profile.contact as Record<string, unknown>) || {};
  const about = (profile.about as Record<string, unknown>) || {};
  const legacyId = String(row.firebase_id || row.id);

  return {
    id: legacyId,
    name: String(row.name || profile.store_name || 'Store'),
    slug: String(profile.slug || row.slug || legacyId),
    description: String(row.description || about.aboutUs || ''),
    logo: String(row.logo_url || ''),
    location: String(row.address || row.city || ''),
    website: String(profile.website_url || ''),
    slogan: String(profile.slogan || ''),
    aboutUs: String(about.aboutUs || ''),
    mission: String(about.mission || ''),
    vision: String(about.vision || ''),
    phone: String(row.phone || contact.phone || ''),
    email: String(row.email || contact.email || profile.pro_email || ''),
    facebook: String(contact.facebook || ''),
    instagram: String(contact.instagram || ''),
    twitter: String(contact.twitter || ''),
    status: row.status === 'active' || row.status === 'online' ? 'online' : 'offline',
    ownerId: String(row.owner_id || profile.owner_id || ''),
    template: (theme.template as Store['template']) || 'default',
    templateColors: theme.templateColors as Store['templateColors'],
    sectionOrder: profile.sections as Store['sectionOrder'],
    carouselImages: (profile.hero as { carouselImages?: string[] })?.carouselImages,
    galleryImages: profile.gallery as string[],
    subscriptionTier: profile.subscription_tier as Store['subscriptionTier'],
    subscriptionStatus: profile.subscription_status as Store['subscriptionStatus'],
    customDomain: profile.custom_domain as string | undefined,
    customDomainStatus: profile.custom_domain_status as Store['customDomainStatus'],
    paymentGatewaySettings: profile.payment_gateway_settings as Store['paymentGatewaySettings'],
    seoSettings: profile.seo as Store['seoSettings'],
    isPremium: profile.subscription_tier === 'pro' || profile.subscription_tier === 'business',
  };
}

function mapSupabaseProduct(
  row: Record<string, unknown>,
  legacyStoreId: string,
  storeInfo: Pick<Store, 'id' | 'name' | 'slug'>,
): Product {
  return {
    id: String(row.firebase_id || row.id),
    storeId: legacyStoreId,
    name: String(row.name || ''),
    description: String(row.description || ''),
    price: Number(row.price) || 0,
    image: String(row.image_url || ''),
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    category: String(row.category || ''),
    stock: Number(row.stock) || 0,
    trackStock: row.track_stock !== false,
    status: String(row.status || 'active'),
    store: storeInfo,
  } as Product;
}

async function resolveFromSupabase(identifier: string): Promise<ResolvedPublicStore | null> {
  const select = '*, store_profiles(*)';

  const attempts = [
    () => supabase.from('stores').select(select).eq('slug', identifier).maybeSingle(),
    () => supabase.from('stores').select(select).eq('firebase_id', identifier).maybeSingle(),
  ];

  for (const run of attempts) {
    const { data } = await run();
    if (data) {
      const row = data as StoreRow;
      return {
        store: mapSupabaseRowToStore(row),
        storeUuid: row.id,
        legacyStoreId: String(row.firebase_id || row.id),
      };
    }
  }

  const { data: profileMatch } = await supabase
    .from('store_profiles')
    .select('*, stores(*)')
    .eq('slug', identifier)
    .maybeSingle();

  if (profileMatch?.stores) {
    const storeRow = profileMatch.stores as StoreRow;
    const merged: StoreRow = {
      ...storeRow,
      store_profiles: profileMatch as Record<string, unknown>,
    };
    return {
      store: mapSupabaseRowToStore(merged),
      storeUuid: storeRow.id,
      legacyStoreId: String(storeRow.firebase_id || storeRow.id),
    };
  }

  return null;
}

async function resolveFromFirestore(identifier: string): Promise<ResolvedPublicStore | null> {
  const db = getFirestore();
  const storesRef = collection(db, 'storeProfiles');
  const slugSnap = await getDocs(query(storesRef, where('slug', '==', identifier)));
  let docId = identifier;
  let storeData: Record<string, unknown> | null = null;

  if (!slugSnap.empty) {
    docId = slugSnap.docs[0].id;
    storeData = slugSnap.docs[0].data();
  } else {
    const direct = await getDoc(doc(db, 'storeProfiles', identifier));
    if (!direct.exists()) return null;
    docId = identifier;
    storeData = direct.data();
  }

  return {
    store: { id: docId, ...storeData } as Store,
    storeUuid: docId,
    legacyStoreId: docId,
  };
}

export async function resolvePublicStore(identifier: string): Promise<ResolvedPublicStore | null> {
  if (!identifier?.trim()) return null;
  if (useSupabase()) return resolveFromSupabase(identifier.trim());
  return resolveFromFirestore(identifier.trim());
}

export async function resolveStoreByCustomDomain(hostname: string): Promise<ResolvedPublicStore | null> {
  if (useSupabase()) {
    const { data } = await supabase
      .from('store_profiles')
      .select('*, stores(*)')
      .eq('custom_domain', hostname)
      .maybeSingle();
    if (!data?.stores) return null;
    const storeRow = data.stores as StoreRow;
    return {
      store: mapSupabaseRowToStore({ ...storeRow, store_profiles: data as Record<string, unknown> }),
      storeUuid: storeRow.id,
      legacyStoreId: String(storeRow.firebase_id || storeRow.id),
    };
  }

  const db = getFirestore();
  const snap = await getDocs(
    query(collection(db, 'storeProfiles'), where('customDomain', '==', hostname)),
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  return {
    store: { id: docSnap.id, ...data } as Store,
    storeUuid: docSnap.id,
    legacyStoreId: docSnap.id,
  };
}

export async function listPublicStores(): Promise<Store[]> {
  if (useSupabase()) {
    const { data, error } = await supabase
      .from('stores')
      .select('*, store_profiles(*)')
      .eq('status', 'active')
      .order('name');
    if (error) {
      console.error('[publicStoreService] list stores', error.message);
      return [];
    }
    return (data as StoreRow[]).map(mapSupabaseRowToStore).filter((s) => s.status === 'online');
  }

  const db = getFirestore();
  const snap = await getDocs(collection(db, 'storeProfiles'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Store))
    .filter((s) => s.status === 'online');
}

export async function listPublicProducts(): Promise<Product[]> {
  if (useSupabase()) {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, stores(id, name, slug, firebase_id, status)')
      .eq('status', 'active');
    if (error || !products) {
      console.error('[publicStoreService] list products', error?.message);
      return [];
    }

    return products
      .filter((p) => {
        const store = p.stores as { status?: string } | null;
        return !store || store.status === 'active';
      })
      .map((p) => {
        const store = p.stores as { id: string; name: string; slug?: string; firebase_id?: string } | null;
        const legacyStoreId = String(store?.firebase_id || store?.id || p.store_id);
        return mapSupabaseProduct(p, legacyStoreId, {
          id: legacyStoreId,
          name: store?.name || 'Store',
          slug: store?.slug,
        });
      });
  }

  const db = getFirestore();
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function fetchPublicStoreProducts(
  storeUuid: string,
  legacyStoreId: string,
  storeInfo: Pick<Store, 'id' | 'name' | 'slug'>,
): Promise<Product[]> {
  if (useSupabase()) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeUuid)
      .eq('status', 'active');
    if (error || !data) return [];
    return data.map((row) => mapSupabaseProduct(row, legacyStoreId, storeInfo));
  }

  const db = getFirestore();
  const snap = await getDocs(
    query(collection(db, 'products'), where('storeId', '==', legacyStoreId)),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    store: storeInfo,
  })) as Product[];
}

export async function countPublicStoreProducts(legacyStoreId: string): Promise<number> {
  if (useSupabase()) {
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('firebase_id', legacyStoreId)
      .maybeSingle();
    if (!store) return 0;
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);
    return count ?? 0;
  }

  const db = getFirestore();
  const snap = await getDocs(query(collection(db, 'products'), where('storeId', '==', legacyStoreId)));
  return snap.size;
}
