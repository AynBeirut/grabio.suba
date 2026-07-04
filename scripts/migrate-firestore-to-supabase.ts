/**
 * Firestore → Supabase Migration Script
 *
 * Prerequisites:
 *   - grabio-platform/.env with VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - Firebase credentials: scripts/firebase-service-account.json OR
 *     GOOGLE_APPLICATION_CREDENTIALS (firebase login / ADC)
 *   - Run migration 20260704000005_firebase_id_indexes.sql in Supabase SQL Editor
 *
 * Usage:
 *   cd suba\ eco\ sys/scripts && npm install
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/anwar_abouhassan_gmail.com_application_default_credentials.json
 *   npm run migrate:dry
 *   npm run migrate:all
 */

import * as admin from 'firebase-admin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../grabio-platform/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'market-flow-7b074';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MIGRATE_ALL = args.includes('--all');
const COLLECTIONS_ARG = args.find((a) => a.startsWith('--collections='));
const TARGET_COLLECTIONS = COLLECTIONS_ARG
  ? COLLECTIONS_ARG.replace('--collections=', '').split(',')
  : MIGRATE_ALL
    ? ['users', 'storeProfiles', 'products', 'orders', 'customers']
    : [];

function initFirebase() {
  if (admin.apps.length) return;

  const saPath = path.join(__dirname, 'firebase-service-account.json');
  if (fs.existsSync(saPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(saPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID,
    });
    console.log('   Firebase: service account JSON');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
  console.log('   Firebase: application default credentials');
}

const firestore = () => admin.firestore();
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** firebase storeProfile doc id → Supabase stores.id */
const storeUuidByFirebaseId = new Map<string, string>();
/** firebase auth uid → Supabase users.id */
const userUuidByFirebaseUid = new Map<string, string>();

async function resolveUserUuid(firebaseUid: string, emailHint?: string | null): Promise<string | null> {
  if (userUuidByFirebaseUid.has(firebaseUid)) {
    return userUuidByFirebaseUid.get(firebaseUid)!;
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (existing?.id) {
    userUuidByFirebaseUid.set(firebaseUid, existing.id);
    return existing.id;
  }

  let email = emailHint?.trim() || '';
  if (!email) {
    const userDoc = await firestore().collection('users').doc(firebaseUid).get();
    email = String(userDoc.data()?.email || '').trim();
  }
  if (!email) {
    email = `${firebaseUid}@migrate.grabio.local`;
  }

  if (DRY_RUN) {
    const fake = `00000000-0000-4000-8000-${firebaseUid.slice(0, 12).padEnd(12, '0')}`;
    userUuidByFirebaseUid.set(firebaseUid, fake);
    return fake;
  }

  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { firebase_uid: firebaseUid, migrated: true },
  });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const users = list?.users ?? [];
        const found = users.find(
          (u) => u.user_metadata?.firebase_uid === firebaseUid || u.email === email,
        );
        if (found) {
        userUuidByFirebaseUid.set(firebaseUid, found.id);
        await supabase.from('users').upsert(
          {
            id: found.id,
            email: found.email || email,
            firebase_uid: firebaseUid,
            role: 'merchant',
          },
          { onConflict: 'id' },
        );
        return found.id;
      }
    }
    console.error(`   ❌ Auth user ${firebaseUid}:`, authErr.message);
    return null;
  }

  const uid = authUser.user!.id;
  userUuidByFirebaseUid.set(firebaseUid, uid);
  await supabase.from('users').upsert(
    {
      id: uid,
      email: authUser.user!.email || email,
      display_name: authUser.user!.user_metadata?.display_name || null,
      firebase_uid: firebaseUid,
      role: 'merchant',
    },
    { onConflict: 'id' },
  );
  return uid;
}

function slugify(input: string, fallback: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || fallback;
}

