# Grabio Supabase Migration (`suba eco sys`)

Firebase → Supabase parallel stack for **grabio.online** test domain.

## Status (Jul 4, 2026)

| Item | Status |
|---|---|
| Supabase schema (migrations 1–5) | ✅ Applied |
| Edge Functions (10) | ✅ Deployed |
| Auth redirect URLs | ✅ `grabio.online` |
| Data migration | ✅ 10 stores, 78 products, 689 orders, 180 customers |
| Frontend build | ✅ |
| Hosting | ✅ https://grabio-online.web.app (connect `grabio.online` in Firebase Console) |
| R2 image uploads | ⏳ Needs Cloudflare R2 keys in Edge Function secrets |
| POS migration | 🔵 Last — after Windows builder |

## Quick start

```bash
cd grabio-platform
cp .env.example .env          # Supabase keys already filled
npm install && npm run dev

# Deploy Edge Functions
export SUPABASE_ACCESS_TOKEN=sbp_...
./scripts/deploy-supabase-functions.sh

# Deploy frontend
./scripts/deploy-grabio-online.sh
```

## Data migration

```bash
cd scripts && npm install
export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/...application_default_credentials.json
npm run migrate:dry
npm run migrate:all
```

## Repo

Push target: `https://github.com/a-nooor/grabio.suba.git`

Production Firebase (`grabio.space`) stays untouched during the 1-week parallel test.
