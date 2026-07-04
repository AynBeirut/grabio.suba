#!/usr/bin/env bash
# Apply grabio-media CORS via Cloudflare REST API (requires Admin Read & Write token).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POLICY_FILE="${1:-$ROOT/scripts/r2-cors-policy.json}"

if [ -f "$ROOT/.env.secrets" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env.secrets"
fi

ACCOUNT_ID="${R2_ACCOUNT_ID:-2bef47f1314ea95fae3b30004f203d4c}"
BUCKET="${R2_BUCKET:-grabio-media}"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

if [ -z "$TOKEN" ]; then
  echo "Set CLOUDFLARE_API_TOKEN (Admin Read & Write — not the object-level R2 key)." >&2
  echo "Dashboard fallback: bucket Settings → CORS Policy → Add → paste scripts/r2-cors-dashboard.json" >&2
  exit 1
fi

curl -fsS -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/cors" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d @"$POLICY_FILE"

echo ""
echo "CORS updated for ${BUCKET}"
