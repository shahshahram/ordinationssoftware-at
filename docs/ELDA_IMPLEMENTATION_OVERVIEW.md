# ELDA-Implementierung - Übersicht

## ✅ Vollständig implementiert

Die ELDA-Integration (Elektronischer Datenaustausch mit österreichischen Sozialversicherungsträgern) ist vollständig im System implementiert.

---

## 📋 Implementierte Komponenten

### 1. **ELDA-Konfiguration** (`backend/config/elda.config.js`)

**Funktionen:**
- ✅ Konfiguration für **3 Umgebungen**: Production, Test, SIT
- ✅ **FTPS-Konfiguration** (aktuell verfügbar)
  - Production: `ftps.elda.at:21`
  - Test: `ftps-test.elda.at:21`
  - SIT: Nicht unterstützt
- ✅ **Webservice-Konfiguration** (ab 02.02.2026 produktiv)
  - Production: `https://online.elda.at/elda-online/servlet/WebTrans` (ab 02.02.2026)
  - Test: `https://online-test.elda.at/elda-online/servlet/WebTrans` (bereits verfügbar)
  - SIT: `https://online-itu5test.elda.at/elda-online/servlet/WebTrans` (bereits verfügbar)
- ✅ **Automatische Methodenauswahl** (`auto`): Webservice wenn verfügbar, sonst FTPS
- ✅ **Zertifikats-Verwaltung** (Client-Zertifikate für FTPS/Webservice)
- ✅ **Credentials-Verwaltung** (FTPS Username/Password)
- ✅ **Konfigurations-Validierung**
- ✅ **Dateigrößenlimits**: FTPS (220 MB), Webservice (40 MB)
- ✅ **Timeout-Einstellungen**: FTPS (60s), Webservice (30s)

**Umgebungsvariablen:**
```bash
ELDA_ENVIRONMENT=test|sit|production
ELDA_DEFAULT_METHOD=ftps|webservice|auto
ELDA_API_KEY=<API-Key für Webservice>
ELDA_FTPS_USERNAME=<FTPS-Username>
ELDA_FTPS_PASSWORD=<FTPS-Password>
ELDA_CERT_PATH=./backend/certs/elda-client.crt
ELDA_KEY_PATH=./backend/certs/elda-client.key
ELDA_CA_PATH=./backend/certs/elda-ca.crt (optional)
```

---

### 2. **ELDA-Connector** (`backend/services/connectors/eldaConnector.js`)

**Funktionen:**
- ✅ **FTPS-Übertragung** (`sendViaFTPS`)
  - Verbindung mit FTPS-Server
  - Datei-Upload (XML-Format)
  - Zertifikats-basierte Authentifizierung
  - Fehlerbehandlung und Retry-Logik
- ✅ **Webservice-Übertragung** (`sendViaWebservice`)
  - REST-API-Aufrufe
  - JSON/XML-Payload
  - API-Key-Authentifizierung
  - HTTPS mit Client-Zertifikaten
- ✅ **Automatische Methodenauswahl** (`send`)
  - Wählt automatisch zwischen FTPS und Webservice
  - Berücksichtigt Verfügbarkeit und Konfiguration
  - Automatische Format-Generierung (optional)
- ✅ **Verbindungstest** (`testConnection`)
  - Testet FTPS-Verbindung
  - Testet Webservice-Verbindung
  - Gibt detaillierte Fehlermeldungen zurück
- ✅ **Verfügbare Methoden** (`getAvailableMethods`)
  - Listet verfügbare Übertragungsmethoden auf
  - Berücksichtigt Umgebung und Konfiguration
- ✅ **Payload-Validierung** (Größe, Format)
- ✅ **Fehlerbehandlung** mit detaillierten Meldungen

**Methoden:**
```javascript
async send(payload, datasetType, method = null, autoFormat = true)
async testConnection(method = null)
getAvailableMethods()
async sendViaFTPS(payload, datasetType)
async sendViaWebservice(payload, datasetType)
```

---

