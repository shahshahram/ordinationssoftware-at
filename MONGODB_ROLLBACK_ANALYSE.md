# MongoDB-Rollback Analyse: Datenverlust-Risiken und Ursachen

**Datum:** 2026-01-12  
**Status:** Analyse abgeschlossen

---

## 🚨 Kann ein MongoDB-Rollback zu Datenverlusten führen?

### **JA - Ein Rollback führt IMMER zu Datenverlusten!**

**Was passiert bei einem Rollback:**
- ✅ Datenbank wird auf einen **älteren Zeitpunkt** zurückgesetzt
- ❌ **Alle Änderungen nach diesem Zeitpunkt gehen verloren**
- ❌ **Neue Daten werden überschrieben**
- ❌ **Aktualisierte Daten werden durch alte Versionen ersetzt**

**Beispiel:**
```
Zeitpunkt A (Backup): Dashboard Widgets Position 1,2,3
Zeitpunkt B (Heute):   Dashboard Widgets Position 3,1,2 (neu angeordnet)
Zeitpunkt C (Rollback): Dashboard Widgets Position 1,2,3 (zurück zu A)
→ Datenverlust: Neue Anordnung (B) ist weg!
```

---

## 🔍 Warum ist ein MongoDB-Rollback passiert?

### **Mögliche Ursachen (nach Wahrscheinlichkeit):**

---

### **1. Manueller Restore über Backup-API** ⭐⭐⭐⭐⭐

**Wahrscheinlichkeit:** Sehr hoch

**Was passiert:**
- Jemand hat die Backup-Restore-Funktion verwendet
- Über die API-Route `/api/backup/restore/:filename`
- Oder direkt über `backupService.restoreBackup()`

**Gefundene Code-Stellen:**
```javascript
// backend/routes/backup.js
// backend/utils/backupService.js
async restoreBackup(backupFileName) {
  const mongorestoreCommand = `mongorestore --uri="${process.env.MONGODB_URI}" --archive="${backupFilePath}" --gzip`;
  // → Überschreibt die gesamte Datenbank!
}
```

**Prüfung:**
- Backend-Logs prüfen: `backend/logs/combined.log`
- Suche nach: `"restore"`, `"mongorestore"`, `"Backup-Wiederherstellung"`
- Prüfen: Wer hat Zugriff auf die Backup-API?

---

### **2. Automatischer Backup-Cleanup mit Fehler** ⭐⭐⭐⭐

**Wahrscheinlichkeit:** Hoch

**Was passiert:**
- Backup-Service löscht alte Backups (`cleanupOldBackups()`)
- Fehler beim Cleanup könnte falsches Backup wiederherstellen
- Oder: Falsches Backup wurde als "aktuell" markiert

**Gefundene Code-Stellen:**
```javascript
// backend/utils/backupService.js
async cleanupOldBackups() {
  // Löscht Backups älter als X Tage
  // → Wenn falsches Backup gelöscht wird, könnte Restore fehlschlagen
}
```

**Prüfung:**
- Backup-Verzeichnis prüfen: `backend/backups/`
- Welche Backups existieren noch?
- Wann wurden Backups erstellt?

---

### **3. MongoDB-Replikation oder Sharding-Problem** ⭐⭐⭐

**Wahrscheinlichkeit:** Mittel (nur bei Cluster-Setup)

**Was passiert:**
- Bei MongoDB-Replikation: Primary-Node fällt aus
- Secondary-Node wird Primary, hat aber ältere Daten
- Oder: Oplog (Operation Log) ist voll, Replikation stoppt

**Prüfung:**
- MongoDB-Konfiguration prüfen: `backend/config/db.js`
- Ist Replikation aktiviert?
- MongoDB-Logs prüfen: `/opt/homebrew/var/log/mongodb/mongo.log`

---

### **4. Datenbank-Crash mit automatischem Recovery** ⭐⭐

**Wahrscheinlichkeit:** Niedrig

**Was passiert:**
- MongoDB stürzt ab (Crash, Stromausfall, etc.)
- Beim Neustart: MongoDB versucht Recovery
- WAL (Write-Ahead Log) ist beschädigt
- MongoDB rollt auf letzten konsistenten Zustand zurück

**Prüfung:**
- MongoDB-Logs prüfen: Crash-Meldungen?
- System-Logs prüfen: Wann wurde MongoDB neu gestartet?
- Prüfen: Gab es Stromausfall oder Systemabsturz?

