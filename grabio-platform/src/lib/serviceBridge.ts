/**
 * Service Bridge — Routes all data operations to either Firebase or Supabase
 * based on the VITE_USE_SUPABASE feature flag.
 *
 * During the 1-week parallel test:
 *   VITE_USE_SUPABASE=false → Firebase (production, default)
 *   VITE_USE_SUPABASE=true  → Supabase (test on grabio.online)
 *
 * After migration is confirmed:
 *   Remove Firebase paths and use Supabase directly.
 */

import { useSupabase } from './ecosystemFlags';

// Lazy-loaded modules to avoid importing unused backend
let _firebaseService: typeof import('./firebase') | null = null;
let _supabaseService: typeof import('./supabaseService') | null = null;

async function getFirebase() {
  if (!_firebaseService) {
    _firebaseService = await import('./firebase');
  }
  return _firebaseService;
}

async function getSupabase() {
  if (!_supabaseService) {
    _supabaseService = await import('./supabaseService');
  }
  return _supabaseService;
}

function getApiBase(): string {
  if (useSupabase()) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1`;
  }
  return import.meta.env.VITE_API_BASE_URL || 'https://us-central1-market-flow-7b074.cloudfunctions.net/api';
}

// ============================================================
// AUTH
// ============================================================

export async function getCurrentUser() {
  if (useSupabase()) {
    const { getCurrentUser } = await import('./supabase');
    return getCurrentUser();
  }
  const fb = await getFirebase();
  return fb.auth.currentUser;
}

export async function getAuthToken(): Promise<string | null> {
  if (useSupabase()) {
    const { supabase } = await import('./supabase');
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }
  const fb = await getFirebase();
  return fb.auth.currentUser?.getIdToken() || null;
}

export async function signInWithGoogle() {
  if (useSupabase()) {
    const { signInWithGoogle } = await import('./supabase');
    return signInWithGoogle();
  }
  const fb = await getFirebase();
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  return signInWithPopup(fb.auth, new GoogleAuthProvider());
}

export async function signOut() {
  if (useSupabase()) {
    const { signOut } = await import('./supabase');
    return signOut();
  }
  const fb = await getFirebase();
  return fb.auth.signOut();
}

// ============================================================
// STORES
// ============================================================

export async function getStoreBySlug(slug: string) {
  if (useSupabase()) {
    const svc = await getSupabase();
    return svc.getStoreBySlug(slug);
  }
  const fb = await getFirebase();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(fb.db, 'stores'), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return { data: null, error: { message: 'Store not found' } };
  const doc = snap.docs[0];
  return { data: { id: doc.id, ...doc.data() }, error: null };
}

export async function getStoresByOwner(ownerId: string) {
  if (useSupabase()) {
    const svc = await getSupabase();
    return svc.getStoresByOwner(ownerId);
  }
  const fb = await getFirebase();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(fb.db, 'stores'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })), error: null };
}

// ============================================================
// PRODUCTS
// ============================================================

export async function getProductsByStore(storeId: string) {
  if (useSupabase()) {
    const svc = await getSupabase();
    return svc.getProductsByStore(storeId);
  }
  const fb = await getFirebase();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(fb.db, 'products'), where('storeId', '==', storeId));
  const snap = await getDocs(q);
  return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })), error: null };
}

export async function getProductById(productId: string) {
  if (useSupabase()) {
    const svc = await getSupabase();
    return svc.getProductById(productId);
  }
  const fb = await getFirebase();
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(fb.db, 'products', productId));
  if (!snap.exists()) return { data: null, error: { message: 'Product not found' } };
  return { data: { id: snap.id, ...snap.data() }, error: null };
}

// ============================================================
// ORDERS
// ============================================================

export async function getOrdersByStore(storeId: string) {
  if (useSupabase()) {
    const svc = await getSupabase();
    return svc.getOrdersByStore(storeId);
  }
  const fb = await getFirebase();
  const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
  const q = query(
    collection(fb.db, 'orders'),
    where('storeId', '==', storeId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })), error: null };
}

// ============================================================
// API CALLS (checkout, subscription, etc.)
// ============================================================

export async function apiCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: unknown,
) {
  const token = await getAuthToken();
  const base = getApiBase();
  const url = `${base}/${endpoint.replace(/^\//, '')}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });

  return response.json();
}

export async function checkout(items: unknown[], deliveryInfo: unknown) {
  return apiCall('checkout', 'POST', { items, deliveryInfo });
}

export async function startTrial(userId: string, email: string) {
  return apiCall('subscription/trial', 'POST', { userId, email });
}

export async function subscribe(params: {
  userId: string; email: string; tier: string;
  billing: string; addOns?: unknown;
}) {
  return apiCall('subscription/subscribe', 'POST', params);
}

export async function cancelSubscription(userId: string) {
  return apiCall('subscription/cancel', 'POST', { userId });
}

export async function getSubscriptionInfo(userId?: string) {
  const endpoint = userId ? `subscription/info?userId=${userId}` : 'subscription/info';
  return apiCall(endpoint, 'GET');
}