### 3. **ELDA-Format-Generator** (`backend/services/eldaFormatGenerator.js`)

**Implementierte Datensatztypen:**

#### ✅ **KSB (Krankenstandsbescheinigung)**
- Patientendaten (SV-Nummer, Name, Geburtsdatum, Adresse)
- Arztdaten (Steuernummer, Kammernummer, Name, Fachrichtung, Adresse)
- Krankheitsdaten (Beginn, Ende, voraussichtliche Dauer, arbeitsunfähig)
- Diagnose (ICD-10-Code, Beschreibung, primär)
- Bemerkungen
- Metadaten (Erstellt von, Zeitpunkt, System)

#### ✅ **Lohnmeldung**
- Arbeitnehmerdaten (SV-Nummer, Name, Geburtsdatum)
- Arbeitgeberdaten (Firmenname, Adresse, SV-Nummer)
- Zeitraum (von, bis)
- Lohn-/Gehaltsdaten (Brutto, Netto, Abzüge)
- Versicherungsdaten (Versicherungsart, Beitragssatz)
- Metadaten

#### ✅ **Abrechnung** (Kassenabrechnung)
- Patientendaten (SV-Nummer, Name, Geburtsdatum, Adresse)
- Arztdaten (Steuernummer, Kammernummer, Name, Fachrichtung, Adresse)
- Leistungsdaten (Leistungs-Code, Beschreibung, Datum, Betrag, Tarifart)
- Abrechnungsdaten (Rechnungsnummer, Rechnungsdatum, Gesamtbetrag)
- Metadaten

**Funktionen:**
- ✅ `generateKSB(data)` - Generiert KSB-Datensatz
- ✅ `generateLohnmeldung(data)` - Generiert Lohnmeldungs-Datensatz
- ✅ `generateAbrechnung(data)` - Generiert Abrechnungs-Datensatz
- ✅ `generateXML(payload, datasetType)` - Konvertiert JSON zu XML
- ✅ `validateDataset(data, datasetType)` - Validiert Datensatz
- ✅ `generateSerialNumber(type)` - Generiert eindeutige Seriennummer
- ✅ `formatDate(date)` - Formatiert Datum im ELDA-Format
- ✅ `escapeXML(text)` - Escaped XML-Sonderzeichen

---

### 4. **ELDA-API-Routen** (`backend/routes/elda.js`)

**Implementierte Endpunkte:**

#### ✅ `GET /api/elda/status`
- Prüft ELDA-Systemstatus
- Zeigt Konfiguration, verfügbare Methoden, Fehler
- **Zugriff**: `settings.read`

#### ✅ `POST /api/elda/test-connection`
- Testet ELDA-Verbindung (FTPS oder Webservice)
- Gibt detaillierte Ergebnisse zurück
- **Zugriff**: `settings.read`
- **Parameter**: `method` (optional: 'ftps' oder 'webservice')

#### ✅ `POST /api/elda/send`
- Sendet Daten an ELDA
- Automatische Format-Generierung (optional)
- **Zugriff**: `billing.write`
- **Parameter**:
  - `payload` (erforderlich): Datensatz
  - `datasetType` (erforderlich): 'KSB', 'Lohnmeldung', 'Abrechnung'
  - `method` (optional): 'ftps' oder 'webservice'
  - `autoFormat` (optional, default: true): Automatische Format-Generierung

#### ✅ `POST /api/elda/format/:datasetType`
- Generiert ELDA-Format für Datensatztyp
- Validiert Datensatz vor Generierung
- **Zugriff**: `settings.read`
- **Parameter**: `datasetType` (KSB, Lohnmeldung, Abrechnung)
- **Body**: `data` (Rohdaten)

#### ✅ `GET /api/elda/config`
- Ruft ELDA-Konfiguration ab (ohne sensible Daten)
- **Zugriff**: `settings.read`

#### ✅ `GET /api/elda/methods`
- Listet verfügbare Übertragungsmethoden auf
- **Zugriff**: `settings.read`

---

