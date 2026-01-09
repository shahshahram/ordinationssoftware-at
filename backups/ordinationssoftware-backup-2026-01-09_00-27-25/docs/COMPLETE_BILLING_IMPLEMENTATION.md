# Vollständige Abrechnungsmodalitäten - Implementierungsübersicht

## ✅ Implementiert: 01.12.2025

### 1. Abrechnungsformalitäten für alle Arzttypen

#### ✅ Kassenärzte (Kassenarzt-Abrechnung)
- ✅ EBM-Code-Verwaltung
- ✅ ÖGK-XML-Export (ELA-Format)
- ✅ Turnusabrechnung (monatlich)
- ✅ Selbstbehalt-Berechnung (10%/20%, max. €50)
- ✅ Automatische Preisberechnung
- ✅ RKSVO-konforme Rechnungsstellung

#### ✅ Wahlärzte (Wahlarzt-Abrechnung)
- ✅ GOÄ-Code-Unterstützung
- ✅ Erstattungsberechnung (80% Standard, anpassbar)
- ✅ Zusatzversicherungsprüfung
- ✅ Automatische Erstattungserstellung
- ✅ Erstattungsverwaltung

#### ✅ Privatärzte (Privat-Abrechnung)
- ✅ Privatpreise
- ✅ Vollständige Patientenrechnung
- ✅ Keine Versicherungsabrechnung

---

### 2. Schnittstellen zu allen österreichischen Kassen

#### ✅ ÖGK (Österreichische Gesundheitskasse)
- ✅ XML-Export (ELA-Format)
- ✅ Turnusabrechnung
- ✅ Automatische Übermittlung
- ✅ Tarifdatenbank-Download

#### ✅ SVS (Sozialversicherung der Selbständigen)
- ✅ XML-Export-Funktion
- ✅ Batch-Export
- ✅ Versicherungsprüfung

#### ✅ BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)
- ✅ XML-Export-Funktion
- ✅ Batch-Export
- ✅ Versicherungsprüfung

#### ✅ KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)
- ✅ XML-Export-Funktion
- ✅ Batch-Export
- ✅ Versicherungsprüfung

#### ✅ PVA (Pensionsversicherungsanstalt)
- ✅ XML-Export-Funktion
- ✅ Batch-Export
- ✅ Versicherungsprüfung

#### ⚠️ Privatversicherungen
- ✅ InsuranceConnector-Struktur
- ⚠️ Beispiel-Konfigurationen (Allianz, Generali, Wiener Städtische)
- ⚠️ Echte API-Integrationen müssen noch konfiguriert werden

---

### 3. Abrechnungskataloge

#### ✅ ServiceCatalog (Leistungskatalog)
- ✅ EBM-Codes (`ogk.ebmCode`, `ogk.ebmPrice`)
- ✅ GOÄ-Codes (`wahlarzt.goaeCode`, `wahlarzt.price`)
- ✅ KHO-Codes (über Tariff-Model)
- ✅ Privatpreise (`private.price`)
- ✅ Selbstbehalt-Konfiguration (`copay`)
- ✅ Kategorisierung und Fachrichtung

#### ✅ Tariff-Model (Tarifverwaltung)
- ✅ GOÄ-Tarife
- ✅ KHO-Tarife
- ✅ ET-Tarife (Ergotherapie)
- ✅ EBM-Tarife
- ✅ Custom-Tarife
- ✅ Gültigkeitszeitraum

---

### 4. Automatische Erstattungsverarbeitung

#### ✅ Automatische Erstattungserstellung
- ✅ **Beim Erstellen von Wahlarzt-Rechnungen**: Automatische Erstattung wird erstellt
- ✅ **Täglich um 3 Uhr**: Verarbeitet alle ausstehenden Rechnungen
- ✅ **Erstattungsberechnung**: Automatisch basierend auf Versicherung und Zusatzversicherung
- ✅ **Benachrichtigungen**: Automatische Benachrichtigung an Rechnungsersteller

#### ✅ Erstattungsverwaltung
- ✅ Status-Verwaltung (pending, submitted, approved, rejected, paid)
- ✅ Dokumentenverwaltung
- ✅ Notizen und interne Notizen
- ✅ Einreichungsmethoden (online, email, post, api)

#### ✅ API-Endpunkte
- ✅ `POST /api/auto-reimbursement/process` - Verarbeitet alle ausstehenden Rechnungen
- ✅ `POST /api/auto-reimbursement/create/:invoiceId` - Erstellt Erstattung für spezifische Rechnung
- ✅ `GET /api/auto-reimbursement/status` - Status der automatischen Verarbeitung

---

### 5. Update-Funktionalitäten für Kataloge

#### ✅ Automatische Tarifdatenbank-Updates
- ✅ **Monatlich am 1. um 5 Uhr**: Prüft auf Updates und lädt sie herunter
- ✅ **Wöchentlich montags um 4 Uhr**: ServiceCatalog-Preis-Updates
- ✅ **EBM, KHO, GOÄ**: Alle Tarifdatenbanken werden aktualisiert

