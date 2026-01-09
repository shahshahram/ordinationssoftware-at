# Implementierung optionaler Abrechnungsfeatures

## Stand: 02.12.2025

### ✅ Vollständig implementiert:

#### 1. KDok-Integration
- ✅ **KDok-Service** (`backend/services/kdokService.js`)
  - Authentifizierung bei KDok-API
  - Übermittlung einzelner Rechnungen (XML & API)
  - Batch-Übermittlung mehrerer Rechnungen
  - Status-Prüfung von Übermittlungen
  - Automatische Übermittlung ausstehender Rechnungen
  
- ✅ **KDok-Routes** (`backend/routes/kdok.js`)
  - `GET /api/kdok/status` - KDok-Verbindungsstatus prüfen
  - `POST /api/kdok/submit/:invoiceId` - Einzelne Rechnung übermitteln
  - `POST /api/kdok/submit/batch` - Mehrere Rechnungen übermitteln
  - `GET /api/kdok/submission/:submissionId/status` - Status prüfen
  - `POST /api/kdok/auto-submit` - Automatische Übermittlung

#### 2. GIN-Integration (vollständig)
- ✅ **GINA-Service** (`backend/services/ginaService.js`) - bereits vorhanden
  - Authentifizierung bei GINA-API
  - e-card-Validierung über GINA
  - Versicherungsdaten-Abfrage
  - Patientensynchronisierung
  
- ✅ **GINA-Routes** (`backend/routes/gina.js`) - bereits vorhanden
  - `GET /api/gina/status` - GINA-Status prüfen
  - `POST /api/gina/ecard/validate` - e-card über GINA validieren
  - `GET /api/gina/ecard/:ecardNumber/insurance` - Versicherungsdaten abrufen
  - `POST /api/gina/patient/:patientId/sync` - Patientensynchronisierung

- ✅ **Integration in Abrechnungsprozess**
  - Automatische GIN-Übermittlung für Kassenarzt-Rechnungen (wenn `GINA_AUTO_SUBMIT=true`)
  - Integration in `POST /api/billing/invoices` Route

#### 3. Automatische e-card-Validierung
- ✅ **Implementiert in** `backend/routes/billing.js`
  - Automatische Validierung beim Erstellen von Kassenarzt-Rechnungen
  - Versucht zuerst GINA, dann ELGA
  - Aktualisiert Patientendaten mit Versicherungsdaten aus e-card
  - Fehler werden geloggt, aber Rechnung wird trotzdem erstellt

#### 4. Direktverrechnung mit Zusatzversicherungen
- ✅ **DirectBillingService** (`backend/services/directBillingService.js`)
  - Unterstützung für myCare, RehaDirekt, eAbrechnung
  - Automatische System-Erkennung basierend auf Versicherungsgesellschaft
  - Konvertierung von Rechnungen zu System-Format
  - Status-Prüfung von Direktverrechnungen
  
- ✅ **DirectBilling-Routes** (`backend/routes/direct-billing.js`)
  - `POST /api/direct-billing/submit/:invoiceId` - Rechnung übermitteln
  - `GET /api/direct-billing/status/:claimId` - Status prüfen
  - `GET /api/direct-billing/systems` - Verfügbare Systeme abrufen

---

## Konfiguration

### Wo sind die Konfigurationen?

Die Konfigurationen werden über **Umgebungsvariablen** in einer `.env` Datei im `backend/` Verzeichnis gespeichert.

**Wichtige Dateien:**
- `backend/billing-config.env.example` - **Beispiel-Konfiguration für alle neuen Features** (neu erstellt)
- `backend/.env` - **Ihre tatsächliche Konfigurationsdatei** (muss erstellt werden, nicht in Git)
- `backend/config/elga.config.js` - ELGA-Konfiguration (bereits vorhanden)
- `backend/ELGA_GINA_CONFIG.md` - Dokumentation für ELGA/GINA

**So richten Sie die Konfiguration ein:**

1. **Kopieren Sie die Beispiel-Datei:**
   ```bash
   cd backend
   cp billing-config.env.example .env
   ```

2. **Bearbeiten Sie die `.env` Datei** und ersetzen Sie alle `your-...` Werte mit echten Werten

3. **Zertifikate speichern:**
   ```bash
   mkdir -p backend/certs
   # Speichern Sie Ihre Zertifikate in backend/certs/
   ```

### Umgebungsvariablen

