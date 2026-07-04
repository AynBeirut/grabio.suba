#!/bin/bash
# Pre-build script: Injects timestamp into source files to force new chunk hashes
TIMESTAMP=$(date +%s%3N)

# Replace timestamp placeholder in ai-chat component
sed -i "s/{BUILD_TIMESTAMP}/$TIMESTAMP/g" components/ai/ai-chat.tsx

# Write NEXT_PUBLIC_BUILD_ID so layout.tsx can detect stale cache and auto-reload
# Remove old entry first, then append fresh one
grep -v "^NEXT_PUBLIC_BUILD_ID=" .env.production > /tmp/.env.production.tmp 2>/dev/null && mv /tmp/.env.production.tmp .env.production || true
echo "NEXT_PUBLIC_BUILD_ID=$TIMESTAMP" >> .env.production

echo "✅ Injected build timestamp: $TIMESTAMP"
