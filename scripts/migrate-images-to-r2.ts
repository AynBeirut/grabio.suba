/**
 * Firebase Storage → Cloudflare R2 Image Migration Script
 * Downloads images from Firebase Storage and re-uploads to R2.
 * Updates Supabase DB rows with new R2 URLs.
 *
 * Usage:
 *   npx ts-node migrate-images-to-r2.ts --dry-run
 *   npx ts-node migrate-images-to-r2.ts
 */

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../grabio-platform/.env' });

const DRY_RUN = process.argv.includes('--dry-run');

// Firebase
const FIREBASE_SERVICE_ACCOUNT = require('./firebase-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT),
    storageBucket: 'market-flow-7b074.firebasestorage.app',
  });
}
const bucket = admin.storage().bucket();
const firestore = admin.firestore();

// Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Cloudflare R2
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_BUCKET = process.env.R2_BUCKET || 'grabio-media';
const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL!;

async function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would upload: ${key}`);
    return `${R2_PUBLIC_URL}/${key}`;
  }
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function migrateProductImages() {
  console.log('\n🖼️  Migrating product images...');
  const { data: products } = await supabase
    .from('products')
    .select('id, store_id, firebase_id, image_url, images')
    .not('image_url', 'is', null)
    .like('image_url', '%firebasestorage%');

  if (!products?.length) {
    console.log('   No Firebase Storage images found in products');
    return;
  }

  console.log(`   Found ${products.length} products with Firebase images`);
  let migrated = 0;

  for (const product of products) {
    try {
      // Migrate primary image
      if (product.image_url?.includes('firebasestorage')) {
        const buffer = await downloadBuffer(product.image_url);
        const ext = product.image_url.split('.').pop()?.split('?')[0] || 'jpg';
        const key = `stores/${product.store_id}/products/${product.firebase_id || product.id}/main.${ext}`;
        const newUrl = await uploadToR2(key, buffer, `image/${ext}`);

        if (!DRY_RUN) {
          await supabase
            .from('products')
            .update({ image_url: newUrl })
            .eq('id', product.id);
        }
      }
      migrated++;
      process.stdout.write(`   ✅ ${migrated}/${products.length}\r`);
    } catch (e) {
      console.error(`   ❌ Failed for product ${product.id}:`, e);
    }
  }
  console.log(`\n   Done: ${migrated} product images migrated`);
}

async function migrateStoreLogo() {
  console.log('\n🏪  Migrating store logos...');
  const { data: stores } = await supabase
    .from('stores')
    .select('id, firebase_id, logo_url, cover_url')
    .or('logo_url.like.%firebasestorage%,cover_url.like.%firebasestorage%');

  if (!stores?.length) {
    console.log('   No Firebase Storage logos found');
    return;
  }

  let migrated = 0;
  for (const store of stores) {
    try {
      const updates: Partial<{ logo_url: string; cover_url: string }> = {};

      if (store.logo_url?.includes('firebasestorage')) {
        const buffer = await downloadBuffer(store.logo_url);
        const key = `stores/${store.id}/logo.jpg`;
        updates.logo_url = await uploadToR2(key, buffer, 'image/jpeg');
      }

      if (store.cover_url?.includes('firebasestorage')) {
        const buffer = await downloadBuffer(store.cover_url);
        const key = `stores/${store.id}/cover.jpg`;
        updates.cover_url = await uploadToR2(key, buffer, 'image/jpeg');
      }

      if (Object.keys(updates).length && !DRY_RUN) {
        await supabase.from('stores').update(updates).eq('id', store.id);
      }

      migrated++;
    } catch (e) {
      console.error(`   ❌ Failed for store ${store.id}:`, e);
    }
  }
  console.log(`   Done: ${migrated} store logos/covers migrated`);
}

async function main() {
  console.log('🚀 Firebase Storage → Cloudflare R2 Image Migration');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  await migrateProductImages();
  await migrateStoreLogo();

  console.log('\n\n✅ Image migration complete');
}

main().catch(console.error);
