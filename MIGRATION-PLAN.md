# Grabio Ecosystem — Firebase → Supabase Migration Plan
> **Created:** Jul 4, 2026 | **Owner:** Anwar | **Status:** IN PROGRESS

---

## 1. Ecosystem Map

| App | Folder | Current Backend | Migration Target | Priority |
|---|---|---|---|---|
| **Grabio Main Platform** | `grabio-platform/` | Firebase (Auth + Firestore + Storage + Functions) | Supabase Auth + Postgres + R2 + Edge Functions | 🔴 P1 |
| **Finance App** | `finance/beirut-finance-flow-main/` | Supabase ✅ already | No change needed | ✅ Done |
| **Finance Mobile (TWA)** | `finance/twa/` | Firebase Auth (Google) | **KEEP on Firebase** — mobile auth stays | 🟢 Keep |
| **AI Builder** | `AI BUILDER/ai-builder/` | Prisma + SQLite (no Firebase) | No change needed | ✅ Done |
| **Publish Insight** | `publish-insight-main/` | Supabase ✅ already | No change needed | ✅ Done |
| **POS** | `ecosystem-plan/posfinal-main/` | Firebase | Supabase (LAST) | 🔵 P4 — after Windows builder |

---

## 2. What Stays on Firebase

- **Mobile apps auth only** — Finance TWA uses Firebase Google Auth → keep
- **FCM push notifications** — mobile push stays on Firebase
- **POS Firebase session** — until Windows builder upgrade completes

---

## 3. Target Architecture

```
Supabase (Postgres)         Cloudflare R2              Supabase Auth
├── All Grabio data         ├── Product images          ├── Google OAuth
├── Row Level Security      ├── Store logos             ├── Email/password
├── Realtime subscriptions  ├── User avatars            └── JWT tokens
└── Edge Functions          └── Builder assets
```

---

## 4. Firestore Collections → Postgres Tables

### Core Tables (Phase 1)
| Firestore Collection | Postgres Table | Notes |
|---|---|---|
| `users` | `users` | Extends `auth.users` via foreign key |
| `stores` | `stores` | Main merchant entity |
| `storeProfiles` | `store_profiles` | Merge with stores or separate JSONB col |
| `products` | `products` | Per-store products |
| `orders` | `orders` | Customer orders |
| `customers` | `customers` | Per-store customer CRM |
| `builders` | `builders` | Store builder/theme config |
| `subscriptions` (implicit) | `subscriptions` | Plan + billing |

### Business Operations (Phase 2)
| Firestore Collection | Postgres Table |
|---|---|
| `crmReps` | `crm_reps` |
| `crmActivities` | `crm_activities` |
| `purchaseOrders` | `purchase_orders` |
| `suppliers` | `suppliers` |
| `staff` | `staff` |
| `expenses` | `expenses` |
| `salaryPayments` | `salary_payments` |
| `rawMaterials` | `raw_materials` |
| `recipes` | `recipes` |
| `productionBatches` | `production_batches` |
| `finishedGoodsInventory` | `finished_goods_inventory` |
| `finishedGoodsTransactions` | `finished_goods_transactions` |
| `composedProducts` | `composed_products` |
| `cashCollections` | `cash_collections` |
| `accountPayments` | `account_payments` |

### Marketplace & Sync (Phase 3)
| Firestore Collection | Postgres Table |
|---|---|
| `marketplaceSyncJobs` | `marketplace_sync_jobs` |
| `marketplaceChannelSettings` | `marketplace_channel_settings` |
| `instagramShopConnectionJobs` | `instagram_shop_connection_jobs` |
| `metaAdsCampaignJobs` | `meta_ads_campaign_jobs` |
| `sellers` | `sellers` |
| `subAccounts` | `sub_accounts` |
| `aiCreditLedger` | `ai_credit_ledger` |
| `auditLogs` | `audit_logs` |
| `seo_events` | `seo_events` |
| `seo_leads` | `seo_leads` |

### POS (Phase 4 — LAST)
| Firestore Collection | Postgres Table |
|---|---|
| `posDevices` | `pos_devices` |
| `posPairingCodes` | `pos_pairing_codes` |
| `posOrdersByLocalSaleId` | `pos_orders_by_local_sale_id` |
| `orderNotifications` | `order_notifications` |

---

## 5. Image Migration — Firebase Storage → Cloudflare R2

### R2 Bucket Structure
```
grabio-media/
├── stores/{storeId}/logo.{ext}
├── stores/{storeId}/products/{productId}/{filename}
├── stores/{storeId}/builder/{sectionId}/{filename}
├── users/{userId}/avatar.{ext}
└── templates/{templateId}/{filename}
```

### R2 Upload Flow (already scaffolded in r2Upload.ts)
1. Client requests presigned URL from Supabase Edge Function `/r2/presign`
2. Edge Function validates JWT + generates S3-compatible presigned URL
3. Client uploads directly to R2
4. Edge Function stores public URL in Postgres

### Migration of Existing Images
- Export Firebase Storage → download locally → re-upload to R2
- Update all `storeProfile.logo`, `product.image`, `product.images[]` URLs in Firestore export
- Script: `suba eco sys/scripts/migrate-images-to-r2.ts`

