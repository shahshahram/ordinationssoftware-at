# ÖGK-Tarifkatalog (Honorarordnung) - Implementierungs-Status

**Datum:** 2026-01-12  
**Status:** ✅ **Teilweise implementiert**

---

## ✅ Was ist bereits implementiert?

### **1. KHO (Kassenhonorarordnung) - Teilweise** ✅

**Das österreichische Äquivalent zum deutschen EBM**

**Implementiert:**
- ✅ **Tariff-Modell** (`backend/models/Tariff.js`)
  - Unterstützt `tariffType: 'kho'`
  - Speichert KHO-Codes und Preise
  - Kategorien und Fachrichtungen

- ✅ **ÖGK-Tarif-Downloader** (`backend/services/ogkTariffDownloader.js`)
  - Lädt KHO-Tarifdatenbank von ÖGK herunter
  - URL: `https://www.gesundheitskasse.at/cdscontent/load?contentid=10008.784932`
  - Unterstützt XML und CSV-Format

- ✅ **Tarif-Import** (`backend/utils/tariff-importer.js`)
  - Importiert KHO-Daten aus CSV/XML
  - Speichert in `Tariff`-Collection

- ✅ **API-Endpoints** (`backend/routes/ogk-tariff-download.js`)
  - `POST /api/ogk-tariff-download/kho` - KHO herunterladen
  - `POST /api/ogk-tariff-download/kho/import` - KHO herunterladen und importieren

- ✅ **Frontend-UI** (`frontend/src/pages/TariffManagement.tsx`)
  - Tarifverwaltung-Seite
  - Download-Funktionalität
  - Import-Funktionalität

- ✅ **ServiceCatalog-Integration** (`backend/models/ServiceCatalog.js`)
  - Feld `ogk.ebmCode` (sollte eigentlich `ogk.khoCode` heißen)
  - Feld `ogk.ebmPrice` (sollte eigentlich `ogk.khoPrice` heißen)
  - Preise werden in Euro gespeichert

- ✅ **Automatische Updates** (`backend/services/tariffUpdateService.js`)
  - Monatliche Update-Prüfung (1. des Monats um 2:00 Uhr)
  - Wöchentliche Update-Prüfung (jeden Montag um 2:00 Uhr)

---

### **2. GOÄ (Gebührenordnung für Ärzte) - Teilweise** ✅

**Für Privatärzte und Wahlärzte**

**Implementiert:**
- ✅ **Tariff-Modell** (`backend/models/Tariff.js`)
  - Unterstützt `tariffType: 'goae'`
  - GOÄ-Abschnitte (A, B, C, etc.)
  - GOÄ-Nummern
  - Multiplikatoren und Basispreise

- ✅ **ÖGK-Tarif-Downloader** (`backend/services/ogkTariffDownloader.js`)
  - Lädt GOÄ-Tarifdatenbank herunter
  - ⚠️ URL ist Platzhalter (muss noch ermittelt werden)

- ✅ **API-Endpoints** (`backend/routes/ogk-tariff-download.js`)
  - `POST /api/ogk-tariff-download/goae` - GOÄ herunterladen

- ✅ **ServiceCatalog-Integration** (`backend/models/ServiceCatalog.js`)
  - Feld `wahlarzt.price` - Preis für Wahlärzte
  - Erstattungsrate und Maximal-Erstattung

---

### **3. ServiceCatalog-Integration** ✅

**Abrechnungsfelder im ServiceCatalog:**

```javascript
// ÖGK-Kassenarzt-Abrechnung
ogk: {
  ebmCode: String,        // ⚠️ Sollte "khoCode" heißen
  ebmPrice: Number,       // ⚠️ Sollte "khoPrice" heißen (in Euro)
  requiresApproval: Boolean,
  billingFrequency: String
}

// Wahlarzt-Abrechnung
wahlarzt: {
  price: Number,           // Preis in Euro
  reimbursementRate: Number,
  maxReimbursement: Number
}

// Privatärztliche Abrechnung
private: {
  price: Number,           // Preis in Euro
  noInsurance: Boolean
}
```

