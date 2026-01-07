# ELGA & GINA Integration - Implementierungsübersicht

## ✅ Implementierte Funktionen

### 1. ELGA (Elektronische Gesundheitsakte)

#### Backend
- ✅ **Routes** (`backend/routes/elga.js`):
  - `GET /api/elga/status` - ELGA-Systemstatus prüfen
  - `GET /api/elga/patient/:patientId/status` - Patient-Status abrufen
  - `POST /api/elga/patient/:patientId/sync` - Patientensynchronisierung
  - `GET /api/elga/patient/:patientId/medication` - e-Medikation abrufen
  - `GET /api/elga/patient/:patientId/prescriptions` - e-Rezepte abrufen
  - `GET /api/elga/patient/:patientId/documents` - ELGA-Dokumente abrufen
  - `GET /api/elga/patient/:patientId/documents/:documentId` - Einzelnes Dokument abrufen
  - `POST /api/elga/patient/:patientId/documents/upload` - Dokument zu ELGA hochladen

#### Frontend
- ✅ **ELGA-Seite** (`frontend/src/pages/ELGA.tsx`):
  - ELGA-Systemstatus-Anzeige
  - Patient-Auswahl mit Autocomplete
  - Tabs für e-Medikation, e-Rezepte, e-Befunde
  - Synchronisierungsfunktion
  - Dokumentenverwaltung

### 2. GINA (Gesundheits-Informations-Netz-Adapter)

#### Backend
- ✅ **Service** (`backend/services/ginaService.js`):
  - Authentifizierung bei GINA-API
  - e-card Validierung über GINA
  - Versicherungsdaten-Abfrage
  - Patientensynchronisierung
  - Konfigurationsvalidierung

- ✅ **Routes** (`backend/routes/gina.js`):
  - `GET /api/gina/status` - GINA-Status prüfen
  - `POST /api/gina/ecard/validate` - e-card über GINA validieren
  - `GET /api/gina/ecard/:ecardNumber/insurance` - Versicherungsdaten abrufen
  - `POST /api/gina/patient/:patientId/sync` - Patientensynchronisierung

### 3. e-card Validierung

#### Backend
- ✅ **Routes** (`backend/routes/ecard.js`):
  - `GET /api/ecard/patient/:patientId` - e-card Informationen abrufen
  - `POST /api/ecard/patient/:patientId/validate` - e-card validieren
  - `POST /api/ecard/patient/:patientId/sync` - e-card synchronisieren
  - `GET /api/ecard/patient/:patientId/history` - Validierungshistorie abrufen
  - `GET /api/ecard/status` - Systemstatus prüfen

#### Frontend
- ✅ **e-card Validierungskomponente** (`frontend/src/components/ECardValidation.tsx`):
  - e-card Validierungs-UI
  - Status-Anzeige (gültig/ungültig/abgelaufen)
  - Synchronisierungsfunktion mit ELGA
  - Validierungshistorie
  - ELGA-Status-Anzeige

- ✅ **Integration in Patientenverwaltung** (`frontend/src/pages/Patients.tsx`):
  - e-card Validierung im Tab "Versicherung"
  - Automatische Aktualisierung nach Validierung
  - Status-Anzeige in Patientendetails

## 📋 Konfiguration

### Umgebungsvariablen

Siehe `backend/ELGA_GINA_CONFIG.md` für eine vollständige Liste aller Umgebungsvariablen.

Kopieren Sie `backend/.env.example.elga.gina` zu Ihrer `.env` Datei und füllen Sie die Werte aus.

### Zertifikate

1. Erstellen Sie das Zertifikatsverzeichnis:
   ```bash
   mkdir -p backend/certs
   ```

2. Beantragen Sie Zertifikate:
   - **ELGA:** https://www.elga.gv.at/
   - **GINA/SVC:** https://www.svc.at/

3. Speichern Sie die Zertifikate:
   - `backend/certs/elga-client.crt`
   - `backend/certs/elga-client.key`
   - `backend/certs/gina-client.crt`
   - `backend/certs/gina-client.key`

4. Setzen Sie die Berechtigungen:
   ```bash
   chmod 600 backend/certs/*.key
   chmod 644 backend/certs/*.crt
   ```

Siehe `backend/certs/README.md` für weitere Details.

## 🚀 Verwendung

### ELGA-Seite öffnen

1. Navigieren Sie zu `/elga` in der Anwendung
2. Wählen Sie einen Patienten aus
3. Verwenden Sie die Tabs für e-Medikation, e-Rezepte und e-Befunde

### e-card validieren

1. Öffnen Sie einen Patienten in der Patientenverwaltung
2. Gehen Sie zum Tab "Versicherung"
3. Scrollen Sie nach unten zur e-card Validierung
4. Geben Sie die e-card Nummer ein und klicken Sie auf "Validieren"

### Patientensynchronisierung

1. In der ELGA-Seite: Klicken Sie auf "Mit ELGA synchronisieren"
2. In der Patientenverwaltung: Klicken Sie auf das Synchronisierungs-Icon in der e-card Validierung

## 🔧 API-Endpunkte

### ELGA

- `GET /api/elga/status` - Systemstatus
- `GET /api/elga/patient/:id/status` - Patient-Status
- `POST /api/elga/patient/:id/sync` - Synchronisierung
- `GET /api/elga/patient/:id/medication` - e-Medikation
- `GET /api/elga/patient/:id/prescriptions` - e-Rezepte
- `GET /api/elga/patient/:id/documents` - Dokumente

### GINA

- `GET /api/gina/status` - Systemstatus
- `POST /api/gina/ecard/validate` - e-card Validierung
- `GET /api/gina/ecard/:number/insurance` - Versicherungsdaten
- `POST /api/gina/patient/:id/sync` - Synchronisierung

### e-card

- `GET /api/ecard/patient/:id` - e-card Informationen
- `POST /api/ecard/patient/:id/validate` - Validierung
- `POST /api/ecard/patient/:id/sync` - Synchronisierung
- `GET /api/ecard/patient/:id/history` - Historie
- `GET /api/ecard/status` - Systemstatus

## 📝 Nächste Schritte

1. **Zertifikate beantragen:**
   - Kontaktieren Sie ELGA und GINA/SVC für Produktions-Zertifikate

2. **Umgebungsvariablen konfigurieren:**
   - Füllen Sie die `.env` Datei mit Ihren Credentials aus

3. **Testen:**
   - Testen Sie die Integration in der Test-Umgebung
   - Prüfen Sie die e-card Validierung
   - Testen Sie die ELGA-Datenabfrage

4. **Produktion:**
   - Wechseln Sie zu Produktions-Zertifikaten
   - Aktualisieren Sie die Umgebungsvariablen
   - Überwachen Sie die Logs

## 🔒 Sicherheit

- ✅ Zertifikate sind in `.gitignore` eingetragen
- ✅ Private Schlüssel haben eingeschränkte Berechtigungen (600)
- ✅ Umgebungsvariablen werden nicht committet
- ✅ HTTPS wird für alle API-Aufrufe empfohlen

## 📚 Weitere Ressourcen

- **ELGA Dokumentation:** https://www.elga.gv.at/technik/
- **GINA/SVC:** https://www.svc.at/
- **e-card:** https://www.e-card.gv.at/
- **Konfigurationsdokumentation:** `backend/ELGA_GINA_CONFIG.md`
- **Zertifikatsanleitung:** `backend/certs/README.md`


