---

### **5. Falsche Datenbank-URI oder Datenbank-Wechsel** ⭐⭐

**Wahrscheinlichkeit:** Niedrig

**Was passiert:**
- `.env` Datei wurde geändert
- `MONGODB_URI` zeigt auf andere Datenbank
- Oder: Datenbank-Name wurde geändert
- App verbindet sich mit leerer/älterer Datenbank

**Prüfung:**
- `.env` Datei prüfen: `MONGODB_URI` Wert
- Wurde `.env` kürzlich geändert?
- Prüfen: Welche Datenbanken existieren in MongoDB?

---

### **6. Migration-Script mit Fehler** ⭐

**Wahrscheinlichkeit:** Sehr niedrig

**Was passiert:**
- Migrations-Script wurde ausgeführt
- Script hat Datenbank zurückgesetzt (z.B. `migrate-permissions.js`)
- Oder: Script hat falsche Daten importiert

**Gefundene Migrations-Scripts:**
- `backend/scripts/migrate-permissions.js`
- `backend/scripts/migrate-appointment-locationId.js`
- `backend/scripts/migrate-service-categories.js`
- `backend/scripts/migrateToRBAC.js`

**Prüfung:**
- Wurden kürzlich Migrations-Scripts ausgeführt?
- Prüfen: Script-Logs oder Ausgaben

---

### **7. Externe Backup-Software oder Cloud-Service** ⭐⭐⭐

**Wahrscheinlichkeit:** Mittel

**Was passiert:**
- Cloud-Backup-Service (z.B. MongoDB Atlas) hat automatisch wiederhergestellt
- Oder: Externe Backup-Software hat Datenbank überschrieben
- Oder: Manueller Restore über MongoDB-Tools

**Prüfung:**
- Wird MongoDB Atlas verwendet?
- Gibt es externe Backup-Tools?
- Wurden `mongodump`/`mongorestore` manuell ausgeführt?

---

## 📊 Datenverlust-Umfang

### **Was ist betroffen:**

| Daten-Typ | Betroffen? | Risiko |
|-----------|-----------|--------|
| **Dashboard Widgets** | ✅ Ja | Hoch - Positionen verloren |
| **Template Management** | ❓ Unklar | Niedrig - Code-basiert |
| **Patientendaten** | ⚠️ Möglicherweise | Sehr hoch |
| **Rechnungen** | ⚠️ Möglicherweise | Sehr hoch |
| **Termine** | ⚠️ Möglicherweise | Sehr hoch |
| **Benutzer** | ⚠️ Möglicherweise | Hoch |
| **Einstellungen** | ⚠️ Möglicherweise | Mittel |

### **Zeitraum des Datenverlusts:**

**Frage:** Wann wurde das letzte Backup erstellt?

- Wenn Backup von **2026-01-09**: Alle Daten nach diesem Datum sind weg
- Wenn Backup von **2026-01-11**: Nur Daten von heute (2026-01-12) sind weg

---

## 🔍 Diagnose-Schritte

### **Schritt 1: Backup-Verzeichnis prüfen**

```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at/backend/backups
ls -lah
```

**Prüfen:**
- Welche Backups existieren?
- Wann wurden sie erstellt?
- Welches Backup wurde zuletzt verwendet?

---

### **Schritt 2: Backend-Logs prüfen**

```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at/backend/logs
grep -i "restore\|mongorestore\|backup" combined.log | tail -50
```

**Suche nach:**
- `"Backup-Wiederherstellung"`
- `"mongorestore"`
- `"restoreBackup"`
- `"Restore-Fehler"` oder `"Restore-Warnung"`

---

### **Schritt 3: MongoDB-Logs prüfen**

```bash
# macOS (Homebrew)
tail -100 /opt/homebrew/var/log/mongodb/mongo.log

# Oder allgemein
tail -100 /var/log/mongodb/mongod.log
```

**Suche nach:**
- Crash-Meldungen
- Recovery-Meldungen
- Replikation-Fehler

---

### **Schritt 4: .env Datei prüfen**

```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at/backend
cat .env | grep MONGODB_URI
```

**Prüfen:**
- Welche Datenbank-URI wird verwendet?
- Wurde sie kürzlich geändert?
- Zeigt sie auf die richtige Datenbank?

---

### **Schritt 5: MongoDB-Datenbanken auflisten**

```bash
mongosh mongodb://localhost:27017
use admin
show dbs
```

