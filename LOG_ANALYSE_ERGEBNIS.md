# Log-Analyse Ergebnis: MongoDB-Rollback Untersuchung

**Datum der Analyse:** 2026-01-12  
**Status:** Abgeschlossen

---

## 🔍 Durchgeführte Prüfungen

### 1. Backend-Logs (combined.log & error.log)

**Dateigröße:**
- `combined.log`: 4.4 MB (8876 Zeilen)
- `error.log`: 3.3 MB (275 Zeilen)
- Letzte Aktualisierung: 12.01.2026 08:00

---

### 2. Restore-Operationen

**Ergebnis:** ❌ **KEINE Restore-Operationen gefunden**

**Geprüfte Begriffe:**
- `restore`
- `mongorestore`
- `Backup-Wiederherstellung`
- `backup.*restore`

**Befund:**
- ✅ Keine Log-Einträge für manuelle Restore-Operationen
- ✅ Keine Log-Einträge für automatische Restore-Operationen
- ✅ Keine API-Aufrufe zu `/api/backup/restore`

**Fazit:** Ein manueller Restore über die Backup-API ist **unwahrscheinlich**.

---

### 3. Backup-Operationen

**Ergebnis:** ✅ **Automatische Backups laufen täglich**

**Gefundene Backups:**
- ✅ Täglich um 02:00 Uhr (Schedule: `0 2 * * *`)
- ✅ Letztes Backup: 12.01.2026 02:00 (`backup-2026-01-12T01-00-00-713Z.tar.gz`)
- ✅ Vorheriges Backup: 11.01.2026 02:00 (`backup-2026-01-11T01-00-00-730Z.tar.gz`)
- ✅ Backup vom 09.01.2026: `backup-2026-01-09T01-00-00-683Z.tar.gz`

**Backup-Cleanup:**
- ✅ Alte Backups werden automatisch gelöscht (älter als 30 Tage)
- ✅ Am 10.01.2026 wurden mehrere alte Backups gelöscht (vom 05.12.2025 bis 10.12.2025)

**Backup-Verzeichnis:**
```
backup-2025-12-13T01-00-00-442Z.tar.gz  (8.8M)
backup-2025-12-14T01-00-00-675Z.tar.gz  (8.8M)
...
backup-2026-01-05T01-00-00-617Z.tar.gz  (9.7M)
backup-2026-01-06T01-00-00-272Z.tar.gz  (9.8M)
backup-2026-01-07T01-00-00-604Z.tar.gz  (9.9M)
backup-2026-01-09T01-00-00-683Z.tar.gz  (6.1M) ⚠️
```

**⚠️ Auffälligkeit:**
- Backup vom 09.01.2026 ist **deutlich kleiner** (6.1M vs. 9.9M)
- Backups vom 10., 11. und 12.01.2026 sind **nicht im Verzeichnis sichtbar**
- Logs zeigen aber, dass Backups erstellt wurden

**Mögliche Erklärung:**
- Backups wurden erstellt, aber dann gelöscht (Cleanup-Fehler?)
- Oder: Backups wurden in ein anderes Verzeichnis verschoben

---

### 4. MongoDB-Verbindungen

**Ergebnis:** ✅ **Keine Verbindungsprobleme**

**Geprüfte Begriffe:**
- `mongodb.*verbunden`
- `mongodb.*connected`
- `mongodb.*error`
- `mongodb.*crash`
- `mongodb.*recovery`

**Befund:**
- ✅ Keine Crash-Meldungen
- ✅ Keine Recovery-Meldungen
- ✅ Keine Verbindungsfehler

**Fazit:** MongoDB läuft stabil, keine Abstürze.

---

### 5. Dashboard-Widget-Operationen

**Ergebnis:** ⚠️ **Keine spezifischen Logs gefunden**

**Geprüfte Begriffe:**
- `dashboard.*widget`
- `widget.*dashboard`
- `GET.*dashboard`
- `POST.*dashboard`
- `PUT.*dashboard`
- `/api/dashboard`

