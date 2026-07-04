#!/usr/bin/env bash
# Deploy Supabase test build to grabio.online on VPS (not Firebase Hosting)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VPS_HOST="${VPS_HOST:-104.207.71.117}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:-3m0VLSq1rq68w0OAdH}"
REMOTE_DIR="/home/aynbeirut/public_html/grabio.online"

echo "==> Building..."
npm run build

echo "==> Preparing SPA .htaccess"
cat > dist/.htaccess <<'HTACCESS'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Always fetch fresh index.html so new JS bundles load after deploy
<IfModule mod_headers.c>
  <FilesMatch "^index\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>
HTACCESS

echo "==> Uploading to VPS..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "mkdir -p '$REMOTE_DIR'"
sshpass -p "$VPS_PASS" rsync -az --delete dist/ "$VPS_USER@$VPS_HOST:$REMOTE_DIR/"

echo "==> Updating Apache vhost..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "cat > /usr/local/apps/apache2/etc/conf.d/grabio.online.conf <<'VHOST'
<VirtualHost 104.207.71.117:80>
    ServerName grabio.online
    ServerAlias www.grabio.online
    DocumentRoot /home/aynbeirut/public_html/grabio.online
    ServerAdmin support@grabio.space

    <Directory \"/home/aynbeirut/public_html/grabio.online\">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog /usr/local/apps/apache2/logs/grabio.online.err
    CustomLog /usr/local/apps/apache2/logs/grabio.online.log combined
</VirtualHost>
VHOST
/usr/local/apps/apache2/bin/httpd -t && /usr/local/apps/apache2/bin/httpd -k graceful"

echo ""
echo "Done: https://grabio.online (DNS already points to VPS)"
