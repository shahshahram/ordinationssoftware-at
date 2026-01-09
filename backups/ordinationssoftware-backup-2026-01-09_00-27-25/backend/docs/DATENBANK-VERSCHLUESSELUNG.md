# Datenbank-Verschlüsselung (At-Rest Encryption)

## Übersicht

Für vollständige DSGVO-Compliance sollten sensible Daten in der Datenbank verschlüsselt gespeichert werden. Dieses Dokument beschreibt die Implementierung und Konfiguration.

## ✅ Implementierte Lösung: Application-Level Field Encryption

**Status:** ✅ **Vollständig implementiert und produktionsreif**

### Vorteile
- ✅ Funktioniert mit MongoDB Community Edition (kostenlos)
- ✅ Granulare Kontrolle über verschlüsselte Felder
- ✅ Einfache Implementierung
- ✅ Bereits in Produktion einsatzbereit

### Implementierung
- ✅ `backend/utils/fieldEncryption.js` - Verschlüsselungs-Utility
- ✅ AES-256-GCM Verschlüsselung (authentifiziert)
- ✅ Automatische Verschlüsselung/Entschlüsselung
- ✅ Pre/Post Hooks in Models
- ✅ Migration-Script für bestehende Daten

### Verschlüsselte Felder
- ✅ `Patient.insuranceNumber` (SVNR)

## Option 1: Application-Level Field Encryption (Aktuell)

### Konfiguration

1. **Verschlüsselungsschlüssel setzen:**
```bash
# In .env Datei
FIELD_ENCRYPTION_KEY=<64-stelliger Hex-String>
```

**Schlüssel generieren:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Bestehende Daten verschlüsseln:**
```bash
# Dry-Run
node backend/scripts/encrypt-existing-data.js --dry-run

# Verschlüsselung durchführen
node backend/scripts/encrypt-existing-data.js

# Nur bestimmtes Model
node backend/scripts/encrypt-existing-data.js --model=Patient
```

### Verwendung

Die Verschlüsselung erfolgt automatisch beim Speichern:

```javascript
const patient = new Patient({
  firstName: 'Max',
  lastName: 'Mustermann',
  insuranceNumber: '1234567890' // Wird automatisch verschlüsselt
});

await patient.save();
```

Beim Laden wird automatisch entschlüsselt.

### Weitere Felder hinzufügen

1. In `backend/models/Patient.js` (oder entsprechendem Model):
```javascript
const ENCRYPTED_FIELDS = ['insuranceNumber', 'svnr', 'diagnosis']; // Erweitern
```

2. Pre/Post Hooks anpassen (bereits vorhanden)

## Option 2: MongoDB Encryption at Rest (Enterprise Edition)

**Hinweis:** Erfordert MongoDB Enterprise Edition (kostenpflichtig)

### Setup-Script

```bash
# Setup-Script ausführen
./backend/scripts/setup-encryption.sh
```

Das Script:
- Generiert Verschlüsselungsschlüssel
- Erstellt Key-File
- Konfiguriert MongoDB
- Erstellt Backup der Konfiguration

### Manuelle Konfiguration

1. **Key-File erstellen:**
```bash
# Generiere Schlüssel
openssl rand -base64 32 > /etc/mongodb/encryption-key
chmod 600 /etc/mongodb/encryption-key
chown mongodb:mongodb /etc/mongodb/encryption-key
```

2. **MongoDB konfigurieren:**
```yaml
# mongod.conf
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

### Vorteile
- Transparent für die Anwendung
- Automatische Verschlüsselung aller Daten
- Hohe Performance

### Nachteile
- Erfordert MongoDB Enterprise Edition (kostenpflichtig)
- Komplexere Konfiguration

## Konfiguration

### 1. Verschlüsselungsschlüssel setzen

```bash
# In .env Datei
FIELD_ENCRYPTION_KEY=<64-stelliger Hex-String>
```

**Schlüssel generieren:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Felder konfigurieren

In `backend/models/Patient.js`:
```javascript
const ENCRYPTED_FIELDS = ['insuranceNumber'];
```

## Verwendung

### Automatische Verschlüsselung

Die Verschlüsselung erfolgt automatisch beim Speichern:

```javascript
const patient = new Patient({
  firstName: 'Max',
  lastName: 'Mustermann',
  insuranceNumber: '1234567890' // Wird automatisch verschlüsselt
});

await patient.save();
```

### Manuelle Verschlüsselung

```javascript
const { encryptField, decryptField } = require('../utils/fieldEncryption');

const encrypted = encryptField('1234567890');
const decrypted = decryptField(encrypted);
```

## Migration bestehender Daten

```bash
# Script zum Verschlüsseln bestehender Daten
node backend/scripts/encrypt-existing-data.js
```

## Sicherheitshinweise

1. **Schlüssel-Management:**
   - Schlüssel niemals in Git committen
   - Verwenden Sie einen Secrets-Manager (z.B. AWS Secrets Manager, HashiCorp Vault)
   - Regelmäßige Schlüssel-Rotation

2. **Backup:**
   - Verschlüsselte Backups erstellen
   - Schlüssel separat sichern

3. **Performance:**
   - Verschlüsselte Felder können nicht indiziert werden
   - Minimieren Sie die Anzahl verschlüsselter Felder

## Empfehlung

Für Produktionsumgebungen:
1. **Kurzfristig:** Application-Level Field Encryption (bereits implementiert)
2. **Langfristig:** MongoDB Encryption at Rest (bei Upgrade auf Enterprise Edition)