**Befund:**
- ⚠️ Keine spezifischen Logs zu Widget-Operationen
- ⚠️ Keine API-Aufrufe zu Dashboard-Widget-Endpoints

**Mögliche Erklärung:**
- Widget-Operationen werden nicht geloggt
- Oder: Logs sind zu alt und wurden rotiert

---

### 6. Fehler und Warnungen

**Ergebnis:** ⚠️ **Einzelne Backup-Fehler gefunden**

**Gefundene Fehler:**
```
2025-12-05 03:08:41 - Backup-Fehler:
mongodump --uri="undefined" --archive="backups/backup-2025-12-05T02-08-40-736Z.tar.gz" --gzip
error parsing command line options: error parsing uri: scheme must be "mongodb" or "mongodb+srv"
```

**Befund:**
- ⚠️ Am 05.12.2025: Backup-Fehler wegen `MONGODB_URI=undefined`
- ✅ Seitdem keine Backup-Fehler mehr

**Fazit:** Backup-Fehler sind alt und nicht relevant für aktuelles Problem.

---

## 📊 Zusammenfassung

### **Was wir wissen:**

| Aspekt | Status | Details |
|--------|--------|---------|
| **Restore-Operationen** | ❌ Nicht gefunden | Keine manuellen oder automatischen Restores |
| **Backup-Operationen** | ✅ Funktionieren | Täglich um 02:00 Uhr |
| **MongoDB-Crashes** | ❌ Nicht gefunden | Keine Abstürze oder Recovery |
| **Backup-Fehler** | ⚠️ Alte Fehler | Nur vom 05.12.2025 |
| **Dashboard-Widget-Logs** | ⚠️ Nicht gefunden | Keine spezifischen Logs |

### **Was wir NICHT wissen:**

1. ⚠️ **Warum ist Backup vom 09.01.2026 kleiner?** (6.1M vs. 9.9M)
2. ⚠️ **Wo sind Backups vom 10., 11. und 12.01.2026?** (Logs zeigen Erstellung, aber Dateien fehlen)
3. ⚠️ **Wurde ein Backup manuell wiederhergestellt?** (Keine Logs, aber möglich über MongoDB-Tools)
4. ⚠️ **Wurden Dashboard-Widgets gelöscht oder überschrieben?** (Keine Logs gefunden)

---

## 🎯 Mögliche Ursachen (aktualisiert)

### **1. Manueller Restore über MongoDB-Tools** ⭐⭐⭐⭐

**Wahrscheinlichkeit:** Hoch

**Was passiert:**
- Jemand hat `mongorestore` **direkt** ausgeführt (nicht über API)
- Keine Logs im Backend, weil es außerhalb der App passiert ist
- Backup vom 09.01.2026 wurde verwendet (6.1M - kleiner, könnte unvollständig sein)

**Prüfung:**
```bash
# MongoDB-Logs prüfen (falls verfügbar)
tail -100 /opt/homebrew/var/log/mongodb/mongo.log

# Oder: Terminal-Historie prüfen
history | grep mongorestore
```

---

### **2. Backup-Cleanup hat falsches Backup gelöscht** ⭐⭐⭐

**Wahrscheinlichkeit:** Mittel

**Was passiert:**
- Backup-Cleanup löscht Backups älter als 30 Tage
- Am 10.01.2026 wurden mehrere Backups gelöscht
- Möglicherweise wurde ein falsches Backup gelöscht oder wiederhergestellt

**Prüfung:**
- Backup-Verzeichnis prüfen: Welche Backups existieren noch?
- Prüfen: Wurde ein Backup versehentlich wiederhergestellt?

---

### **3. Datenbank-Wechsel oder falsche Datenbank-URI** ⭐⭐

**Wahrscheinlichkeit:** Niedrig

**Was passiert:**
- `.env` Datei wurde geändert
- App verbindet sich mit anderer Datenbank
- Oder: Datenbank-Name wurde geändert

