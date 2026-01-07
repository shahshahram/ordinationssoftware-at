# Update-Kataloge Dokumentation

## 📋 Übersicht

Das System verwaltet mehrere automatische und manuelle Update-Prozesse für verschiedene Kataloge und Datenbanken. Diese Dokumentation beschreibt alle verfügbaren Update-Mechanismen, ihre Zeitpläne und wie sie verwendet werden.

## 🔍 Wo finde ich das Update-Monitoring im Frontend?

Das Update-Monitoring ist über die Navigation erreichbar:

**Pfad:** `Einstellungen` → `Update-Monitoring`

**Direkter Link:** `http://localhost:3000/update-monitoring`

Die Seite zeigt den Status aller automatischen Update-Services an und ermöglicht es, manuelle Updates auszulösen.

---

## 📊 Verfügbare Update-Kataloge

### 1. Jährliches Service-Katalog Update

**Beschreibung:**  
Aktualisiert den gesamten Leistungskatalog mit neuen Leistungen, Preisen und EBM-Codes basierend auf den neuesten EBM-Vorgaben.

**Zeitplan:**  
- **Automatisch:** Jährlich am 1. Januar um 2:00 Uhr
- **Cron-Schedule:** `0 2 1 1 *`

**Was wird aktualisiert:**
- Neue Leistungen hinzufügen
- Preisanpassungen (Inflationsausgleich)
- Veraltete Leistungen deaktivieren
- EBM-Code Änderungen
- Service-Kategorien aktualisieren

**Manuell auslösbar:** ✅ Ja  
**API-Endpoint:** `POST /api/service-catalog/trigger-update`  
**Datei:** `backend/scripts/update-service-catalog-annual.js`

**Einschränkungen:**
- Kann nur einmal pro 24 Stunden ausgeführt werden
- Benötigt Berechtigung: `services.write`

---

### 2. Wöchentliche Preis-Updates

**Beschreibung:**  
Synchronisiert EBM- und GOÄ-Preise aus der Tarifdatenbank in den ServiceCatalog.

**Zeitplan:**  
- **Automatisch:** Wöchentlich montags um 4:00 Uhr
- **Cron-Schedule:** `0 4 * * 1`

**Was wird aktualisiert:**
- EBM-Preise im ServiceCatalog
- GOÄ-Preise im ServiceCatalog
- Preisänderungen aus Tarifdatenbanken

**Manuell auslösbar:** ✅ Ja  
**API-Endpoint:** `POST /api/service-catalog/trigger-price-update`  
**Service:** `backend/services/serviceCatalogUpdateService.js`

**Methoden:**
- `updateEBMPrices()` - Aktualisiert EBM-Preise
- `updateGOAEPrices()` - Aktualisiert GOÄ-Preise
- `updateAll()` - Führt alle Preis-Updates durch

---

### 3. Monatliche Tarif-Updates (EBM/KHO/GOÄ)

**Beschreibung:**  
Lädt aktuelle EBM-, KHO- und GOÄ-Tarifdatenbanken von der ÖGK (Österreichische Gesundheitskasse) herunter und importiert sie.

**Zeitplan:**  
- **Automatisch:** Monatlich am 1. des Monats um 5:00 Uhr
- **Cron-Schedule:** `0 5 1 * *`
- **Zusätzlich:** Wöchentliche Prüfung montags um 2:00 Uhr (nur Prüfung, kein Download)

**Datenquellen:**
- **EBM (Einheitlicher Bewertungsmaßstab)**
  - URL: `https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240`
  - Format: XML
- **KHO (Kassenhonorarordnung)**
  - URL: `https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932`
  - Format: XML
- **GOÄ (Gebührenordnung für Ärzte)**
  - URL: `https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.1234569`
  - Format: XML

**Was wird aktualisiert:**
- EBM-Tarifdatenbank
- KHO-Tarifdatenbank
- GOÄ-Tarifdatenbank
- Tarif-Versionen und Gültigkeitszeiträume