### 5. **Frontend-Teststrecke** (`frontend/src/pages/ELDATestPage.tsx`)

**Implementierte Features:**
- ✅ **Status-Anzeige**
  - Konfigurationsstatus
  - Verfügbare Methoden
  - Fehleranzeige
- ✅ **Verbindungstest-Tab**
  - Auswahl der Übertragungsmethode (FTPS/Webservice)
  - Verbindungstest durchführen
  - Detaillierte Ergebnisse anzeigen
- ✅ **Daten senden-Tab**
  - Payload-Eingabe (JSON)
  - Datensatztyp-Auswahl (KSB, Lohnmeldung, Abrechnung)
  - Übertragungsmethode-Auswahl
  - Automatische Format-Generierung (Checkbox)
  - Ergebnisse anzeigen
- ✅ **Format generieren-Tab**
  - Datensatztyp-Auswahl
  - Rohdaten-Eingabe (JSON)
  - Format-Generierung
  - Generiertes Format anzeigen (JSON/XML)

**Navigation:**
- **Menü**: Abrechnung → ELDA Teststrecke
- **Route**: `/elda-test`
- **Berechtigung**: `settings.read`

---

### 6. **Einstellungen-Integration** (`frontend/src/pages/Settings.tsx`)

**Implementierte Einstellungen:**
- ✅ **ELDA aktivieren/deaktivieren** (`eldaEnabled`)
  - Switch-Komponente
  - Wird in `user.profile.preferences.eldaEnabled` gespeichert
- ✅ **ELDA-Methode** (`eldaMethod`)
  - Auswahl: `ftps`, `webservice`, `auto`
  - Wird in `user.profile.preferences.eldaMethod` gespeichert
- ✅ **ELDA-Umgebung** (`eldaEnvironment`)
  - Auswahl: `production`, `test`, `sit`
  - Wird in `user.profile.preferences.eldaEnvironment` gespeichert

**Speicherung:**
- Einstellungen werden via `PUT /api/auth/profile` gespeichert
- Werden in `User.profile.preferences` gespeichert

---

### 7. **Billing-Service-Integration** (`backend/services/billingService.js`)

**Automatische ELDA-Übermittlung:**
- ✅ **Nach erfolgreicher Kassenabrechnung**
  - Wird automatisch aufgerufen, wenn `eldaEnabled = true`
  - Nur für Kassenabrechnungen (`tariffType === 'kassa'`)
  - Generiert ELDA-Abrechnungs-Datensatz
  - Sendet an ELDA (FTPS oder Webservice)
  - Loggt Erfolg/Fehler in BillingAudit
- ✅ **Fehlerbehandlung**
  - ELDA-Fehler sind nicht kritisch
  - Abrechnung war bereits erfolgreich
  - Fehler werden geloggt, aber nicht geworfen

**Methode:**
```javascript
async submitToELDA(job, billingResponse)
```

**Ablauf:**
1. Prüft ob ELDA aktiviert ist (`doctor.profile.preferences.eldaEnabled`)
2. Prüft ob Kassenabrechnung (`tariffType === 'kassa'`)
3. Lädt Performance, Patient, Doctor
4. Generiert ELDA-Abrechnungs-Datensatz
5. Bestimmt ELDA-Methode (`eldaMethod` oder `auto`)
6. Sendet an ELDA
7. Loggt in BillingAudit

---

### 8. **User-Model-Erweiterung** (`backend/models/User.js`)

**Hinzugefügte Felder:**
- ✅ `profile.preferences.eldaEnabled` (Boolean, default: false)
- ✅ `profile.preferences.eldaMethod` (String, enum: ['ftps', 'webservice', 'auto'], default: 'auto')
- ✅ `profile.preferences.eldaEnvironment` (String, enum: ['production', 'test', 'sit'], default: 'test')

---

### 9. **Auth-Routes-Erweiterung** (`backend/routes/auth.js`)