async function migrateStoreProfiles() {
  console.log('\n🔄 Migrating: storeProfiles → stores + store_profiles');
  const snapshot = await firestore().collection('storeProfiles').get();
  console.log(`   Found ${snapshot.size} documents`);

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would upsert ${snapshot.size} stores`);
    for (const doc of snapshot.docs) {
      storeUuidByFirebaseId.set(doc.id, doc.id);
    }
    return { success: snapshot.size, errors: 0 };
  }

  let success = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const firebaseStoreId = doc.id;
    const ownerFirebaseUid = String(data.ownerId || data.userId || firebaseStoreId);
    const ownerId = await resolveUserUuid(ownerFirebaseUid, data.email || data.proEmail);

    if (!ownerId) {
      errors++;
      continue;
    }

    const slug = slugify(String(data.slug || data.name || ''), firebaseStoreId.slice(0, 8));
    const storeRow = {
      owner_id: ownerId,
      slug: `${slug}-${firebaseStoreId.slice(0, 6)}`,
      name: data.name || data.storeName || 'Unnamed Store',
      name_ar: data.nameAr || null,
      description: data.description || data.aboutUs || null,
      logo_url: data.logo || data.logoUrl || null,
      cover_url: data.storeBackgroundImage || data.coverImage || null,
      phone: data.phone || null,
      whatsapp: data.whatsappBusiness || data.whatsapp || null,
      email: data.email || data.proEmail || null,
      address: data.location || data.address || null,
      city: data.city || null,
      country: data.country || 'LB',
      currency: data.currency || 'LBP',
      status: data.status === 'offline' ? 'suspended' : 'active',
      plan: data.subscriptionTier || data.plan || 'free',
      firebase_id: firebaseStoreId,
      settings: {
        template: data.template,
        templateColors: data.templateColors,
        sectionOrder: data.sectionOrder,
        storefrontMode: data.storefrontMode,
      },
      updated_at: new Date().toISOString(),
    };

    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .upsert(storeRow, { onConflict: 'firebase_id' })
      .select('id')
      .single();

    if (storeErr || !store) {
      console.error(`   ❌ store ${firebaseStoreId}:`, storeErr?.message);
      errors++;
      continue;
    }

    storeUuidByFirebaseId.set(firebaseStoreId, store.id);

    const profileRow = {
      store_id: store.id,
      owner_id: ownerId,
      slug: data.slug || slug,
      store_name: data.name || null,
      business_name: data.businessName || data.name || null,
      pro_email: data.proEmail || null,
      email: data.email || null,
      owner_email: data.email || null,
      website_url: data.website || null,
      subscription_status: data.subscriptionStatus || 'inactive',
      subscription_tier: data.subscriptionTier || 'trial',
      subscription_plan: data.subscriptionPlan || null,
      subscription_ends_at: data.subscriptionEndsAt || null,
      is_trial_user: data.subscriptionStatus === 'trial',
      has_used_trial: data.hasUsedTrial ?? false,
      is_legacy_user: data.isLegacyUser ?? false,
      trial_started_at: data.trialStartedAt || data.trial_start_date || null,
      trial_ends_at: data.trialEndsAt || data.trial_end_date || null,
      product_limit: data.productLimit ?? null,
      storage_limit_mb: data.storageLimitMb ?? data.storage_limit_mb ?? null,
      monthly_operations_limit: data.monthlyOperationsLimit ?? data.monthly_operations_limit ?? 200,
      revenue_share_percentage: data.revenueSharePercentage ?? data.revenue_share_percentage ?? 0,
      theme: {
        template: data.template,
        templateColors: data.templateColors,
        productDisplayType: data.productDisplayType,
        heroLayout: data.heroLayout,
        menuStyle: data.menuStyle,
      },
      sections: data.sectionOrder || [],
      hero: { carouselImages: data.carouselImages || [] },
      about: { aboutUs: data.aboutUs, mission: data.mission, vision: data.vision },
      contact: {
        phone: data.phone,
        email: data.email,
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
      },
      delivery: data.deliverySettings || {},
      gallery: data.galleryImages || [],
      seo: data.seoSettings || {},
      custom_domain: data.customDomain || null,
      payment_gateway_settings: data.paymentGatewaySettings || {},
      ai_settings: data.aiIntegrationSettings || {},
      updated_at: new Date().toISOString(),
    };

    const { error: profileErr } = await supabase
      .from('store_profiles')
      .upsert(profileRow, { onConflict: 'store_id' });

    if (profileErr) {
      console.error(`   ❌ profile ${firebaseStoreId}:`, profileErr.message);
      errors++;
    } else {
      success++;
    }
  }

  console.log(`   ✅ Done: ${success} stores, ${errors} errors`);
  return { success, errors };
}

async function loadStoreIdMap() {
  const { data } = await supabase.from('stores').select('id, firebase_id');
  for (const row of data || []) {
    if (row.firebase_id) storeUuidByFirebaseId.set(row.firebase_id, row.id);
  }
}

async function migrateProducts() {
  console.log('\n🔄 Migrating: products');
  if (storeUuidByFirebaseId.size === 0) await loadStoreIdMap();

  const snapshot = await firestore().collection('products').get();
  console.log(`   Found ${snapshot.size} documents`);

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would upsert ${snapshot.size} products`);
    return { success: snapshot.size, errors: 0 };
  }

  let success = 0;
  let errors = 0;
  const BATCH = 100;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const rows = [];

    for (const doc of batch) {
      const data = doc.data();
      const storeFirebaseId = String(data.storeId || '');
      const storeId = storeUuidByFirebaseId.get(storeFirebaseId);
      if (!storeId) {
        errors++;
        continue;
      }

      rows.push({
        store_id: storeId,
        firebase_id: doc.id,
        name: data.name || 'Unnamed Product',
        name_ar: data.nameAr || null,
        description: data.description || null,
        price: parseFloat(String(data.price)) || 0,
        compare_price: data.comparePrice ? parseFloat(String(data.comparePrice)) : null,
        cost_price: data.costPrice ? parseFloat(String(data.costPrice)) : null,
        sku: data.sku || null,
        barcode: data.barcode || null,
        category: data.category || null,
        image_url: data.image || data.imageUrl || null,
        images: Array.isArray(data.images) ? data.images : [],
        stock: parseInt(String(data.stock), 10) || 0,
        track_stock: data.trackStock !== false,
        status: data.status || 'active',
        tags: Array.isArray(data.tags) ? data.tags : [],
        attributes: data.attributes || {},
        updated_at: new Date().toISOString(),
      });
    }

    if (rows.length === 0) continue;

    const { error } = await supabase.from('products').upsert(rows, { onConflict: 'firebase_id' });
    if (error) {
      console.error(`   ❌ batch error:`, error.message);
      errors += batch.length;
    } else {
      success += rows.length;
      process.stdout.write(`   ✅ ${success}/${docs.length}\r`);
    }
  }

  console.log(`   ✅ Done: ${success} products, ${errors} errors`);
  return { success, errors };
}