**Manuell auslösbar:** ✅ Ja  
**API-Endpoint:** `POST /api/tariff-update/trigger`  
**Service:** `backend/services/tariffUpdateService.js`  
**Downloader:** `backend/services/ogkTariffDownloader.js`

**Methoden:**
- `checkForUpdates()` - Prüft auf verfügbare Updates
- `checkAndUpdate()` - Prüft und lädt Updates herunter
- `manualUpdate(userId)` - Manuelles Update auslösen

---

### 4. Kategorien-Update

**Beschreibung:**  
Erstellt automatisch fehlende Service-Kategorien aus dem Leistungskatalog.

**Zeitplan:**  
- **Automatisch:** Wird automatisch beim jährlichen Service-Katalog Update ausgeführt
- **Nicht separat auslösbar**

**Was wird aktualisiert:**
- Neue Service-Kategorien werden erstellt
- Kategorien werden aus Service-Daten extrahiert

**Manuell auslösbar:** ❌ Nein (läuft automatisch mit)

---

### 5. ICD-10 Katalog

**Beschreibung:**  
ICD-10 Diagnosekatalog für verschiedene Jahre.

**Zeitplan:**  
- **Manuell:** Kein automatisches Update
- **Import:** Über Import-Dialog im Frontend

**Was wird aktualisiert:**
- ICD-10 Diagnosecodes
- Diagnosebeschreibungen
- Katalog-Versionen (nach Jahr)

**Manuell auslösbar:** ✅ Ja (über Import-Dialog)  
**API-Endpoint:** `POST /api/icd10-catalog/import`  
**Frontend:** `ICD10CatalogManagement` Seite  
**Route:** `/icd10-catalog-management`

**Features:**
- CSV-Import
- Validierung vor Import
- Mehrere Katalog-Jahre unterstützt
- Aktivierung/Deaktivierung von Katalogen

---

### 6. Medikamenten-Katalog

**Beschreibung:**  
Medikamenten-Datenbank mit ATC-Codes, Wirkstoffen und Dosierungen.

**Zeitplan:**  
- **Manuell:** Update von externen Quellen
- **Kein automatisches Update**

**Was wird aktualisiert:**
- Medikamentennamen
- ATC-Codes
- Wirkstoffe und Dosierungen
- Darreichungsformen

**Manuell auslösbar:** ✅ Ja  
**API-Endpoint:** `/api/medications` (Update-Funktionen vorhanden)  
**Frontend:** `MedicationImport` Seite  
**Route:** `/medication-import`

---

## 🎛️ Update-Monitoring Interface

### Zugriff

**Navigation:** `Einstellungen` → `Update-Monitoring`  
**Route:** `/update-monitoring`  
**Komponente:** `UpdateMonitoringPage.tsx`

### Funktionen

1. **Status-Anzeige**
   - Zeigt Status aller Update-Services
   - Letzte Ausführung
   - Nächste geplante Ausführung
   - Aktueller Status (Erfolgreich/Fehler/Läuft)

2. **Manuelle Updates**
   - Button "Jetzt ausführen" für jeden Service
   - Bestätigungsdialog
   - Status-Updates in Echtzeit

3. **Auto-Refresh**
   - Automatische Aktualisierung alle 30 Sekunden
   - Manueller Refresh-Button

4. **Datenquellen-Information**
   - Zeigt URLs der Datenquellen
   - Tooltips mit vollständigen URLs

---

## 🔧 API-Endpunkte

### Update-Status abrufen
```http
GET /api/update-monitoring/status
Authorization: Bearer <token>
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "name": "Jährliches Service-Katalog Update",
        "description": "...",
        "schedule": "0 2 1 1 *",
        "scheduleDescription": "Jährlich am 1. Januar um 2:00 Uhr",
        "nextExecution": "2027-01-01T02:00:00.000Z",
        "lastExecution": "2026-01-01T02:00:00.000Z",
        "lastStatus": "success",
        "isRunning": false,
        "canTrigger": true,
        "triggerEndpoint": "/api/service-catalog/trigger-update"
      },
      ...
    ],
    "lastUpdated": "2026-01-07T10:00:00.000Z"
  }
}
```

