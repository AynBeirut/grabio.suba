#!/usr/bin/env bash
# Push Edge Function secrets from environment variables.
# Fill values in .env.secrets (gitignored) or export before running.
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN=sbp_...
#   cp .env.secrets.example .env.secrets   # fill in
#   ./scripts/set-supabase-secrets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-iaxpihcyasvtnjetnhde}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN."
  exit 1
fi

if [[ -f .env.secrets ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.secrets
  set +a
fi

if [[ -x "$HOME/.local/bin/supabase" ]]; then
  SUPABASE="$HOME/.local/bin/supabase"
else
  SUPABASE="supabase"
fi

set_secret() {
  local key="$1"
  local val="${!key:-}"
  if [[ -z "$val" || "$val" == "[TODO]" ]]; then
    echo "skip $key (empty)"
    return 0
  fi
  echo "set $key"
  $SUPABASE secrets set "${key}=${val}" --project-ref "$PROJECT_REF"
}

# Required for most functions
set_secret FRONTEND_BASE_URL
set_secret WEBSITE_URL
set_secret SMTP_HOST
set_secret SMTP_PORT
set_secret SMTP_USER
set_secret SMTP_PASS
set_secret WHISH_CHANNEL
set_secret WHISH_SECRET
set_secret STRIPE_SECRET_KEY
set_secret STRIPE_WEBHOOK_SECRET
set_secret R2_ACCOUNT_ID
set_secret R2_ACCESS_KEY_ID
set_secret R2_SECRET_ACCESS_KEY
set_secret R2_BUCKET
set_secret R2_PUBLIC_URL

echo "Secrets sync complete."