#### ✅ ServiceCatalog-Auto-Updates
- ✅ **Automatische EBM-Preis-Updates**: Synchronisiert Preise aus Tariff-Model
- ✅ **Automatische GOÄ-Preis-Updates**: Berechnet Preise basierend auf GOÄ-Tarifen
- ✅ **Versionierung**: ServiceCatalog-Einträge werden versioniert

#### ✅ API-Endpunkte
- ✅ `POST /api/ogk-tariff-download/ebm` - EBM-Tarifdatenbank herunterladen
- ✅ `POST /api/ogk-tariff-download/kho` - KHO-Tarifdatenbank herunterladen
- ✅ `POST /api/ogk-tariff-download/goae` - GOÄ-Tarifdatenbank herunterladen
- ✅ `POST /api/ogk-tariff-download/all` - Alle Tarifdatenbanken herunterladen

---

## Neue Dateien

### Backend Services
- ✅ `backend/services/autoReimbursementService.js` - Automatische Erstattungsverarbeitung
- ✅ `backend/services/serviceCatalogUpdateService.js` - ServiceCatalog-Auto-Updates

### Backend Utils
- ✅ `backend/utils/insurance-xml-generator.js` - XML-Generatoren für alle Kassen

### Backend Routes
- ✅ `backend/routes/insurance-billing.js` - Versicherungs-spezifische Abrechnungs-Routes
- ✅ `backend/routes/auto-reimbursement.js` - Automatische Erstattungsverarbeitung Routes

### Model-Erweiterungen
- ✅ `backend/models/Invoice.js` - `reimbursementId` und `ogkBilling` hinzugefügt

---

## Cron-Jobs (Automatische Verarbeitung)

### Täglich um 3 Uhr
- **Automatische Erstattungsverarbeitung**: Verarbeitet alle ausstehenden Wahlarzt-Rechnungen und erstellt Erstattungen

### Wöchentlich (Montags um 4 Uhr)
- **ServiceCatalog-Preis-Updates**: Aktualisiert EBM- und GOÄ-Preise im ServiceCatalog

### Monatlich (1. des Monats um 5 Uhr)
- **Tarifdatenbank-Updates**: Prüft auf Updates und lädt EBM, KHO, GOÄ herunter

---

## API-Endpunkte Übersicht

### Versicherungs-Abrechnung
- `GET /api/insurance-billing/export/:invoiceId` - Exportiert Rechnung als XML
- `POST /api/insurance-billing/export/batch` - Exportiert mehrere Rechnungen
- `GET /api/insurance-billing/supported` - Unterstützte Versicherungen

### Automatische Erstattung
- `POST /api/auto-reimbursement/process` - Verarbeitet alle ausstehenden Rechnungen
- `POST /api/auto-reimbursement/create/:invoiceId` - Erstellt Erstattung für Rechnung
- `GET /api/auto-reimbursement/status` - Status der automatischen Verarbeitung

### ÖGK-Abrechnung
- `GET /api/ogk-billing/export/:invoiceId` - ÖGK-XML-Export
- `POST /api/ogk-billing/export/batch` - Batch-Export
- `GET /api/ogk-billing/turnus/:period` - Turnusabrechnung

### Erstattungen
- `GET /api/reimbursements` - Alle Erstattungen
- `GET /api/reimbursements/:id` - Einzelne Erstattung
- `POST /api/reimbursements` - Neue Erstattung erstellen
- `PATCH /api/reimbursements/:id` - Erstattung aktualisieren
- `POST /api/reimbursements/:id/submit` - Erstattung einreichen

---

## Workflow: Automatische Erstattung

1. **Rechnung wird erstellt** (Wahlarzt-Typ)
2. **Automatische Prüfung**: System prüft Versicherung und Zusatzversicherung
3. **Erstattung wird erstellt**: Automatisch mit berechnetem Erstattungsbetrag
4. **Benachrichtigung**: Rechnungsersteller wird benachrichtigt
5. **Einreichung**: Erstattung kann manuell oder automatisch eingereicht werden

---

## Workflow: Automatische Updates

1. **Tarifdatenbank-Update** (monatlich)
   - System prüft auf Updates
   - Lädt neue Tarifdatenbanken herunter
   - Importiert in Tariff-Model

2. **ServiceCatalog-Update** (wöchentlich)
   - System synchronisiert EBM-Preise
   - System synchronisiert GOÄ-Preise
   - ServiceCatalog-Einträge werden aktualisiert

---

## Status

✅ **Alle Abrechnungsmodalitäten sind vollständig implementiert**
✅ **Automatische Erstattungsverarbeitung ist aktiv**
✅ **Update-Funktionalitäten sind eingerichtet**
✅ **Alle österreichischen Kassen werden unterstützt**

---

## Nächste Schritte (Optional)

1. **Privatversicherungs-APIs**: Echte API-Integrationen einrichten
2. **Dashboard-Widget**: Update-Status und Erstattungsübersicht
3. **E-Mail-Benachrichtigungen**: Bei Updates und Erstattungsstatus-Änderungen
4. **Update-Historie**: Protokollierung aller Updates