---

### **4. ÖGK-Abrechnung** ✅

**Implementiert:**
- ✅ **ÖGK-XML-Generator** (`backend/utils/ogk-xml-generator.js`)
  - Generiert ELA (Einzelleistungsabrechnung)
  - Generiert Turnusabrechnung

- ✅ **ÖGK-Billing-Routes** (`backend/routes/ogk-billing.js`)
  - `GET /api/ogk-billing/export/:invoiceId` - Einzelne Rechnung exportieren
  - `POST /api/ogk-billing/export/batch` - Mehrere Rechnungen exportieren
  - `GET /api/ogk-billing/turnus/:period` - Turnusabrechnung

- ✅ **Automatische Übermittlung** (`backend/services/ogkAutoSubmitService.js`)
  - Automatische Übermittlung von Rechnungen an ÖGK

---

## ⚠️ Was fehlt oder ist unvollständig?

### **1. Terminologie-Korrektur** ⚠️

**Problem:**
- Code verwendet "EBM" statt "KHO"
- Historisch bedingt, sollte korrigiert werden

**Betroffene Stellen:**
- `ServiceCatalog.ogk.ebmCode` → sollte `ogk.khoCode` heißen
- `ServiceCatalog.ogk.ebmPrice` → sollte `ogk.khoPrice` heißen
- Kommentare und Dokumentation

**Status:** ⚠️ Funktioniert, aber Terminologie ist falsch

---

### **2. KHO-Import vollständig** ⚠️

**Was fehlt:**
- ⚠️ XML-Parsing für KHO muss an tatsächliches ÖGK-Format angepasst werden
- ⚠️ CSV-Parsing für KHO muss validiert werden
- ⚠️ Automatische Zuordnung zu ServiceCatalog

**Status:** ⚠️ Grundfunktionalität vorhanden, aber muss getestet/angepasst werden

---

### **3. GOÄ-URL** ⚠️

**Problem:**
- GOÄ-URL ist Platzhalter
- Muss von ÖGK-Website oder ÖÄK ermittelt werden

**Status:** ⚠️ URL muss noch ermittelt werden

---

### **4. Bundesland-spezifische Honorarordnungen** ❌

**Problem:**
- ÖGK-Honorarordnungen sind oft nach Bundesländern getrennt
- System unterstützt aktuell nur eine zentrale KHO

**Status:** ❌ Nicht implementiert

---

### **5. Andere Versicherungsträger** ❌

**Fehlt:**
- ❌ BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)
- ❌ SVS (Sozialversicherung der Selbständigen)
- ❌ KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)
- ❌ PVA (Pensionsversicherungsanstalt)
- ❌ VAEB (Versicherungsanstalt öffentlich Bediensteter)
- ❌ AUVA (Allgemeine Unfallversicherungsanstalt)

**Status:** ❌ Nicht implementiert

---

## 📊 Implementierungs-Status

| Feature | Status | Details |
|---------|--------|---------|
| **KHO-Modell** | ✅ Implementiert | Tariff-Modell mit KHO-Unterstützung |
| **KHO-Download** | ✅ Implementiert | Download von ÖGK-Website |
| **KHO-Import** | ⚠️ Teilweise | Muss an tatsächliches Format angepasst werden |
| **KHO-Integration** | ✅ Implementiert | ServiceCatalog hat `ogk.ebmCode` (sollte `khoCode` sein) |
| **GOÄ-Modell** | ✅ Implementiert | Tariff-Modell mit GOÄ-Unterstützung |
| **GOÄ-Download** | ⚠️ Teilweise | URL ist Platzhalter |
| **GOÄ-Import** | ⚠️ Teilweise | Muss validiert werden |
| **Frontend-UI** | ✅ Implementiert | TariffManagement-Seite |
| **Automatische Updates** | ✅ Implementiert | Monatlich und wöchentlich |
| **ÖGK-XML-Export** | ✅ Implementiert | ELA und Turnusabrechnung |
| **Bundesland-spezifisch** | ❌ Nicht implementiert | Nur zentrale KHO |
| **Andere Versicherungsträger** | ❌ Nicht implementiert | Nur ÖGK |

