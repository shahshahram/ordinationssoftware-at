# 🖥️ Projekt auf anderem Mac einrichten

Diese Anleitung erklärt, wie Sie das Projekt auf einem anderen Mac zum Laufen bringen.

## 📋 Voraussetzungen

Bevor Sie beginnen, stellen Sie sicher, dass auf dem neuen Mac installiert ist:

1. **Node.js** (Version 16 oder höher)
   ```bash
   node --version  # Sollte v16+ zeigen
   npm --version   # Sollte v8+ zeigen
   ```

2. **MongoDB** (lokal oder MongoDB Atlas)
   - Lokale Installation: https://www.mongodb.com/try/download/community
   - Oder MongoDB Atlas (Cloud): https://www.mongodb.com/cloud/atlas

3. **Git** (meist vorinstalliert auf Mac)
   ```bash
   git --version
   ```

## 📦 Schritt 1: Projekt übertragen

### Option A: Mit Git (Empfohlen)
```bash
# Klonen Sie das Repository auf den neuen Mac
git clone <IHR_REPOSITORY_URL> ordinationssoftware-at
cd ordinationssoftware-at
```

### Option B: Manuell übertragen
1. Kopieren Sie den gesamten Projektordner auf den neuen Mac
2. Öffnen Sie Terminal und navigieren Sie zum Projektordner:
   ```bash
   cd /path/to/ordinationssoftware-at
   ```

## 🔧 Schritt 2: Backend einrichten

### 2.1 Dependencies installieren
```bash
cd backend
npm install
```

### 2.2 Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env` Datei im `backend` Ordner:

```bash
# Im backend Ordner
touch .env
```

Fügen Sie folgende Variablen hinzu (anpassen nach Bedarf):

```env
# Server Konfiguration
PORT=5001
NODE_ENV=development

# MongoDB Verbindung
MONGO_URI=mongodb://localhost:27017/ordinationssoftware
# Oder für MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ordinationssoftware

# JWT Secret (wichtig: verwenden Sie einen starken, einzigartigen Wert!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too

# Optional: E-Mail Konfiguration
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=your-email@gmail.com

# Optional: Backup Konfiguration
# BACKUP_SCHEDULE=0 2 * * *  # Täglich um 2 Uhr
```

**Wichtig:** 
- Ersetzen Sie `JWT_SECRET` und `JWT_REFRESH_SECRET` durch starke, zufällige Strings
- Passen Sie `MONGO_URI` an Ihre MongoDB-Verbindung an

### 2.3 MongoDB starten (falls lokal installiert)
```bash
# Mit Homebrew installiert:
brew services start mongodb-community

# Oder manuell:
mongod --config /usr/local/etc/mongod.conf
```

## 🎨 Schritt 3: Frontend einrichten

### 3.1 Dependencies installieren
```bash
cd ../frontend
npm install
```

### 3.2 Umgebungsvariablen konfigurieren (Optional)

Erstellen Sie eine `.env` Datei im `frontend` Ordner (falls benötigt):

```bash
# Im frontend Ordner
touch .env
```

Fügen Sie hinzu:
```env
REACT_APP_API_URL=http://localhost:5001
```

**Hinweis:** Die Frontend-Proxy-Konfiguration in `package.json` sollte bereits auf `http://localhost:5001` gesetzt sein.

## 🗄️ Schritt 4: Datenbank Setup

### 4.1 ICD-10 Daten importieren
```bash
cd ../backend
node scripts/importAustrianIcd10.js
```

### 4.2 Demo-Daten erstellen (Optional)
```bash
# Demo-Benutzer erstellen
node scripts/setupDemoUser.js

# Demo-Personal-Daten
node scripts/setupDemoStaffData.js

# Demo-Ressourcen
node scripts/setupDemoResources.js
```

### 4.3 Super-Admin erstellen (Optional)
```bash
node scripts/setupSuperAdmin.js
```

## 🚀 Schritt 5: Projekt starten

### Terminal 1: Backend starten
```bash
cd backend
npm start
# Oder für Development mit Auto-Reload:
npm run dev
```

Backend läuft auf: `http://localhost:5001`

### Terminal 2: Frontend starten
```bash
cd frontend
npm start
```

Frontend läuft auf: `http://localhost:3000`

Die Anwendung öffnet sich automatisch im Browser.

## ✅ Schritt 6: Erste Anmeldung

### Mit Demo-Benutzer (falls erstellt):
- Email: `admin@ordinationssoftware.at`
- Passwort: (siehe `setupDemoUser.js` Ausgabe)

### Oder erstellen Sie einen neuen Benutzer:
1. Gehen Sie zu: http://localhost:3000/register
2. Oder nutzen Sie die Super-Admin Setup Seite (falls eingerichtet)

## 🔍 Troubleshooting

### Problem: MongoDB-Verbindung schlägt fehl
```bash
# Prüfen Sie, ob MongoDB läuft:
brew services list  # Mit Homebrew
# Oder:
ps aux | grep mongod

# Testen Sie die Verbindung:
mongosh mongodb://localhost:27017
```

### Problem: Port bereits belegt
```bash
# Prüfen Sie, welche Prozesse Port 5001 oder 3000 verwenden:
lsof -i :5001
lsof -i :3000

# Prozess beenden:
kill -9 <PID>
```

### Problem: Dependencies fehlen
```bash
# Lösche node_modules und installiere neu:
rm -rf node_modules package-lock.json
npm install
```

### Problem: Frontend kann Backend nicht erreichen
- Stellen Sie sicher, dass Backend auf Port 5001 läuft
- Prüfen Sie die `proxy` Einstellung in `frontend/package.json`
- Prüfen Sie CORS-Einstellungen im Backend (`server.js`)

## 📝 Wichtige Dateien die NICHT übertragen werden sollten

Diese Dateien sollten **nicht** in Git committet werden (sind normalerweise in `.gitignore`):

- `backend/.env` - Enthält geheime Schlüssel
- `frontend/.env` - Enthält Konfiguration
- `node_modules/` - Wird durch `npm install` erstellt
- `backend/logs/` - Log-Dateien
- `backend/uploads/` - Hochgeladene Dateien

## 🔄 Synchronisation zwischen Macs

Wenn Sie auf mehreren Macs arbeiten:

1. **Git verwenden** für Code-Änderungen
2. **Datenbank exportieren/importieren** für Daten:
   ```bash
   # Export auf altem Mac:
   mongodump --uri="mongodb://localhost:27017/ordinationssoftware" --out=./backup
   
   # Import auf neuem Mac:
   mongorestore --uri="mongodb://localhost:27017/ordinationssoftware" ./backup/ordinationssoftware
   ```
3. **.env Dateien manuell kopieren** (sicher außerhalb von Git)

## 📚 Nützliche Befehle

### Datenbank-Backup erstellen:
```bash
cd backend
mongodump --uri="mongodb://localhost:27017/ordinationssoftware" --out=./backups/backup-$(date +%Y%m%d)
```

### Logs ansehen:
```bash
# Backend Logs:
tail -f backend/logs/combined.log

# Fehler-Logs:
tail -f backend/logs/error.log
```

### Alle Dependencies aktualisieren:
```bash
# Backend:
cd backend
npm update

# Frontend:
cd ../frontend
npm update
```

## 🎉 Fertig!

Das Projekt sollte jetzt auf dem neuen Mac laufen. Bei Problemen konsultieren Sie die `README.md` oder `QUICK_START_GUIDE.md`.

Viel Erfolg! 🚀





