import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

type Result<T> = { data: T; error: null } | { data: null; error: PostgrestError };

// ============================================================
// STORES
// ============================================================

export async function getStoreBySlug(slug: string) {
  return supabase
    .from('stores')
    .select('*, store_profiles(*)')
    .eq('slug', slug)
    .single();
}

export async function getStoresByOwner(ownerId: string) {
  return supabase
    .from('stores')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
}

export async function createStore(store: {
  owner_id: string;
  slug: string;
  name: string;
  name_ar?: string;
  category?: string;
  currency?: string;
  country?: string;
}) {
  return supabase.from('stores').insert(store).select().single();
}

export async function updateStore(storeId: string, updates: Record<string, unknown>) {
  return supabase.from('stores').update(updates).eq('id', storeId).select().single();
}

// ============================================================
// STORE PROFILES
// ============================================================

export async function getStoreProfile(storeId: string) {
  return supabase.from('store_profiles').select('*').eq('store_id', storeId).single();
}

export async function upsertStoreProfile(storeId: string, profile: Record<string, unknown>) {
  return supabase
    .from('store_profiles')
    .upsert({ store_id: storeId, ...profile }, { onConflict: 'store_id' })
    .select()
    .single();
}

// ============================================================
// PRODUCTS
// ============================================================

export async function getProductsByStore(storeId: string, status?: string) {
  let q = supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  return q;
}

export async function getProductById(productId: string) {
  return supabase.from('products').select('*').eq('id', productId).single();
}

export async function createProduct(product: {
  store_id: string;
  name: string;
  price: number;
  [key: string]: unknown;
}) {
  return supabase.from('products').insert(product).select().single();
}

export async function updateProduct(productId: string, updates: Record<string, unknown>) {
  return supabase.from('products').update(updates).eq('id', productId).select().single();
}

export async function deleteProduct(productId: string) {
  return supabase.from('products').delete().eq('id', productId);
}

// ============================================================
// ORDERS
// ============================================================

export async function getOrdersByStore(storeId: string, limit = 50) {
  return supabase
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function getOrderById(orderId: string) {
  return supabase.from('orders').select('*').eq('id', orderId).single();
}

export async function createOrder(order: {
  store_id: string;
  order_number: string;
  total: number;
  items: unknown[];
  [key: string]: unknown;
}) {
  return supabase.from('orders').insert(order).select().single();
}

export async function updateOrderStatus(orderId: string, status: string) {
  return supabase.from('orders').update({ status }).eq('id', orderId).select().single();
}

// ============================================================
// CUSTOMERS
// ============================================================

export async function getCustomersByStore(storeId: string) {
  return supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
}

export async function createCustomer(customer: {
  store_id: string;
  name: string;
  [key: string]: unknown;
}) {
  return supabase.from('customers').insert(customer).select().single();
}

export async function updateCustomer(customerId: string, updates: Record<string, unknown>) {
  return supabase.from('customers').update(updates).eq('id', customerId).select().single();
}

// ============================================================
// USERS
// ============================================================

export async function getUserProfile(userId: string) {
  return supabase.from('users').select('*').eq('id', userId).single();
}

export async function upsertUserProfile(userId: string, profile: {
  email: string;
  display_name?: string;
  avatar_url?: string;
  phone?: string;
}) {
  return supabase
    .from('users')
    .upsert({ id: userId, ...profile }, { onConflict: 'id' })
    .select()
    .single();
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================

export async function getActiveSubscription(userId: string) {
  return supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
}

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

export function subscribeToOrders(storeId: string, callback: (payload: unknown) => void) {
  return supabase
    .channel(`orders:${storeId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
      callback,
    )
    .subscribe();
}

export function subscribeToProducts(storeId: string, callback: (payload: unknown) => void) {
  return supabase
    .channel(`products:${storeId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${storeId}` },
      callback,
    )
    .subscribe();
}