#### KDok
```env
KDOK_BASE_URL=https://kdok.gv.at/api
KDOK_CLIENT_ID=your-client-id
KDOK_CLIENT_SECRET=your-client-secret
KDOK_ENVIRONMENT=production
KDOK_AUTO_SUBMIT=true
KDOK_SUBMISSION_METHOD=xml  # oder 'api'
KDOK_BATCH_SIZE=100
KDOK_CLIENT_CERT_PATH=./certs/kdok-client.crt
KDOK_CLIENT_KEY_PATH=./certs/kdok-client.key
KDOK_CA_CERT_PATH=./certs/kdok-ca.crt
KDOK_CERT_PASSPHRASE=your-passphrase
```

#### GINA
```env
GINA_BASE_URL=https://gina.gv.at/api
GINA_CLIENT_ID=your-client-id
GINA_CLIENT_SECRET=your-client-secret
GINA_ENVIRONMENT=production
GINA_AUTO_SUBMIT=true
GINA_CLIENT_CERT_PATH=./certs/gina-client.crt
GINA_CLIENT_KEY_PATH=./certs/gina-client.key
GINA_CA_CERT_PATH=./certs/gina-ca.crt
GINA_CERT_PASSPHRASE=your-passphrase
```

#### Direktverrechnung (myCare)
```env
MYCARE_BASE_URL=https://api.mycare.at
MYCARE_API_KEY=your-api-key
MYCARE_CLIENT_ID=your-client-id
MYCARE_CLIENT_SECRET=your-client-secret
MYCARE_ENABLED=true
MYCARE_TIMEOUT=30000
```

#### Direktverrechnung (RehaDirekt)
```env
REHADIREKT_BASE_URL=https://api.rehadirekt.at
REHADIREKT_API_KEY=your-api-key
REHADIREKT_USERNAME=your-username
REHADIREKT_PASSWORD=your-password
REHADIREKT_ENABLED=true
REHADIREKT_TIMEOUT=30000
```

#### Direktverrechnung (eAbrechnung)
```env
EABRECHNUNG_BASE_URL=https://api.eabrechnung.at
EABRECHNUNG_API_KEY=your-api-key
EABRECHNUNG_CLIENT_ID=your-client-id
EABRECHNUNG_CLIENT_SECRET=your-client-secret
EABRECHNUNG_ENABLED=true
EABRECHNUNG_TIMEOUT=30000
```

---

## Verwendung

### KDok-Übermittlung
```javascript
// Einzelne Rechnung übermitteln
POST /api/kdok/submit/:invoiceId

// Batch-Übermittlung
POST /api/kdok/submit/batch
{
  "invoiceIds": ["id1", "id2", "id3"],
  "billingPeriod": "2025-12"
}

// Status prüfen
GET /api/kdok/submission/:submissionId/status
```

### GIN-Integration
```javascript
// e-card validieren
POST /api/gina/ecard/validate
{
  "ecardNumber": "1234567890",
  "patientData": {...}
}

// Versicherungsdaten abrufen
GET /api/gina/ecard/:ecardNumber/insurance

// Patientensynchronisierung
POST /api/gina/patient/:patientId/sync
```

### Direktverrechnung
```javascript
// Rechnung übermitteln
POST /api/direct-billing/submit/:invoiceId

// Status prüfen
GET /api/direct-billing/status/:claimId?system=myCare

// Verfügbare Systeme
GET /api/direct-billing/systems
```

---

## Automatische Funktionen

### Automatische e-card-Validierung
- Wird automatisch beim Erstellen von Kassenarzt-Rechnungen durchgeführt
- Versucht zuerst GINA, dann ELGA
- Aktualisiert Patientendaten mit Versicherungsdaten

### Automatische GIN-Übermittlung
- Wird automatisch durchgeführt, wenn `GINA_AUTO_SUBMIT=true`
- Nur für Kassenarzt-Rechnungen

### Automatische KDok-Übermittlung
- Kann über `POST /api/kdok/auto-submit` ausgelöst werden
- Übermittelt alle ausstehenden Kassenarzt-Rechnungen

---

## Status

✅ **Alle optionalen Abrechnungsfeatures sind jetzt vollständig implementiert!**

- ✅ KDok-Integration
- ✅ GIN-Integration (vollständig)
- ✅ Automatische e-card-Validierung
- ✅ Direktverrechnung mit Zusatzversicherungen

Die Features sind produktionsbereit und können durch Konfiguration aktiviert werden.

