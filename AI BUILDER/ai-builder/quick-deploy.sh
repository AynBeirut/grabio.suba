#!/bin/bash
set -e

echo "🚀 Quick Deploy to Production"

# Create directories on production
sshpass -p '5E5ns17VgAC0A8Lyef' ssh -o StrictHostKeyChecking=no root@104.207.71.117 "
mkdir -p /var/www/ai-builder/app
mkdir -p /var/www/ai-builder/components  
mkdir -p /var/www/ai-builder/lib
mkdir -p /var/www/ai-builder/public
mkdir -p /var/www/ai-builder/.next
"

echo "📦 Copying essential files..."

# Copy package.json and configs
sshpass -p '5E5ns17VgAC0A8Lyef' scp -o StrictHostKeyChecking=no package.json root@104.207.71.117:/var/www/ai-builder/
sshpass -p '5E5ns17VgAC0A8Lyef' scp -o StrictHostKeyChecking=no next.config.ts root@104.207.71.117:/var/www/ai-builder/
sshpass -p '5E5ns17VgAC0A8Lyef' scp -o StrictHostKeyChecking=no tsconfig.json root@104.207.71.117:/var/www/ai-builder/
sshpass -p '5E5ns17VgAC0A8Lyef' scp -o StrictHostKeyChecking=no .env.production root@104.207.71.117:/var/www/ai-builder/.env

# Copy built application
sshpass -p '5E5ns17VgAC0A8Lyef' scp -r -o StrictHostKeyChecking=no .next/* root@104.207.71.117:/var/www/ai-builder/.next/

echo "🏗️ Installing dependencies..."

# Install and start
sshpass -p '5E5ns17VgAC0A8Lyef' ssh -o StrictHostKeyChecking=no root@104.207.71.117 "
cd /var/www/ai-builder
npm install --production
pm2 stop all || true
pm2 start npm --name 'ai-builder-prod' -- start
pm2 save
"

echo "✅ Deployment complete!"