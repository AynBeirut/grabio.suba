#!/bin/bash

# AI Builder Deployment Script
# Deploys to: ai.aynbeirut.dev (104.207.71.117)

set -e

VPS_USER="root"
VPS_HOST="104.207.71.117"
VPS_PASSWORD="5E5ns17VgAC0A8Lyef"
APP_DIR="/var/www/ai-builder"
LOCAL_DIR="/home/anwar/Documents/AI BUILDER/ai-builder"

echo "🚀 Starting deployment to ai.aynbeirut.dev..."

# 1. Build locally
echo "📦 Building app locally..."
cd "$LOCAL_DIR"
npm run build

# 2. Create app directory on VPS
echo "📁 Creating app directory on VPS..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "mkdir -p $APP_DIR/logs"

# 3. Upload files to VPS (including .next build)
echo "📤 Uploading files to VPS..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dev.db' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '.env' \
  -e "sshpass -p '$VPS_PASSWORD' ssh -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/" $VPS_USER@$VPS_HOST:$APP_DIR/

# 4. Upload production .env
echo "🔐 Uploading production environment..."
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no "$LOCAL_DIR/.env.production" $VPS_USER@$VPS_HOST:$APP_DIR/.env

# 5. Install dependencies and setup on VPS
echo "⚙️  Installing dependencies on VPS..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'EOF'
cd /var/www/ai-builder
npm install --production
npx prisma generate
npx prisma migrate deploy
EOF

# 6. Restart PM2
echo "🔄 Restarting app with PM2..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'EOF'
cd /var/www/ai-builder
pm2 delete ai-builder 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
# Startup integration only needs to be done once on a server.
# Keep deployment non-failing if PM2 outputs no executable startup command.
STARTUP_CMD=$(pm2 startup systemd -u root --hp /root 2>/dev/null | grep -E 'sudo|env PATH' | tail -n 1 || true)
if [ -n "$STARTUP_CMD" ]; then
  bash -lc "$STARTUP_CMD" || true
fi
EOF

echo "✅ Deployment complete!"
echo "🌐 App should be running at: http://104.207.71.117:3000"
echo ""
echo "Next steps:"
echo "1. Configure Apache reverse proxy for ai.aynbeirut.dev"
echo "2. Add SSL certificate with Let's Encrypt"
echo "3. Update Google OAuth redirect URI: https://ai.aynbeirut.dev/api/auth/callback/google"
echo ""
echo "Check logs: ssh root@104.207.71.117 'pm2 logs ai-builder'"
