#!/usr/bin/env bash
# Deploy / update the BMW stack on the VPS. Run from /var/www/bmw.
#   cd /var/www/bmw && ./deploy/deploy.sh
set -euo pipefail

REPO_DIR="/var/www/bmw"
cd "$REPO_DIR"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building admin panel (throwaway node container)"
docker run --rm \
  -v "$REPO_DIR/admin-web:/app" -w /app \
  node:20-alpine sh -c "npm ci && npm run build"

echo "==> Building & starting backend + database"
cd "$REPO_DIR/deploy"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "==> Syncing nginx site configs"
cp "$REPO_DIR/deploy/nginx/api.bmwholistics.in.conf"   /etc/nginx/sites-available/
cp "$REPO_DIR/deploy/nginx/admin.bmwholistics.in.conf" /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/api.bmwholistics.in.conf   /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/admin.bmwholistics.in.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "==> Done. Backend on http://127.0.0.1:8000 (proxied by nginx)."
echo "    If TLS not yet issued, run:"
echo "    certbot --nginx -d api.bmwholistics.in -d admin.bmwholistics.in --redirect -m admin@bmwholistics.in --agree-tos -n"
