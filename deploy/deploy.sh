#!/bin/bash
# Ordinationssoftware - Update-Script (auf dem Server ausführen)
# Verwendung: ./deploy/deploy.sh
set -e

APP_ROOT="/home/ordinationssoftware/ordinationssoftware-at"
cd "$APP_ROOT"

echo "=== Ordinationssoftware Update ==="

# Code aktualisieren (git) - falls Repository vorhanden
if [ -d .git ]; then
  git pull
else
  echo "Hinweis: Kein Git-Repository. Code manuell per SCP hochladen."
fi

# Backend
echo "Backend: Dependencies installieren..."
cd "$APP_ROOT/backend"
npm ci --production

# Frontend
echo "Frontend: Dependencies installieren und bauen..."
cd "$APP_ROOT/frontend"
npm ci --production=false
npm run build

# PM2 neu starten
echo "Backend neu starten..."
pm2 restart ordinationssoftware-backend

echo "=== Deployment abgeschlossen ==="
pm2 status