**Validierung:**
- ✅ `profile.preferences.eldaEnabled` (optional, Boolean)
- ✅ `profile.preferences.eldaMethod` (optional, enum: ['ftps', 'webservice', 'auto'])
- ✅ `profile.preferences.eldaEnvironment` (optional, enum: ['production', 'test', 'sit'])

---

## 🔄 Workflow

### Automatische ELDA-Übermittlung

1. **Leistung erstellen** (Performance)
2. **One-Click-Billing** auslösen
3. **Kassenabrechnung** wird verarbeitet
4. **Nach erfolgreicher Abrechnung:**
   - Prüft ob ELDA aktiviert ist
   - Generiert ELDA-Abrechnungs-Datensatz
   - Sendet an ELDA (FTPS oder Webservice)
   - Loggt in BillingAudit

### Manuelle ELDA-Übermittlung

1. **ELDA Teststrecke** öffnen
2. **Daten senden** Tab
3. **Payload** eingeben (oder automatisch generieren lassen)
4. **Datensatztyp** auswählen (KSB, Lohnmeldung, Abrechnung)
5. **Übertragungsmethode** auswählen (FTPS/Webservice)
6. **Senden**

---

## 📊 Unterstützte Datensatztypen

| Datensatztyp | Status | Beschreibung |
|-------------|--------|--------------|
| **KSB** | ✅ Implementiert | Krankenstandsbescheinigung |
| **Lohnmeldung** | ✅ Implementiert | Lohn-/Gehaltsmeldung |
| **Abrechnung** | ✅ Implementiert | Kassenabrechnung |

---

## 🔧 Übertragungsmethoden

| Methode | Status | Verfügbarkeit |
|---------|--------|---------------|
| **FTPS** | ✅ Implementiert | Production, Test (SIT: nicht unterstützt) |
| **Webservice** | ✅ Implementiert | Test, SIT (Production: ab 02.02.2026) |
| **Auto** | ✅ Implementiert | Automatische Auswahl (Webservice wenn verfügbar, sonst FTPS) |

---

## 🌍 Umgebungen

| Umgebung | FTPS | Webservice | Status |
|----------|------|------------|--------|
| **Production** | ✅ | ⏳ (ab 02.02.2026) | Konfiguriert |
| **Test** | ✅ | ✅ | Konfiguriert |
| **SIT** | ❌ | ✅ | Konfiguriert |

---

## 📝 Konfiguration

### Backend `.env`:
```bash
ELDA_ENVIRONMENT=test
ELDA_DEFAULT_METHOD=auto
ELDA_API_KEY=<Ihr_API_Key>
ELDA_FTPS_USERNAME=<Ihr_FTPS_Username>
ELDA_FTPS_PASSWORD=<Ihr_FTPS_Password>
ELDA_CERT_PATH=./backend/certs/elda-client.crt
ELDA_KEY_PATH=./backend/certs/elda-client.key
```

### User-Einstellungen (Frontend):
- ELDA aktivieren/deaktivieren
- ELDA-Methode (ftps/webservice/auto)
- ELDA-Umgebung (production/test/sit)

---

## ✅ Zusammenfassung

**Vollständig implementiert:**
- ✅ ELDA-Konfiguration (3 Umgebungen, FTPS + Webservice)
- ✅ ELDA-Connector (FTPS + Webservice)
- ✅ ELDA-Format-Generator (KSB, Lohnmeldung, Abrechnung)
- ✅ ELDA-API-Routen (Status, Test, Send, Format, Config, Methods)
- ✅ Frontend-Teststrecke (3 Tabs: Verbindungstest, Daten senden, Format generieren)
- ✅ Einstellungen-Integration (ELDA aktivieren, Methode, Umgebung)
- ✅ Automatische ELDA-Übermittlung nach Kassenabrechnung
- ✅ User-Model-Erweiterung (ELDA-Präferenzen)
- ✅ Auth-Routes-Validierung (ELDA-Einstellungen)

**Status:** ✅ **VOLLSTÄNDIG IMPLEMENTIERT UND EINSATZBEREIT**