**Prüfung:**
```bash
cd backend
cat .env | grep MONGODB_URI
```

---

### **4. MongoDB-Ops-Manager oder Cloud-Service** ⭐⭐⭐

**Wahrscheinlichkeit:** Mittel

**Was passiert:**
- MongoDB Atlas oder Ops Manager hat automatisch wiederhergestellt
- Oder: Externe Backup-Software hat Datenbank überschrieben

**Prüfung:**
- Wird MongoDB Atlas verwendet?
- Gibt es externe Backup-Tools?
- Prüfen: Cloud-Service-Logs

---

## 🔍 Nächste Schritte

### **Schritt 1: MongoDB-Logs prüfen**

```bash
# macOS (Homebrew)
tail -200 /opt/homebrew/var/log/mongodb/mongo.log

# Oder allgemein
tail -200 /var/log/mongodb/mongod.log
```

**Suche nach:**
- `mongorestore` Befehle
- Recovery-Meldungen
- Crash-Meldungen

---

### **Schritt 2: Terminal-Historie prüfen**

```bash
# Bash-Historie
history | grep -i "mongorestore\|mongodump\|restore"

# Zsh-Historie
history | grep -i "mongorestore\|mongodump\|restore"
```

---

### **Schritt 3: Backup-Verzeichnis genauer prüfen**

```bash
cd backend/backups
ls -lah backup-2026-01-*.tar.gz
# Prüfen: Existieren Backups vom 10., 11., 12.01.2026?
```

---

### **Schritt 4: .env Datei prüfen**

```bash
cd backend
cat .env | grep MONGODB_URI
# Prüfen: Wurde MONGODB_URI kürzlich geändert?
```

---

### **Schritt 5: MongoDB-Datenbanken auflisten**

```bash
mongosh mongodb://localhost:27017
show dbs
use ordinationssoftware
db.dashboardwidgets.find().sort({updatedAt: -1}).limit(10)
```

**Prüfen:**
- Welche Datenbanken existieren?
- Welche Datenbank wird verwendet?
- Wann wurden Widgets zuletzt aktualisiert?

---

## 💡 Empfehlung

### **Sofort-Maßnahmen:**

1. ✅ **Aktuellen Zustand sichern:**
   ```bash
   mongodump --uri="mongodb://localhost:27017/ordinationssoftware" --out=./backups/current-state-$(date +%Y%m%d-%H%M%S)
   ```

2. ✅ **Dashboard Widgets neu anordnen** (falls nötig)

3. ⚠️ **MongoDB-Logs prüfen** (falls verfügbar)

4. ⚠️ **Terminal-Historie prüfen** (falls verfügbar)

---

## 📋 Fazit

**Hauptbefund:**
- ❌ **KEINE Restore-Operationen in Backend-Logs**
- ✅ **Automatische Backups laufen täglich**
- ⚠️ **Backup vom 09.01.2026 ist kleiner** (6.1M vs. 9.9M)
- ⚠️ **Backups vom 10., 11., 12.01.2026 fehlen im Verzeichnis**

**Wahrscheinlichste Ursache:**
1. ⭐⭐⭐⭐ **Manueller Restore über MongoDB-Tools** (außerhalb der App)
2. ⭐⭐⭐ **Backup-Cleanup-Fehler** (falsches Backup gelöscht/wiederhergestellt)
3. ⭐⭐⭐ **Externe Backup-Software** (MongoDB Atlas, Ops Manager)

**Nächster Schritt:**
- MongoDB-Logs prüfen (falls verfügbar)
- Terminal-Historie prüfen (falls verfügbar)
- Dashboard Widgets neu anordnen (Sofort-Lösung)

---

**Wichtig:** Da keine Restore-Logs gefunden wurden, ist ein **manueller Restore über MongoDB-Tools** (außerhalb der App) am wahrscheinlichsten. Dies würde erklären, warum keine Logs im Backend vorhanden sind.