---

## 🎯 Zusammenfassung

### **✅ Was funktioniert:**

1. ✅ **KHO-Download** von ÖGK-Website
2. ✅ **Tariff-Modell** für KHO und GOÄ
3. ✅ **ServiceCatalog-Integration** mit ÖGK-Feldern
4. ✅ **ÖGK-XML-Export** für Abrechnungen
5. ✅ **Frontend-UI** für Tarifverwaltung
6. ✅ **Automatische Updates** (monatlich/wöchentlich)

### **⚠️ Was verbessert werden sollte:**

1. ⚠️ **Terminologie korrigieren:** "EBM" → "KHO"
2. ⚠️ **KHO-Import validieren:** XML/CSV-Parsing testen
3. ⚠️ **GOÄ-URL ermitteln:** Platzhalter durch echte URL ersetzen
4. ⚠️ **Automatische Zuordnung:** KHO-Codes zu ServiceCatalog

### **❌ Was fehlt:**

1. ❌ **Bundesland-spezifische Honorarordnungen**
2. ❌ **Andere Versicherungsträger** (BVAEB, SVS, KFA, etc.)

---

## 📝 Nächste Schritte

### **1. Terminologie korrigieren (Optional):**

```javascript
// ServiceCatalog.js
ogk: {
  khoCode: String,    // Statt ebmCode
  khoPrice: Number,   // Statt ebmPrice
  // ...
}
```

### **2. KHO-Import testen:**

- KHO-Datei von ÖGK herunterladen
- Import testen
- XML/CSV-Parsing anpassen

### **3. GOÄ-URL ermitteln:**

- ÖGK-Website prüfen
- Oder ÖÄK-Website prüfen
- URL in `ogkTariffDownloader.js` aktualisieren

### **4. Bundesland-Unterstützung (Zukunft):**

- Bundesland-Feld in Tariff-Modell
- Filter nach Bundesland
- Mehrere KHO-Versionen parallel

---

## 🔍 Wo finde ich die Implementierung?

### **Backend:**
- `backend/models/Tariff.js` - Tariff-Modell
- `backend/services/ogkTariffDownloader.js` - Downloader
- `backend/utils/tariff-importer.js` - Importer
- `backend/routes/ogk-tariff-download.js` - API-Endpoints
- `backend/routes/tariffs.js` - Tarifverwaltung
- `backend/models/ServiceCatalog.js` - ServiceCatalog mit ÖGK-Feldern

### **Frontend:**
- `frontend/src/pages/TariffManagement.tsx` - Tarifverwaltung-UI

### **Dokumentation:**
- `docs/OESTERREICH_TARIFE_ERKLAERUNG.md` - Erklärung der österreichischen Tarife
- `docs/UPDATE_KONFIGURATION.md` - Update-Konfiguration

---

## ✅ Fazit

**Der ÖGK-Tarifkatalog (Kassenhonorarordnung) ist teilweise implementiert:**

- ✅ **Grundfunktionalität vorhanden:** Download, Import, Speicherung
- ✅ **ServiceCatalog-Integration:** ÖGK-Felder vorhanden
- ✅ **ÖGK-Abrechnung:** XML-Export funktioniert
- ⚠️ **Verbesserungspotenzial:** Terminologie, Import-Validierung, GOÄ-URL
- ❌ **Fehlt:** Bundesland-spezifische Honorarordnungen, andere Versicherungsträger

**Status:** ✅ **Funktionsfähig, aber verbesserungswürdig**
