# 🚀 Produktions-Deployment Anleitung

Diese Anleitung beschreibt, wie Sie die Ordinationssoftware für den produktiven Einsatz in einer Ordination einrichten.

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Server-Setup](#server-setup)
3. [Datenbank-Konfiguration](#datenbank-konfiguration)
4. [Umgebungsvariablen](#umgebungsvariablen)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Frontend Build & Deployment](#frontend-build--deployment)
7. [Backend Deployment](#backend-deployment)
8. [Backup-Strategie](#backup-strategie)
9. [Monitoring & Logging](#monitoring--logging)
10. [Sicherheit](#sicherheit)
11. [Performance-Optimierung](#performance-optimierung)
12. [Updates & Wartung](#updates--wartung)
13. [Troubleshooting](#troubleshooting)

---

## 1. Voraussetzungen

### Server-Anforderungen

**Minimum (für kleine Ordinationen, 1-5 Benutzer):**
- CPU: 2 Cores
- RAM: 4 GB
- Storage: 50 GB SSD
- Bandbreite: 100 Mbps

**Empfohlen (für mittlere Ordinationen, 5-20 Benutzer):**
- CPU: 4 Cores
- RAM: 8 GB
- Storage: 100 GB SSD
- Bandbreite: 1 Gbps

**Optimal (für große Ordinationen, 20+ Benutzer):**
- CPU: 8+ Cores
- RAM: 16+ GB
- Storage: 200+ GB SSD
- Bandbreite: 1 Gbps+

### Software-Anforderungen

- **Betriebssystem:** Ubuntu 22.04 LTS oder Debian 12 (empfohlen)
- **Node.js:** Version 18.x oder 20.x LTS
- **MongoDB:** Version 6.0 oder höher
- **Nginx:** Version 1.20+ (als Reverse Proxy)
- **PM2:** Für Prozess-Management
- **Certbot:** Für SSL-Zertifikate

---

## 2. Server-Setup

### 2.1 Server vorbereiten

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js installieren (Node.js 20.x LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB installieren
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# MongoDB starten und aktivieren
sudo systemctl start mongod
sudo systemctl enable mongod

# Nginx installieren
sudo apt install -y nginx

# PM2 installieren (global)
sudo npm install -g pm2

# Certbot für SSL installieren
sudo apt install -y certbot python3-certbot-nginx

# Firewall konfigurieren
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2.2 Benutzer erstellen

```bash
# Dedizierten Benutzer für die Anwendung erstellen
sudo adduser --disabled-password --gecos "" ordinationssoftware
sudo usermod -aG sudo ordinationssoftware

# Zu dem Benutzer wechseln
sudo su - ordinationssoftware
```

---

## 3. Datenbank-Konfiguration

### 3.1 MongoDB konfigurieren

```bash
# MongoDB Konfigurationsdatei bearbeiten
sudo nano /etc/mongod.conf
```

**Wichtige Einstellungen:**

```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1  # Nur localhost, nicht öffentlich!

security:
  authorization: enabled  # Authentifizierung aktivieren
```

### 3.2 MongoDB Admin-Benutzer erstellen

```bash
# MongoDB Shell öffnen
mongosh

# Admin-Benutzer erstellen
use admin
db.createUser({
  user: "admin",
  pwd: "STARKES_PASSWORT_HIER",  # ÄNDERN!
  roles: [ { role: "root", db: "admin" } ]
})

# Datenbank-Benutzer für die Anwendung erstellen
use ordinationssoftware
db.createUser({
  user: "ordinationssoftware",
  pwd: "STARKES_PASSWORT_HIER",  # ÄNDERN!
  roles: [ { role: "readWrite", db: "ordinationssoftware" } ]
})

exit
```

### 3.3 MongoDB neu starten

```bash
sudo systemctl restart mongod
```

---

## 4. Umgebungsvariablen

### 4.1 Backend `.env` Datei erstellen

```bash
cd /home/ordinationssoftware
mkdir -p ordinationssoftware-at/backend
cd ordinationssoftware-at/backend
nano .env
```

**Produktions-Konfiguration:**

```env
# Server Konfiguration
NODE_ENV=production
PORT=5001

# MongoDB Verbindung (mit Authentifizierung)
MONGODB_URI=mongodb://ordinationssoftware:STARKES_PASSWORT@localhost:27017/ordinationssoftware?authSource=ordinationssoftware
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5

# JWT Secrets (WICHTIG: Starke, einzigartige Werte verwenden!)
JWT_SECRET=GENERIERE_EIN_STARKES_SECRET_MIT_MINDESTENS_32_ZEICHEN
JWT_REFRESH_SECRET=GENERIERE_EIN_WEITERES_STARKES_SECRET_MIT_MINDESTENS_32_ZEICHEN
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Session Management
MAX_CONCURRENT_SESSIONS=5
SESSION_CLEANUP_INTERVAL=3600000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Backup Konfiguration
BACKUP_PATH=/home/ordinationssoftware/backups
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *  # Täglich um 2 Uhr

# E-Mail Konfiguration (für Benachrichtigungen)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ihre-email@example.com
SMTP_PASS=ihr-app-passwort
SMTP_FROM=noreply@ihre-ordination.at

# Frontend URL (für CORS)
FRONTEND_URL=https://ihre-ordination.at

# ELGA Konfiguration (wenn aktiviert)
ELGA_ENVIRONMENT=production
ELGA_PROD_API_URL=https://elga.gv.at/api
ELGA_PROD_CLIENT_ID=ihr-elga-client-id
ELGA_PROD_CLIENT_SECRET=ihr-elga-client-secret
ELGA_PROD_REDIRECT_URI=https://ihre-ordination.at/api/elga/callback

# Logging
LOG_LEVEL=info
LOG_DIR=/home/ordinationssoftware/logs

# Datei-Uploads
UPLOAD_MAX_SIZE=10485760  # 10 MB
UPLOAD_PATH=/home/ordinationssoftware/uploads
```

**⚠️ WICHTIG:** Generieren Sie starke Secrets:

```bash
# JWT Secrets generieren
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.2 Frontend `.env` Datei erstellen

```bash
cd /home/ordinationssoftware/ordinationssoftware-at/frontend
nano .env.production
```

```env
REACT_APP_API_URL=https://ihre-ordination.at/api
REACT_APP_ENVIRONMENT=production
```

---

## 5. SSL/TLS Setup

### 5.1 Domain konfigurieren

Stellen Sie sicher, dass Ihre Domain auf die Server-IP zeigt:

```bash
# IP-Adresse des Servers prüfen
curl ifconfig.me
```

### 5.2 Nginx konfigurieren

```bash
sudo nano /etc/nginx/sites-available/ordinationssoftware
```

**Nginx-Konfiguration:**

```nginx
# HTTP zu HTTPS umleiten
server {
    listen 80;
    server_name ihre-ordination.at www.ihre-ordination.at;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name ihre-ordination.at www.ihre-ordination.at;

    # SSL Zertifikate (werden von Certbot erstellt)
    ssl_certificate /etc/letsencrypt/live/ihre-ordination.at/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ihre-ordination.at/privkey.pem;
    
    # SSL Konfiguration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (React Build)
    location / {
        root /home/ordinationssoftware/ordinationssoftware-at/frontend/build;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Datei-Uploads (größere Timeouts)
    location /api/upload {
        proxy_pass http://localhost:5001;
        client_max_body_size 50M;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # WebSocket Support (falls benötigt)
    location /socket.io {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Nginx aktivieren:**

```bash
sudo ln -s /etc/nginx/sites-available/ordinationssoftware /etc/nginx/sites-enabled/
sudo nginx -t  # Konfiguration testen
sudo systemctl reload nginx
```

### 5.3 SSL-Zertifikat mit Let's Encrypt

```bash
# Zertifikat anfordern
sudo certbot --nginx -d ihre-ordination.at -d www.ihre-ordination.at

# Automatische Erneuerung testen
sudo certbot renew --dry-run
```

---

## 6. Frontend Build & Deployment

### 6.1 Code auf Server übertragen

```bash
# Auf dem Server
cd /home/ordinationssoftware
git clone <IHR_REPOSITORY_URL> ordinationssoftware-at
# Oder manuell per SCP/SFTP übertragen
```

### 6.2 Frontend bauen

```bash
cd /home/ordinationssoftware/ordinationssoftware-at/frontend

# Dependencies installieren
npm ci --production=false

# Production Build erstellen
npm run build

# Build-Verzeichnis prüfen
ls -la build/
```

### 6.3 Frontend-Berechtigungen setzen

```bash
sudo chown -R ordinationssoftware:ordinationssoftware /home/ordinationssoftware/ordinationssoftware-at/frontend/build
```

---

## 7. Backend Deployment

### 7.1 Backend-Dependencies installieren

```bash
cd /home/ordinationssoftware/ordinationssoftware-at/backend
npm ci --production
```

### 7.2 PM2 konfigurieren

```bash
# PM2 Ecosystem-Datei erstellen
nano ecosystem.config.js
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'ordinationssoftware-backend',
    script: './server.js',
    instances: 2,  // Anzahl der Instanzen (für Load Balancing)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/home/ordinationssoftware/logs/pm2-error.log',
    out_file: '/home/ordinationssoftware/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'backups']
  }]
};
```

### 7.3 Backend mit PM2 starten

```bash
# PM2 starten
pm2 start ecosystem.config.js

# PM2 beim Systemstart aktivieren
pm2 startup
pm2 save

# Status prüfen
pm2 status
pm2 logs
```

---

## 8. Backup-Strategie

### 8.1 Automatische Backups

Das System erstellt bereits automatisch tägliche Backups (siehe `backend/utils/backupService.js`).

**Manuelle Backup-Erstellung:**

```bash
# MongoDB Backup erstellen
mongodump --uri="mongodb://ordinationssoftware:PASSWORT@localhost:27017/ordinationssoftware?authSource=ordinationssoftware" --archive=/home/ordinationssoftware/backups/backup-$(date +%Y%m%d-%H%M%S).archive --gzip
```

### 8.2 Backup zu externem Speicher

**Option 1: S3/Cloud Storage**

```bash
# AWS CLI installieren
sudo apt install -y awscli

# Backup zu S3 hochladen
aws s3 cp /home/ordinationssoftware/backups/backup-*.archive s3://ihr-backup-bucket/ordinationssoftware/
```

**Option 2: Lokales NAS/Server**

```bash
# rsync für Backup-Synchronisation
rsync -avz /home/ordinationssoftware/backups/ backup-server:/backups/ordinationssoftware/
```

### 8.3 Backup-Skript erstellen

```bash
nano /home/ordinationssoftware/backup-script.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ordinationssoftware/backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$DATE.archive"

# MongoDB Backup
mongodump --uri="mongodb://ordinationssoftware:PASSWORT@localhost:27017/ordinationssoftware?authSource=ordinationssoftware" \
  --archive="$BACKUP_FILE" --gzip

# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -name "backup-*.archive" -mtime +30 -delete

# Zu Cloud Storage hochladen (optional)
# aws s3 cp $BACKUP_FILE s3://ihr-backup-bucket/ordinationssoftware/
```

```bash
chmod +x /home/ordinationssoftware/backup-script.sh

# Cron-Job für tägliche Backups
crontab -e
# Fügen Sie hinzu:
0 2 * * * /home/ordinationssoftware/backup-script.sh
```

---

## 9. Monitoring & Logging

### 9.1 PM2 Monitoring

```bash
# PM2 Monitoring Dashboard
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 9.2 System-Monitoring

**Installation von Monitoring-Tools:**

```bash
# htop für System-Monitoring
sudo apt install -y htop

# netdata für Echtzeit-Monitoring (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

### 9.3 Log-Rotation

```bash
sudo nano /etc/logrotate.d/ordinationssoftware
```

```
/home/ordinationssoftware/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0640 ordinationssoftware ordinationssoftware
}
```

---

## 10. Sicherheit

### 10.1 Firewall-Regeln

```bash
# Nur notwendige Ports öffnen
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 10.2 SSH-Härtung

```bash
sudo nano /etc/ssh/sshd_config
```

**Wichtige Einstellungen:**

```
PermitRootLogin no
PasswordAuthentication no  # Nur SSH-Keys
PubkeyAuthentication yes
Port 2222  # Standard-Port ändern (optional)
```

```bash
sudo systemctl restart sshd
```

### 10.3 Fail2Ban installieren

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 10.4 Automatische Sicherheits-Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 11. Performance-Optimierung

### 11.1 Node.js Optimierungen

```bash
# PM2 Ecosystem erweitern
# In ecosystem.config.js:
env: {
  NODE_ENV: 'production',
  PORT: 5001,
  NODE_OPTIONS: '--max-old-space-size=2048'  # 2GB Heap
}
```

### 11.2 MongoDB Indizes

```bash
# MongoDB Shell öffnen
mongosh -u ordinationssoftware -p PASSWORT --authenticationDatabase ordinationssoftware

# Indizes prüfen
use ordinationssoftware
db.patients.getIndexes()
db.appointments.getIndexes()
db.documents.getIndexes()

# Fehlende Indizes hinzufügen (falls nötig)
db.patients.createIndex({ "email": 1 })
db.appointments.createIndex({ "date": 1, "startTime": 1 })
db.documents.createIndex({ "patient.id": 1, "createdAt": -1 })
```

### 11.3 Nginx Caching

```nginx
# In Nginx-Konfiguration hinzufügen:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

server {
    # ...
    location /api {
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        # ... rest der Konfiguration
    }
}
```

---

## 12. Updates & Wartung

### 12.1 Update-Prozess

```bash
# 1. Backup erstellen
/home/ordinationssoftware/backup-script.sh

# 2. Code aktualisieren
cd /home/ordinationssoftware/ordinationssoftware-at
git pull origin main

# 3. Dependencies aktualisieren
cd backend
npm ci --production
cd ../frontend
npm ci --production=false

# 4. Frontend neu bauen
npm run build

# 5. Backend neu starten
pm2 restart ordinationssoftware-backend

# 6. Status prüfen
pm2 status
pm2 logs
```

### 12.2 Wartungsfenster

```bash
# Wartungsmodus aktivieren (optional)
# In Nginx eine Wartungsseite einrichten
```

---

## 13. Troubleshooting

### 13.1 Häufige Probleme

**Problem: Backend startet nicht**
```bash
# Logs prüfen
pm2 logs ordinationssoftware-backend
tail -f /home/ordinationssoftware/logs/error.log

# MongoDB-Verbindung prüfen
mongosh -u ordinationssoftware -p PASSWORT --authenticationDatabase ordinationssoftware
```

**Problem: Frontend lädt nicht**
```bash
# Nginx-Logs prüfen
sudo tail -f /var/log/nginx/error.log

# Build-Verzeichnis prüfen
ls -la /home/ordinationssoftware/ordinationssoftware-at/frontend/build
```

**Problem: SSL-Zertifikat abgelaufen**
```bash
# Zertifikat erneuern
sudo certbot renew
sudo systemctl reload nginx
```

### 13.2 Performance-Probleme

```bash
# CPU und RAM prüfen
htop

# MongoDB Performance prüfen
mongosh
db.currentOp()
db.serverStatus()

# PM2 Status
pm2 monit
```

---

## 14. Checkliste vor dem Go-Live

- [ ] Alle Umgebungsvariablen korrekt gesetzt
- [ ] Starke Passwörter und Secrets generiert
- [ ] SSL-Zertifikat installiert und erneuert
- [ ] MongoDB Authentifizierung aktiviert
- [ ] Firewall konfiguriert
- [ ] Backup-System getestet
- [ ] Monitoring eingerichtet
- [ ] Logs konfiguriert
- [ ] Frontend Production-Build erstellt
- [ ] Backend mit PM2 gestartet
- [ ] Nginx konfiguriert und getestet
- [ ] Domain-DNS korrekt konfiguriert
- [ ] Erste Test-Anmeldung erfolgreich
- [ ] Backup-Wiederherstellung getestet
- [ ] Dokumentation für Team erstellt

---

## 15. Support & Wartung

### Regelmäßige Wartungsaufgaben

**Täglich:**
- Backup-Status prüfen
- Logs auf Fehler prüfen

**Wöchentlich:**
- System-Updates prüfen
- Disk-Space prüfen
- Performance-Metriken überprüfen

**Monatlich:**
- Backup-Wiederherstellung testen
- Sicherheits-Updates installieren
- MongoDB Indizes optimieren

---

## 16. Kontakt & Support

Bei Fragen oder Problemen:
- Dokumentation prüfen
- Logs analysieren
- Support-Team kontaktieren

---

**Viel Erfolg mit Ihrer produktiven Ordinationssoftware! 🏥**