### Manuelles Update auslösen
```http
POST /api/update-monitoring/trigger/:serviceType
Authorization: Bearer <token>
```

**Service-Typen:**
- `annual` - Jährliches Service-Katalog Update
- `weekly` - Wöchentliche Preis-Updates
- `tariff` - Monatliche Tarif-Updates

**Beispiel:**
```http
POST /api/update-monitoring/trigger/annual
```

---

## 📝 Logs und Audit-Trail

Alle Updates werden im AuditLog gespeichert:

**Actions:**
- `SERVICE_CATALOG_ANNUAL_UPDATE` - Jährliches Update
- `SERVICE_CATALOG_UPDATE` - Service-Katalog Update
- `SERVICE_CATALOG_PRICE_UPDATE` - Preis-Update
- `TARIFF_UPDATE` - Tarif-Update
- `TARIFF_DOWNLOAD` - Tarif-Download
- `EBM_UPDATE` - EBM-Update
- `KHO_UPDATE` - KHO-Update
- `GOAE_UPDATE` - GOÄ-Update
- `icd10.import` - ICD-10 Import

**AuditLog-Felder:**
- `userId` - Benutzer, der das Update ausgelöst hat
- `userEmail` - E-Mail des Benutzers
- `userRole` - Rolle des Benutzers
- `action` - Art des Updates
- `description` - Beschreibung
- `details` - Detaillierte Informationen (Anzahl Updates, Fehler, etc.)
- `timestamp` - Zeitpunkt der Ausführung

---

## ⚙️ Konfiguration

### Umgebungsvariablen

**Tarif-Download URLs:**
```env
OGK_EBM_XML_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10007.850240
OGK_KHO_XML_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932
OGK_GOAE_XML_URL=https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.1234569
```

### Cron-Jobs

Die automatischen Updates werden über `node-cron` im Backend gestartet:

**Datei:** `backend/server.js`

```javascript
// Jährliches Service-Katalog Update (1. Januar um 2:00 Uhr)
cron.schedule('0 2 1 1 *', async () => {
  const { updateServiceCatalog } = require('./scripts/update-service-catalog-annual');
  await updateServiceCatalog();
});

// Tarif-Update-Service starten
const tariffUpdateService = require('./services/tariffUpdateService');
tariffUpdateService.start();
```

---

## 🚨 Fehlerbehandlung

### Häufige Probleme

1. **Update läuft bereits**
   - Problem: Ein Update wurde bereits in den letzten 24 Stunden ausgeführt
   - Lösung: Warten oder manuell über API auslösen (ohne 24h-Beschränkung)

2. **Netzwerkfehler beim Download**
   - Problem: ÖGK-Website nicht erreichbar
   - Lösung: Prüfen Sie die Internetverbindung und die URLs

3. **Berechtigungsfehler**
   - Problem: Benutzer hat nicht die erforderlichen Berechtigungen
   - Lösung: `settings.read` und `settings.write` Berechtigungen prüfen

4. **MongoDB-Verbindungsfehler**
   - Problem: Datenbank nicht erreichbar
   - Lösung: MongoDB-Verbindung prüfen

---

## 📚 Weitere Dokumentation

- **Service-Katalog Updates:** `docs/SERVICE_CATALOG_ANNUAL_UPDATE.md`
- **Tarif-Downloads:** `docs/OGK_TARIFF_DOWNLOAD.md`
- **Billing Status:** `docs/BILLING_STATUS_REPORT.md`

---

## 🔐 Berechtigungen

**Erforderliche Berechtigungen:**

- **Status anzeigen:** `settings.read`
- **Updates auslösen:** `settings.write`
- **Service-Katalog Updates:** `services.write`
- **Tarif-Updates:** `settings.write`

---

## 📞 Support

Bei Fragen oder Problemen mit den Update-Katalogen:
1. Prüfen Sie die Logs im Backend
2. Überprüfen Sie den AuditLog für Details
3. Kontaktieren Sie den Systemadministrator

---

**Letzte Aktualisierung:** 2026-01-07

