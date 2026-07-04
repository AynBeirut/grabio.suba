#!/bin/bash
set -e

echo "🔥 Complete Production Deploy"

# Copy ALL source files
sshpass -p '5E5ns17VgAC0A8Lyef' scp -r -o StrictHostKeyChecking=no app components lib auth.ts middleware.ts components.json root@104.207.71.117:/var/www/ai-builder/

# Copy all config files
sshpass -p '5E5ns17VgAC0A8Lyef' scp -o StrictHostKeyChecking=no postcss.config.mjs eslint.config.mjs root@104.207.71.117:/var/www/ai-builder/

echo "🏗 Building on production server..."

# Build and restart on production  
sshpass -p '5E5ns17VgAC0A8Lyef' ssh -o StrictHostKeyChecking=no root@104.207.71.117 "
cd /var/www/ai-builder
npm run build
pm2 restart ai-builder-prod
"

echo "✅ Complete deployment done!"