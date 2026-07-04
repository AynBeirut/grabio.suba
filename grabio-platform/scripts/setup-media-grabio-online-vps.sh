#!/usr/bin/env bash
# media.grabio.online → reverse-proxy to R2 public bucket URL on VPS Apache
set -euo pipefail

VPS_HOST="${VPS_HOST:-104.207.71.117}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:-3m0VLSq1rq68w0OAdH}"
R2_PUBLIC_ORIGIN="${R2_PUBLIC_ORIGIN:-https://pub-2221e2fa2e024e92b1f253e9fc7887c4.r2.dev}"

echo "==> DNS: add media.grabio.online A record (if missing)"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "bash -s" <<'REMOTE'
set -euo pipefail
ZONE=/var/named/grabio.online.zone
if grep -q '^media[[:space:]]' "$ZONE"; then
  echo "media record already exists"
else
  cp "$ZONE" "${ZONE}.bak.$(date +%Y%m%d%H%M%S)"
  serial=$(grep -m1 '^[[:space:]]*[0-9]\+[[:space:]]*; serial' "$ZONE" | tr -dc '0-9')
  new_serial=$((serial + 1))
  sed -i "0,/^[[:space:]]*[0-9]\+[[:space:]]*; serial/s/^[[:space:]]*[0-9]\+[[:space:]]*; serial/${new_serial}\t; serial/" "$ZONE"
  printf '\nmedia 14400 IN A 104.207.71.117\n' >> "$ZONE"
  rndc reload 2>/dev/null || systemctl reload named 2>/dev/null || true
  echo "added media A record, serial ${new_serial}"
fi
REMOTE

echo "==> Apache vhost: media.grabio.online proxy"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "R2_PUBLIC_ORIGIN='$R2_PUBLIC_ORIGIN' bash -s" <<'REMOTE'
set -euo pipefail
cat > /usr/local/apps/apache2/etc/conf.d/media.grabio.online.conf <<VHOST
<VirtualHost 104.207.71.117:80>
    ServerName media.grabio.online
    ServerAdmin support@grabio.space

    ProxyRequests Off
    SSLProxyEngine On
    ProxyPreserveHost Off
    ProxyPass / ${R2_PUBLIC_ORIGIN}/
    ProxyPassReverse / ${R2_PUBLIC_ORIGIN}/

    <IfModule mod_headers.c>
        Header always set Access-Control-Allow-Origin "*"
        Header always set Access-Control-Allow-Methods "GET, HEAD, PUT, POST, DELETE, OPTIONS"
        Header always set Access-Control-Allow-Headers "*"
    </IfModule>

    ErrorLog /usr/local/apps/apache2/logs/media.grabio.online.err
    CustomLog /usr/local/apps/apache2/logs/media.grabio.online.log combined
</VirtualHost>
VHOST
/usr/local/apps/apache2/bin/httpd -t
/usr/local/apps/apache2/bin/httpd -k graceful
echo "Apache media vhost OK"
REMOTE

echo "Done: http://media.grabio.online (proxy → R2 public URL)"