async function migrateOrders() {
  console.log('\n🔄 Migrating: orders');
  if (storeUuidByFirebaseId.size === 0) await loadStoreIdMap();

  const snapshot = await firestore().collection('orders').get();
  console.log(`   Found ${snapshot.size} documents`);

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would upsert ${snapshot.size} orders`);
    return { success: snapshot.size, errors: 0 };
  }

  let success = 0;
  let errors = 0;
  const BATCH = 50;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const rows = [];

    for (const doc of batch) {
      const data = doc.data();
      const storeFirebaseId = String(data.storeId || '');
      const storeId = storeUuidByFirebaseId.get(storeFirebaseId);
      if (!storeId) {
        errors++;
        continue;
      }

      rows.push({
        store_id: storeId,
        firebase_id: doc.id,
        order_number: String(data.orderNumber || data.id || doc.id),
        customer_name: data.customerName || data.name || null,
        customer_phone: data.customerPhone || data.phone || null,
        customer_email: data.customerEmail || data.email || null,
        customer_address: data.address || data.deliveryAddress || null,
        items: data.items || data.orderItems || [],
        subtotal: parseFloat(String(data.subtotal)) || 0,
        delivery_fee: parseFloat(String(data.deliveryFee)) || 0,
        discount: parseFloat(String(data.discount)) || 0,
        total: parseFloat(String(data.total)) || 0,
        currency: data.currency || 'LBP',
        status: data.status || 'pending',
        payment_method: data.paymentMethod || null,
        payment_status: data.paymentStatus || 'unpaid',
        notes: data.notes || null,
        source: data.source || 'web',
        updated_at: new Date().toISOString(),
      });
    }

    if (rows.length === 0) continue;

    const { error } = await supabase.from('orders').upsert(rows, { onConflict: 'firebase_id' });
    if (error) {
      console.error(`   ❌ batch error:`, error.message);
      errors += batch.length;
    } else {
      success += rows.length;
    }
  }

  console.log(`   ✅ Done: ${success} orders, ${errors} errors`);
  return { success, errors };
}

async function migrateCustomers() {
  console.log('\n🔄 Migrating: customers');
  if (storeUuidByFirebaseId.size === 0) await loadStoreIdMap();

  const snapshot = await firestore().collection('customers').get();
  console.log(`   Found ${snapshot.size} documents`);

  if (DRY_RUN) {
    return { success: snapshot.size, errors: 0 };
  }

  let success = 0;
  let errors = 0;
  const rows = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const storeId = storeUuidByFirebaseId.get(String(data.storeId || ''));
    if (!storeId) {
      errors++;
      continue;
    }
    rows.push({
      store_id: storeId,
      firebase_id: doc.id,
      name: data.name || 'Customer',
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
      tags: data.tags || [],
      total_orders: data.totalOrders || 0,
      total_spent: parseFloat(String(data.totalSpent)) || 0,
    });
  }

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('customers').upsert(chunk, { onConflict: 'firebase_id' });
    if (error) {
      console.error(`   ❌`, error.message);
      errors += chunk.length;
    } else {
      success += chunk.length;
    }
  }

  console.log(`   ✅ Done: ${success} customers, ${errors} errors`);
  return { success, errors };
}

async function migrateUsers() {
  console.log('\n🔄 Migrating: users (auth + public.users)');
  const snapshot = await firestore().collection('users').get();
  console.log(`   Found ${snapshot.size} documents`);

  if (DRY_RUN) {
    return { success: snapshot.size, errors: 0 };
  }

  let success = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = await resolveUserUuid(doc.id, data.email);
    if (uid) {
      await supabase.from('users').upsert(
        {
          id: uid,
          email: data.email || `${doc.id}@migrate.grabio.local`,
          display_name: data.displayName || data.name || null,
          role: data.role || 'merchant',
          firebase_uid: doc.id,
        },
        { onConflict: 'id' },
      );
      success++;
    } else {
      errors++;
    }
  }

  console.log(`   ✅ Done: ${success} users, ${errors} errors`);
  return { success, errors };
}

const RUNNERS: Record<string, () => Promise<{ success: number; errors: number }>> = {
  users: migrateUsers,
  storeProfiles: migrateStoreProfiles,
  products: migrateProducts,
  orders: migrateOrders,
  customers: migrateCustomers,
};

async function main() {
  if (TARGET_COLLECTIONS.length === 0) {
    console.error('❌ Use --all or --collections=users,storeProfiles,products,orders');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase env in grabio-platform/.env');
    process.exit(1);
  }

  initFirebase();

  console.log('🚀 Grabio Firestore → Supabase Migration');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Collections: ${TARGET_COLLECTIONS.join(', ')}`);

  const results: Record<string, { success: number; errors: number }> = {};
  const order = ['users', 'storeProfiles', 'products', 'orders', 'customers'];

  for (const col of order) {
    if (!TARGET_COLLECTIONS.includes(col)) continue;
    results[col] = await RUNNERS[col]();
  }

  console.log('\n📊 Summary:');
  for (const [col, res] of Object.entries(results)) {
    console.log(`   ${res.errors === 0 ? '✅' : '⚠️'} ${col}: ${res.success} ok, ${res.errors} errors`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
