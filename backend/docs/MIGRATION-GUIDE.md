# Permission-Migration - Schritt-für-Schritt Anleitung

## Vorbereitung

1. **Backup erstellen**
   ```bash
   # MongoDB Backup
   mongodump --uri="mongodb://localhost:27017/ordinationssoftware" --out=./backup
   ```

2. **Umgebung prüfen**
   - MongoDB läuft und ist erreichbar
   - `.env` Datei enthält korrekte `MONGODB_URI`
   - Node.js und npm sind installiert

## Migration durchführen

### Schritt 1: Dry-Run (Test)

```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at
node backend/scripts/migrate-permissions.js --dry-run
```

**Was passiert:**
- Zeigt alle Benutzer mit `user.permissions`
- Zeigt was migriert werden würde
- **Keine Änderungen** werden gespeichert

**Erwartete Ausgabe:**
```
✅ Verbunden mit MongoDB
📊 Gefunden: X Benutzer mit Permissions
🔍 DRY-RUN Modus - keine Änderungen werden gespeichert

👤 Verarbeite Benutzer: user@example.com (USER_ID)
  🔍 Würde 5 Permissions migrieren, 0 übersprungen

📈 Zusammenfassung:
  Verarbeitet: X Benutzer
  Migriert: Y Permission-Gruppen
  Übersprungen: Z Permissions
```

### Schritt 2: Migration ausführen

Wenn der Dry-Run erfolgreich war:

```bash
node backend/scripts/migrate-permissions.js
```

**Was passiert:**
- Migriert `user.permissions` → `rbac.customPermissions`
- Erstellt `permissionHistory` Einträge
- Speichert alle Änderungen

**Erwartete Ausgabe:**
```
✅ Verbunden mit MongoDB
📊 Gefunden: X Benutzer mit Permissions

👤 Verarbeite Benutzer: user@example.com (USER_ID)
  ✅ 5 Permissions migriert, 0 übersprungen

📈 Zusammenfassung:
  Verarbeitet: X Benutzer
  Migriert: Y Permission-Gruppen
  Übersprungen: Z Permissions

✅ Migration abgeschlossen!
```

### Schritt 3: Migration für einen einzelnen Benutzer

```bash
node backend/scripts/migrate-permissions.js --user-id=USER_ID
```

## Über API

Alternativ können Sie die Migration auch über die API durchführen:

```bash
# Dry-Run
curl -X POST http://localhost:5001/api/rbac/migrate-permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"dryRun": true}'

# Migration
curl -X POST http://localhost:5001/api/rbac/migrate-permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"dryRun": false}'

# Migration für einen Benutzer
curl -X POST http://localhost:5001/api/rbac/migrate-permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId": "USER_ID", "dryRun": false}'
```

## Nach der Migration

### 1. Verifizierung

Prüfen Sie, ob die Migration erfolgreich war:

```bash
# Test-Endpoint: Zeigt alle Permissions eines Benutzers
curl -X GET http://localhost:5001/api/rbac/test/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Alte Permissions entfernen (optional)

Nach erfolgreicher Migration können Sie die alten `user.permissions` entfernen:

```javascript
// MongoDB Shell
use ordinationssoftware
db.users.updateMany(
  { permissions: { $exists: true } },
  { $unset: { permissions: "" } }
)
```

**WICHTIG:** Führen Sie dies nur durch, wenn:
- Migration erfolgreich war
- System funktioniert korrekt
- Backup vorhanden ist

### 3. Cache löschen

```bash
curl -X POST http://localhost:5001/api/rbac/test/cache/clear \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Fehlerbehebung

### MongoDB-Verbindungsfehler

```
❌ Fehler bei der Migration: MongooseServerSelectionError
```

**Lösung:**
1. Prüfen Sie, ob MongoDB läuft: `mongod --version`
2. Prüfen Sie die `MONGODB_URI` in `.env`
3. Prüfen Sie Firewall-Einstellungen

### Keine Benutzer gefunden

```
📊 Gefunden: 0 Benutzer mit Permissions
```

**Lösung:**
- Das ist normal, wenn keine Benutzer `user.permissions` haben
- Migration ist nicht nötig

### Permission-Format-Fehler

```
🔍 Würde 0 Permissions migrieren, X übersprungen
```

**Lösung:**
- Prüfen Sie die `user.permissions` Struktur
- Manche Permissions können nicht automatisch migriert werden

## Rollback

Falls etwas schief geht:

1. **Backup wiederherstellen**
   ```bash
   mongorestore --uri="mongodb://localhost:27017/ordinationssoftware" ./backup
   ```

2. **Oder manuell rückgängig machen**
   ```javascript
   // MongoDB Shell
   use ordinationssoftware
   db.users.updateMany(
     { "rbac.customPermissions": { $exists: true } },
     { $unset: { "rbac.customPermissions": "", "rbac.permissionHistory": "" } }
   )
   ```

## Support

Bei Problemen:
1. Prüfen Sie die Logs: `console.log` Ausgaben im Script
2. Prüfen Sie die MongoDB-Logs
3. Prüfen Sie die Test-Endpoints








