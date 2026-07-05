# Deployment

Production stack for `bmwholistics.in`:

- **api.bmwholistics.in** → FastAPI + Postgres (Docker), proxied by nginx + HTTPS
- **admin.bmwholistics.in** → React admin panel (static build), served by nginx + HTTPS

Everything lives in `/var/www/bmw` on the VPS (a clone of this repo).

## DNS (do this first)
Add these A records at your DNS provider, pointing to the VPS:

```
api.bmwholistics.in    A    187.127.157.119
admin.bmwholistics.in  A    187.127.157.119
```

## First-time setup on the VPS
```bash
git clone https://github.com/Ahd4wnn/the-manager.git /var/www/bmw
cd /var/www/bmw/deploy
cp .env.prod.example .env.prod         # then fill secrets (see comments in file)
cd /var/www/bmw
chmod +x deploy/deploy.sh
./deploy/deploy.sh                     # builds frontend, starts backend, configures nginx
# Once DNS resolves to this box, issue certificates:
certbot --nginx -d api.bmwholistics.in -d admin.bmwholistics.in \
        --redirect -m admin@bmwholistics.in --agree-tos -n
```

## Updating later
```bash
cd /var/www/bmw && ./deploy/deploy.sh
```

`.env.prod` holds real secrets and is git-ignored — it never leaves the VPS.
