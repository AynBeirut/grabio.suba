#!/usr/bin/env bash
# Build + deploy Supabase frontend to Firebase Hosting site grabio-online (grabio.online)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building production bundle (Supabase mode)"
npm run build

echo "==> Deploying to Firebase site grabio-online"
firebase deploy --only hosting:grabio-online --project market-flow-7b074

echo ""
echo "Done. Connect custom domain grabio.online in Firebase Console → Hosting → grabio-online → Add custom domain"
