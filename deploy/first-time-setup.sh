#!/bin/bash
# Ordinationssoftware - Erst-Deployment auf Hetzner
# Voraussetzung: Code ist bereits auf dem Server (git clone oder scp)
# Verwendung: ./deploy/first-time-setup.sh
set -e

APP_ROOT="/home/ordinationssoftware/ordinationssoftware-at"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Ordinationssoftware Erst-Setup ==="

# Verzeichnisse anlegen
echo "Verzeichnisse anlegen..."
mkdir -p /home/ordinationssoftware/logs
mkdir -p /home/ordinationssoftware/backups
mkdir -p "$APP_ROOT/backend/uploads"
mkdir -p "$APP_ROOT/backend/logs"

# Prüfen ob Code vorhanden
if [ ! -f "$APP_ROOT/backend/server.js" ]; then
  echo "FEHLER: Code nicht gefunden unter $APP_ROOT"
  echo "Bitte zuerst Code hochladen:"
  echo "  git clone <REPO_URL> $APP_ROOT"
  echo "  oder: scp -r ./ordinationssoftware-at root@SERVER:$APP_ROOT"
  exit 1
fi

# Backend .env
if [ ! -f "$APP_ROOT/backend/.env" ]; then
  echo "Backend .env erstellen..."
  cp "$DEPLOY_DIR/backend.env.template" "$APP_ROOT/backend/.env"
  echo "WICHTIG: Bearbeiten Sie $APP_ROOT/backend/.env und setzen Sie JWT_SECRET und JWT_REFRESH_SECRET!"
  echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  read -p "Nach Anpassung Enter drücken zum Fortfahren..."
else
  echo "Backend .env existiert bereits."
fi

# Backend Dependencies
echo "Backend: Dependencies installieren..."
cd "$APP_ROOT/backend"
npm ci --production

# Frontend .env.production
if [ ! -f "$APP_ROOT/frontend/.env.production" ]; then
  echo "Frontend .env.production erstellen..."
  cp "$DEPLOY_DIR/frontend.env.production.template" "$APP_ROOT/frontend/.env.production"
fi

# Frontend Build
echo "Frontend: Dependencies installieren und bauen..."
cd "$APP_ROOT/frontend"
npm ci --production=false
npm run build

# Nginx
echo "Nginx Konfiguration installieren..."
sudo cp "$DEPLOY_DIR/nginx-mymedicloud.conf" /etc/nginx/sites-available/ordinationssoftware
sudo ln -sf /etc/nginx/sites-available/ordinationssoftware /etc/nginx/sites-enabled/
if [ -f /etc/nginx/sites-enabled/default ]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi
sudo nginx -t
sudo systemctl reload nginx

# PM2
echo "Backend mit PM2 starten..."
cd "$APP_ROOT"
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup || true

echo "=== Erst-Setup abgeschlossen ==="
echo "Webseite: https://mymedicloud.at"
echo "SSL (falls noch nicht): sudo certbot --nginx -d mymedicloud.at -d www.mymedicloud.at"
pm2 status