**Prüfen:**
- Welche Datenbanken existieren?
- Welche Datenbank wird verwendet?
- Gibt es mehrere Versionen?

---

### **Schritt 6: Dashboard Widgets in MongoDB prüfen**

```bash
mongosh mongodb://localhost:27017/ordinationssoftware
db.dashboardwidgets.find().sort({updatedAt: -1}).limit(10)
```

**Prüfen:**
- Wann wurden Widgets zuletzt aktualisiert?
- Gibt es Widgets für Ihren User?
- Welche `updatedAt` Zeitstempel gibt es?

---

## 🛡️ Präventions-Maßnahmen

### **1. Backup-Strategie verbessern**

**Aktuell:**
- ✅ Backup-Service existiert (`backupService.js`)
- ✅ Automatische Backups möglich
- ⚠️ Keine automatische Wiederherstellung (gut!)

**Empfehlung:**
- ✅ **Tägliche automatische Backups** einrichten
- ✅ **Backup-Rotation** (z.B. 7 Tage, 4 Wochen, 12 Monate)
- ✅ **Backup-Validierung** vor Restore
- ✅ **Backup-Versionierung** (keine Überschreibung)

---

### **2. Restore-Schutz implementieren**

**Aktuell:**
- ⚠️ Restore-Funktion ist verfügbar über API
- ⚠️ Keine Bestätigung erforderlich

**Empfehlung:**
- ✅ **Zwei-Faktor-Bestätigung** für Restore
- ✅ **Dry-Run Modus** (zeigt was überschrieben wird)
- ✅ **Backup vor Restore** (automatisches Backup vor Restore)
- ✅ **Admin-only** Zugriff auf Restore-Funktion

---

### **3. Audit-Logging**

**Aktuell:**
- ⚠️ Keine Audit-Logs für Datenbank-Operationen

**Empfehlung:**
- ✅ **Alle Restore-Operationen loggen**
- ✅ **Wer hat Restore ausgelöst?**
- ✅ **Wann wurde Restore ausgelöst?**
- ✅ **Welches Backup wurde verwendet?**

---

### **4. Datenbank-Monitoring**

**Empfehlung:**
- ✅ **MongoDB-Ops-Manager** oder **MongoDB Atlas** verwenden
- ✅ **Automatische Alerts** bei ungewöhnlichen Aktivitäten
- ✅ **Datenbank-Versionierung** (Point-in-Time Recovery)

---

## 📋 Sofort-Maßnahmen

### **1. Aktuellen Zustand dokumentieren**

```bash
# MongoDB-Dump erstellen (aktueller Zustand)
mongodump --uri="mongodb://localhost:27017/ordinationssoftware" --out=./backups/current-state-$(date +%Y%m%d-%H%M%S)
```

---

### **2. Backup-Historie prüfen**

```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at/backend/backups
ls -lah | grep backup
```

---

### **3. Logs analysieren**

```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at/backend/logs
grep -i "restore\|backup\|mongorestore" combined.log | tail -100
```

---

### **4. Widgets neu anordnen (falls nötig)**

- Dashboard öffnen
- Edit-Mode aktivieren
- Widgets neu anordnen
- Speichern

---

## 🎯 Zusammenfassung

### **Datenverlust-Risiko:**

| Risiko | Status |
|--------|--------|
| **Dashboard Widgets** | ✅ Bestätigt - Positionen verloren |
| **Andere Daten** | ⚠️ Unklar - Prüfung erforderlich |
| **Zeitraum** | ⚠️ Unklar - Backup-Datum prüfen |

### **Wahrscheinlichste Ursache:**

1. ⭐⭐⭐⭐⭐ **Manueller Restore** über Backup-API
2. ⭐⭐⭐⭐ **Automatischer Backup-Cleanup** mit Fehler
3. ⭐⭐⭐ **Externe Backup-Software** oder Cloud-Service

### **Nächste Schritte:**

1. ✅ **Backend-Logs prüfen** (Restore-Operationen)
2. ✅ **Backup-Verzeichnis prüfen** (welche Backups existieren?)
3. ✅ **MongoDB-Logs prüfen** (Crash/Recovery?)
4. ✅ **Dashboard Widgets neu anordnen** (Sofort-Lösung)

---

**Wichtig:** Ein Rollback führt **IMMER** zu Datenverlusten. Die Frage ist nur: **Wie viel** und **welche Daten** sind betroffen.
