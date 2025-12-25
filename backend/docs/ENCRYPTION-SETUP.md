# Verschlüsselungs-Setup - Schritt-für-Schritt Anleitung

## Übersicht

Dieses Dokument beschreibt die vollständige Einrichtung der Datenverschlüsselung für die Ordinationssoftware.

## ✅ Empfohlene Lösung: Application-Level Field Encryption

**Status:** ✅ Bereits implementiert und produktionsreif

Diese Lösung funktioniert mit MongoDB Community Edition (kostenlos) und ist bereits vollständig implementiert.

## Schritt 1: Verschlüsselungsschlüssel generieren

```bash
# Generiere einen sicheren 64-stelligen Hex-String
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Ausgabe:** z.B. `a1b2c3d4e5f6...` (64 Zeichen)

## Schritt 2: Schlüssel in .env setzen

```bash
# Öffne .env Datei
nano backend/.env

# Füge hinzu:
FIELD_ENCRYPTION_KEY=<generierter-Schlüssel>
```

**WICHTIG:**
- Schlüssel niemals in Git committen
- Schlüssel sicher aufbewahren (Secrets-Manager)
- Ohne Schlüssel können verschlüsselte Daten nicht entschlüsselt werden

## Schritt 3: Bestehende Daten verschlüsseln

```bash
# 1. Dry-Run (Test ohne Änderungen)
cd /Users/alitahamtaniomran/ordinationssoftware-at
node backend/scripts/encrypt-existing-data.js --dry-run

# 2. Verschlüsselung durchführen
node backend/scripts/encrypt-existing-data.js

# 3. Nur bestimmtes Model verschlüsseln
node backend/scripts/encrypt-existing-data.js --model=Patient
```

**Was passiert:**
- Findet alle Dokumente mit nicht-verschlüsselten Feldern
- Verschlüsselt `insuranceNumber` (und andere konfigurierte Felder)
- Speichert verschlüsselte Versionen

## Schritt 4: Verifizierung

```bash
# Prüfe ob Verschlüsselung funktioniert
mongosh ordinationssoftware --eval 'db.patients.findOne({}, {insuranceNumber: 1})'
```

Verschlüsselte Werte sind Base64-kodiert und haben mindestens 32 Bytes.

## Schritt 5: Weitere Felder hinzufügen (optional)

### Beispiel: SVNR verschlüsseln

1. **Model erweitern:**
```javascript
// backend/models/Patient.js
const ENCRYPTED_FIELDS = ['insuranceNumber', 'svnr']; // Erweitern
```

2. **Pre-Hook erweitern:**
```javascript
PatientSchema.pre('save', function(next) {
  if (this.isModified('svnr') && this.svnr) {
    const { encryptField, isEncrypted } = require('../utils/fieldEncryption');
    if (!isEncrypted(this.svnr)) {
      this.svnr = encryptField(this.svnr);
    }
  }
  next();
});
```

3. **Post-Hook erweitern:**
```javascript
PatientSchema.post(['find', 'findOne'], function(docs) {
  // ... bestehender Code ...
  if (doc.svnr && isEncrypted(doc.svnr)) {
    doc.svnr = decryptField(doc.svnr);
  }
});
```

## Alternative: MongoDB Encryption at Rest (Enterprise)

**Nur wenn MongoDB Enterprise Edition verfügbar**

### Setup

```bash
# Setup-Script ausführen
./backend/scripts/setup-encryption.sh
```

Das Script führt automatisch aus:
1. Prüfung ob Enterprise Edition installiert ist
2. Generierung des Verschlüsselungsschlüssels
3. Erstellung des Key-Files
4. Konfiguration von MongoDB
5. Backup der Konfiguration

### Manuelle Konfiguration

Falls das Script nicht funktioniert:

1. **Key-File erstellen:**
```bash
sudo mkdir -p /etc/mongodb
openssl rand -base64 32 | sudo tee /etc/mongodb/encryption-key
sudo chmod 600 /etc/mongodb/encryption-key
sudo chown mongodb:mongodb /etc/mongodb/encryption-key
```

2. **MongoDB konfigurieren:**
```yaml
# /opt/homebrew/etc/mongod.conf (macOS)
# oder /etc/mongod.conf (Linux)

security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/encryption-key
```

3. **MongoDB neu starten:**
```bash
# macOS
brew services restart mongodb-community

# Linux
sudo systemctl restart mongod
```

4. **Verschlüsselung prüfen:**
```bash
mongosh --eval 'db.adminCommand({getParameter: 1, encryption: 1})'
```

## Sicherheitshinweise

### Schlüssel-Management

1. **Backup:**
   - Key-File separat sichern
   - Nicht in Git committen
   - Verschlüsselt in Secrets-Manager speichern

2. **Schlüssel-Rotation:**
   - Regelmäßige Rotation (z.B. jährlich)
   - Alte Schlüssel für Entschlüsselung behalten
   - Neue Daten mit neuem Schlüssel verschlüsseln

3. **Zugriffskontrolle:**
   - Key-File nur für MongoDB-Benutzer lesbar
   - Keine Berechtigung für andere Benutzer

### Best Practices

1. **Testen in Entwicklung:**
   - Verschlüsselung zuerst in Test-Umgebung testen
   - Backup vor Verschlüsselung erstellen

2. **Monitoring:**
   - Verschlüsselungsfehler überwachen
   - Logs auf Entschlüsselungsfehler prüfen

3. **Dokumentation:**
   - Verschlüsselungskonfiguration dokumentieren
   - Key-File-Location dokumentieren
   - Recovery-Prozess dokumentieren

## Troubleshooting

### Problem: "Verschlüsselungsschlüssel nicht verfügbar"

**Lösung:**
```bash
# Prüfe .env Datei
cat backend/.env | grep FIELD_ENCRYPTION_KEY

# Setze Schlüssel falls fehlt
export FIELD_ENCRYPTION_KEY=<64-stelliger-Hex-String>
```

### Problem: "Entschlüsselung fehlgeschlagen"

**Lösung:**
- Prüfe ob `FIELD_ENCRYPTION_KEY` korrekt gesetzt ist
- Prüfe ob Daten bereits verschlüsselt sind
- Bei Migration: Alte Daten könnten noch unverschlüsselt sein

### Problem: "MongoDB startet nicht nach Encryption-Konfiguration"

**Lösung:**
1. Prüfe MongoDB-Logs:
```bash
tail -f /opt/homebrew/var/log/mongodb/mongo.log
```

2. Prüfe Key-File-Berechtigungen:
```bash
ls -la /etc/mongodb/encryption-key
```

3. Temporär deaktivieren (falls nötig):
```yaml
# mongod.conf
security:
  enableEncryption: false
```

## Empfehlung

**Für Produktion:**
1. ✅ **Kurzfristig:** Application-Level Field Encryption (bereits implementiert)
2. ⏳ **Langfristig:** MongoDB Encryption at Rest (bei Upgrade auf Enterprise Edition)

**Beide Lösungen können parallel verwendet werden:**
- MongoDB Encryption at Rest: Verschlüsselt alle Daten auf Dateisystem-Ebene
- Application-Level Encryption: Zusätzliche Verschlüsselung für besonders sensible Felder

## Support

Bei Problemen:
1. Prüfe MongoDB-Logs
2. Prüfe Application-Logs
3. Teste Verschlüsselung/Entschlüsselung manuell
4. Prüfe Key-File-Berechtigungen

