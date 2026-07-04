#!/usr/bin/env bash
# Build Grabio Invoice Manager TWA (Android) for Play Store upload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-1.17.0-openjdk-amd64}"
export PATH="$JAVA_HOME/bin:$PATH"

BW="./node_modules/.bin/bubblewrap"

if [[ ! -d android ]]; then
  echo "→ First-time init"
  "$BW" init --manifest=twa-manifest.json --directory=android
fi

echo "→ Syncing manifest into Android project…"
"$BW" update --directory=android --manifest=twa-manifest.json

echo "→ Building signed AAB/APK…"
if [[ -z "${BUBBLEWRAP_KEYSTORE_PASSWORD:-}" ]]; then
  echo "Set BUBBLEWRAP_KEYSTORE_PASSWORD (see .credentials.md) or enter when prompted."
fi
"$BW" build --directory=android

echo "Done. Upload android/app-release-signed.aab to Play Console."
ls -la android/app-release-signed.* 2>/dev/null || true
