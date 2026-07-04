# Grabio → Supabase Setup Checklist
> Domain: grabio.online | Date: Jul 4, 2026

---

## STEP 1 — Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New project
2. Name: `grabio-production`
3. Region: pick closest to Lebanon (e.g. EU West / Frankfurt)
4. Password: save in `.credentials.md`
5. Copy → **Project URL** and **Anon Key** → paste in `.env` below

```
VITE_SUPABASE_URL=https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  ← for migration scripts only
```

---

## STEP 2 — Run SQL Migrations (all 4)
Run each file in Supabase Dashboard → SQL Editor:

| # | File | Status |
|---|---|---|
| 1 | `20260704000001_core_schema.sql` | ✅ done |
| 2 | `20260704000002_triggers_and_scheduled.sql` | ✅ done |
| 3 | `20260704000003_commerce_extensions.sql` | ✅ done |
| 4 | `20260704000004_pg_cron_jobs.sql` | ✅ done |
| 5 | `20260704000005_firebase_id_indexes.sql` | ✅ done |

Verify **15+ public tables** in Table Editor.

---

## STEP 3 — Enable Google OAuth
1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Client ID: (same one from Firebase — copy from `.credentials.md`)
3. Client Secret: (from Google Cloud Console)
4. Redirect URL shown by Supabase: copy it → go to Google Cloud Console → OAuth 2.0 → add to Authorized redirect URIs:
   - `https://[ref].supabase.co/auth/v1/callback`
   - `https://grabio.online/auth/callback`

---

## STEP 4 — Deploy Edge Functions (10 total) ✅
1. Generate CLI token: [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → name `grabio-cli-deploy`
2. In terminal:
   ```bash
   export SUPABASE_ACCESS_TOKEN=sbp_...
   cd "suba eco sys/grabio-platform"
   chmod +x scripts/*.sh
   ./scripts/deploy-supabase-functions.sh
   ```
3. Copy secrets template and fill from production `.credentials.md`:
   ```bash
   cp .env.secrets.example .env.secrets
   ./scripts/set-supabase-secrets.sh
   ```
   Or: `npm run supabase:deploy-functions` after token is exported.

---

## STEP 5 — Cloudflare R2 Bucket
1. Cloudflare Dashboard → R2 → Create bucket: `grabio-media`
2. Enable public access → copy public URL
3. Add CNAME in DNS: `media.grabio.online` → `[bucket].r2.dev`
4. Copy R2 API keys → paste into Supabase secrets above

---

## STEP 6 — DNS for grabio.online
Add these DNS records (in Cloudflare DNS):

| Subdomain | Type | Value | Proxy |
|---|---|---|---|
| `@` (root) | A or CNAME | Your hosting (Vercel/VPS) | Yes |
| `media` | CNAME | `[r2-bucket-id].r2.dev` | Yes |
| `api` | CNAME | `[supabase-ref].supabase.co` | No (DNS only) |

---

## STEP 7 — Build & Deploy Supabase Version
```bash
cd "suba eco sys/grabio-platform"
npm install
npm install @supabase/supabase-js
cp .env.example .env
# fill in .env with Supabase URL + keys

npm run build
# deploy dist/ to grabio.online hosting
```

---

## STEP 8 — Run Data Migration (after both systems stable)
```bash
cd "suba eco sys/scripts"
npm install firebase-admin @supabase/supabase-js @aws-sdk/client-s3

# Place Firebase service account JSON in scripts/firebase-service-account.json
# Test run first:
npx ts-node migrate-firestore-to-supabase.ts --dry-run --collections=stores,products

# Live run:
npx ts-node migrate-firestore-to-supabase.ts --collections=stores,products,orders,customers
npx ts-node migrate-images-to-r2.ts
```

---

## STEP 9 — 1-Week Parallel Test
- [ ] grabio.online live on Supabase ✅
- [ ] Original Firebase system untouched ✅
- [ ] All store data visible on grabio.online
- [ ] Google login works on grabio.online
- [ ] Image uploads go to R2
- [ ] Orders visible in Supabase dashboard
- [ ] No errors in browser console for 48 hours
- [ ] Active clients tested manually

---

## STEP 10 — Cutover (after 1 week)
- [ ] Point main domain to grabio.online build
- [ ] Disable Firebase Hosting
- [ ] Keep Firebase Auth alive (mobile apps)
- [ ] Archive Firestore → Firestore export to Cloud Storage
- [ ] Disable Firebase Functions billing

---

## What NOT to touch during parallel week
- ❌ `the eco sys/` folder (live production source)
- ❌ Firebase project config
- ❌ Firebase Functions (keep live for mobile)
- ❌ POS (Windows builder upgrade ongoing)
