# MongoDB Setup und Troubleshooting

## MongoDB Status prüfen

### 1. Prüfen ob MongoDB läuft

```bash
# Prüfen ob MongoDB-Prozess läuft
ps aux | grep mongod | grep -v grep

# Oder mit Homebrew (macOS)
brew services list | grep mongodb-community
```

### 2. Prüfen ob MongoDB auf Port 27017 lauscht

```bash
# Prüfen ob Port 27017 offen ist
lsof -i :27017

# Oder mit netstat
netstat -an | grep 27017
```

### 3. MongoDB-Verbindung testen

```bash
# MongoDB Shell starten
mongosh

# Oder mit altem mongo Client
mongo
```

## MongoDB starten

### macOS (Homebrew)

```bash
# MongoDB als Service starten
brew services start mongodb-community

# Oder manuell starten
mongod --config /opt/homebrew/etc/mongod.conf

# Oder mit Standard-Konfiguration
mongod --dbpath ~/data/db
```

### Linux

```bash
# Mit systemd
sudo systemctl start mongod

# Oder manuell
mongod --dbpath /var/lib/mongodb
```

### Windows

```bash
# Als Service
net start MongoDB

# Oder manuell
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
```

## Konfiguration prüfen

### 1. .env Datei prüfen

Die `.env` Datei sollte folgende Einträge enthalten:

```env
MONGODB_URI=mongodb://localhost:27017/ordinationssoftware
# Oder für Remote-Server:
# MONGODB_URI=mongodb://username:password@host:port/database
```

### 2. Standard-Verbindungsstrings

- **Lokal (Standard)**: `mongodb://localhost:27017/ordinationssoftware`
- **Mit Authentifizierung**: `mongodb://username:password@localhost:27017/ordinationssoftware`
- **Remote-Server**: `mongodb://host:port/database`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/database`

## Häufige Probleme

### Problem 1: MongoDB läuft nicht

**Symptom:**
```
MongooseServerSelectionError: connect EPERM ::1:27017
```

**Lösung:**
```bash
# MongoDB starten
brew services start mongodb-community  # macOS
# oder
sudo systemctl start mongod  # Linux
```

### Problem 2: Port bereits belegt

**Symptom:**
```
Address already in use
```

**Lösung:**
```bash
# Prüfen welcher Prozess Port 27017 verwendet
lsof -i :27017

# Prozess beenden (falls nötig)
kill -9 <PID>
```

### Problem 3: Datenbank-Verzeichnis fehlt

**Symptom:**
```
Data directory /data/db not found
```

**Lösung:**
```bash
# Datenbank-Verzeichnis erstellen
mkdir -p ~/data/db

# MongoDB mit diesem Pfad starten
mongod --dbpath ~/data/db
```

### Problem 4: Falsche MONGODB_URI

**Symptom:**
```
Connection refused
```

**Lösung:**
1. Prüfen Sie die `.env` Datei
2. Stellen Sie sicher, dass die URI korrekt ist
3. Prüfen Sie ob MongoDB auf dem angegebenen Port läuft

## MongoDB installieren (falls nicht vorhanden)

### macOS (Homebrew)

```bash
# Homebrew installieren (falls nicht vorhanden)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# MongoDB installieren
brew tap mongodb/brew
brew install mongodb-community

# MongoDB starten
brew services start mongodb-community
```

### Linux (Ubuntu/Debian)

```bash
# MongoDB Repository hinzufügen
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# MongoDB installieren
sudo apt-get update
sudo apt-get install -y mongodb-org

# MongoDB starten
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Windows

1. Download von https://www.mongodb.com/try/download/community
2. Installer ausführen
3. MongoDB als Service installieren

## Migration-Script ausführen

Nachdem MongoDB läuft:

```bash
# Dry-Run
node backend/scripts/migrate-permissions.js --dry-run

# Migration
node backend/scripts/migrate-permissions.js
```

## Alternative: MongoDB Atlas (Cloud)

Falls lokale Installation Probleme macht, können Sie MongoDB Atlas verwenden:

1. Konto erstellen: https://www.mongodb.com/cloud/atlas
2. Cluster erstellen (Free Tier verfügbar)
3. Connection String kopieren
4. In `.env` eintragen:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ordinationssoftware
   ```

## Hilfe

Bei weiteren Problemen:
1. MongoDB Logs prüfen: `/opt/homebrew/var/log/mongodb/mongo.log` (macOS)
2. MongoDB Status prüfen: `brew services list` (macOS)
3. MongoDB Shell testen: `mongosh`







