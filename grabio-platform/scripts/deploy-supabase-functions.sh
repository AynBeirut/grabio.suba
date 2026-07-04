#!/usr/bin/env bash
# Deploy all Grabio Supabase Edge Functions to grabio.online project
# Usage:
#   export SUPABASE_ACCESS_TOKEN=sbp_...
#   cd "suba eco sys/grabio-platform"
#   ./scripts/deploy-supabase-functions.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-iaxpihcyasvtnjetnhde}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN."
  echo "Generate at: https://supabase.com/dashboard/account/tokens"
  echo "Then: export SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

if [[ -x "$HOME/.local/bin/supabase" ]]; then
  SUPABASE="$HOME/.local/bin/supabase"
elif command -v supabase >/dev/null 2>&1; then
  SUPABASE="supabase"
else
  echo "Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "==> Using $($SUPABASE --version)"
echo "==> Linking project $PROJECT_REF (skip if already linked)"
printf '\n' | $SUPABASE link --project-ref "$PROJECT_REF" 2>/dev/null || true

FUNCTIONS=(
  r2-presign
  checkout
  subscription
  webhook-whish
  webhook-stripe
  payment-whish
  contact
  marketing
  ai
  order-notifications
)

echo "==> Deploying ${#FUNCTIONS[@]} Edge Functions..."
for fn in "${FUNCTIONS[@]}"; do
  echo "--- deploy $fn"
  $SUPABASE functions deploy "$fn" --project-ref "$PROJECT_REF" --use-api
done

echo ""
echo "Done. Set secrets next:"
echo "  ./scripts/set-supabase-secrets.sh"
