# Hetzner Deployment - MyMediCloud (mymedicloud.at)

Kurzreferenz für das Deployment der Ordinationssoftware auf dem Hetzner-Server.

## Voraussetzungen

- Server: Node.js 20.x, Nginx, MongoDB, PM2 bereits installiert
- Domain: mymedicloud.at zeigt auf Server-IP
- Basis-Pfad: `/home/ordinationssoftware/ordinationssoftware-at`

## Erst-Deployment

### 1. Code auf den Server bringen

**Option A: Git**
```bash
cd /home/ordinationssoftware
git clone <REPO_URL> ordinationssoftware-at
cd ordinationssoftware-at
```

**Option B: SCP (vom Mac)**
```bash
scp -r /Users/alitahamtaniomran/ordinationssoftware-at root@188.245.76.36:/home/ordinationssoftware/
```

### 2. Scripts ausführbar machen (optional)
```bash
chmod +x deploy/first-time-setup.sh deploy/deploy.sh
```

### 3. Erst-Setup ausführen
```bash
cd /home/ordinationssoftware/ordinationssoftware-at
./deploy/first-time-setup.sh
```

**Wichtig:** Vor dem Fortfahren müssen in `backend/.env` die Platzhalter ersetzt werden:
- `JWT_SECRET` und `JWT_REFRESH_SECRET` mit `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` generieren

### 4. Manuelles Vorgehen (falls Scripts nicht genutzt werden)

```bash
# Verzeichnisse
mkdir -p /home/ordinationssoftware/logs /home/ordinationssoftware/backups

# Backend
cp deploy/backend.env.template backend/.env
# .env bearbeiten: JWT_SECRET, JWT_REFRESH_SECRET
cd backend && npm ci --production

# Frontend
cp deploy/frontend.env.production.template frontend/.env.production
cd frontend && npm ci --production=false && npm run build

# Nginx
sudo cp deploy/nginx-mymedicloud.conf /etc/nginx/sites-available/ordinationssoftware
sudo ln -sf /etc/nginx/sites-available/ordinationssoftware /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# PM2
pm2 start deploy/ecosystem.config.js
pm2 save && pm2 startup
```

## SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d mymedicloud.at -d www.mymedicloud.at
```

Certbot passt die Nginx-Konfiguration automatisch an.

## Updates (nach Änderungen)

```bash
cd /home/ordinationssoftware/ordinationssoftware-at
./deploy/deploy.sh
```

## Dateien im deploy/ Ordner

| Datei | Zweck |
|-------|-------|
| backend.env.template | Vorlage für backend/.env |
| frontend.env.production.template | Vorlage für frontend/.env.production |
| nginx-mymedicloud.conf | Nginx-Konfiguration |
| ecosystem.config.js | PM2-Prozessverwaltung |
| deploy.sh | Update-Script |
| first-time-setup.sh | Erst-Deployment-Script |

## Detaillierte Anleitung

Siehe [PRODUCTION_DEPLOYMENT.md](../PRODUCTION_DEPLOYMENT.md) für die vollständige Dokumentation.