---

## 6. Authentication Migration

### Firebase Auth → Supabase Auth
| Feature | Firebase | Supabase |
|---|---|---|
| Google OAuth | ✅ Used | ✅ Built-in |
| Email/Password | ✅ Used | ✅ Built-in |
| JWT tokens | Firebase ID tokens | Supabase JWT |
| Session persistence | localStorage | localStorage |
| Auth domain | Custom domain | Supabase URL or custom domain |

### Migration Strategy
- Supabase Auth handles new signups immediately
- Existing Firebase users: on first login, Supabase creates account linked by email
- Mobile apps (TWA): keep Firebase Auth, use a bridge token exchange endpoint

---

## 7. Firebase Functions → Supabase Edge Functions

### Functions to Migrate
| Firebase Function | Supabase Edge Function | Priority |
|---|---|---|
| POS sync API | `pos-sync` | P4 (last) |
| Builder transfer | `builder-transfer` | P2 |
| R2 presign | `r2-presign` | P1 |
| Order notifications | `order-notifications` | P2 |
| Marketplace sync | `marketplace-sync` | P3 |
| SEO tracking | `seo-track` | P3 |
| CRM sync | `crm-sync` | P2 |

---

## 8. Parallel Running Strategy (1 Week)

```
Week 1: Both systems live simultaneously
├── Firebase (current): All production traffic
├── Supabase (new): Test domain receives new signups
├── Dual-write flag: New data written to BOTH backends
└── Read from: Firebase (primary), Supabase (shadow)

Week 2: Flip the switch
├── Supabase becomes primary
├── Firebase becomes read-only fallback
└── POS still on Firebase (Phase 4)
```

### Feature Flag
```ts
// src/lib/ecosystemFlags.ts (already exists!)
export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';
```

---

## 9. Migration Phases

### Phase 1 — Foundation (Current)
- [x] Create `suba eco sys` folder with full ecosystem copy
- [ ] Set up Supabase project (user creates account → share credentials)
- [ ] Activate `supabase.ts` in grabio-platform (install `@supabase/supabase-js`)
- [ ] Deploy Supabase schema: users, stores, products, orders
- [ ] Activate R2 presign Edge Function
- [ ] Wire Supabase Auth with Google OAuth
- [ ] Test domain config: `.env.supabase`

### Phase 2 — Data Layer
- [ ] Migrate core collections to Postgres (stores, products, orders, customers)
- [ ] Row Level Security policies (per-store isolation)
- [ ] Migrate builder/theme config data
- [ ] Wire R2 for new image uploads

### Phase 3 — Business Features
- [ ] CRM, inventory, marketplace sync
- [ ] Supabase Edge Functions
- [ ] Parallel dual-write for 1 week
- [ ] Validate all features on test domain

### Phase 4 — POS (after Windows builder upgrade)
- [ ] POS device auth → Supabase
- [ ] POS sync API → Supabase Edge Function
- [ ] Decommission Firebase Functions

### Phase 5 — Shutdown Firebase
- [ ] Confirm 0 active Firebase reads
- [ ] Export final Firestore snapshot (archive)
- [ ] Disable Firebase project billing
- [ ] Keep Firebase Auth alive for mobile apps only

---

## 10. Test Domain

**Test domain: `grabio.online`** ✅

```env
# suba eco sys/grabio-platform/.env  (fill Supabase values when account is ready)
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_R2_UPLOAD_ENABLED=true
VITE_R2_PUBLIC_URL=https://media.grabio.online
VITE_USE_SUPABASE=true
VITE_APP_DOMAIN=grabio.online
VITE_APP_URL=https://grabio.online
VITE_FIREBASE_AUTH_DOMAIN=grabio.online
```

### DNS Setup for grabio.online
| Record | Type | Value | Purpose |
|---|---|---|---|
| `@` | A/CNAME | Vercel/hosting | Main Supabase app |
| `media` | CNAME | `[r2-bucket].r2.dev` | Cloudflare R2 public images |
| `api` | CNAME | `[project-ref].supabase.co` | (optional) Supabase vanity URL |

### Google OAuth — Add grabio.online
In Google Cloud Console → OAuth 2.0 → Authorized redirect URIs, add:
- `https://grabio.online/auth/callback`
- `https://[project-ref].supabase.co/auth/v1/callback`

---

## 11. What NOT to Touch

- ❌ Do not touch `the eco sys/` — that is the LIVE production source
- ❌ Do not change Firebase config in root workspace
- ❌ Do not deploy `suba eco sys` to production until 1-week test passes
- ❌ POS migration is LAST — after Windows builder upgrade completes

---

## 12. Risk Register

| Risk | Mitigation |
|---|---|
| Active clients break | Parallel dual-write + 1-week shadow test |
| Firebase Storage URLs in database | Batch migration script before cutover |
| Google OAuth misconfiguration | Test Google login on Supabase before any traffic |
| Firestore real-time listeners | Replace with Supabase Realtime subscriptions |
| Firebase Functions still called | Keep Firebase Functions alive during parallel period |
| Mobile app auth breaks | Mobile TWA keeps Firebase Auth permanently |

---

*Next step: Share your Supabase project URL + anon key and test domain so we can activate the live config.*
