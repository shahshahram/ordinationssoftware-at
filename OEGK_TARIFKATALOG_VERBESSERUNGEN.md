# ÖGK-Tarifkatalog Verbesserungen - Implementierungs-Zusammenfassung

**Datum:** 2026-01-12  
**Status:** ✅ **Implementiert**

---

## ✅ Durchgeführte Verbesserungen

### **1. Terminologie korrigiert** ✅

**Problem:** Code verwendete "EBM" (deutsche Bezeichnung) statt "KHO" (österreichische Bezeichnung)

**Lösung:**
- ✅ Neue Felder hinzugefügt: `khoCode`, `khoPrice`, `khoGroup`, `khoSubGroup`
- ✅ Legacy-Felder (`ebmCode`, `ebmPrice`, etc.) bleiben erhalten für Backward Compatibility
- ✅ Automatische Migration: Pre-Hook migriert `ebmCode` → `khoCode` beim Speichern

**Betroffene Dateien:**
- `backend/models/ServiceCatalog.js` - Neue Felder hinzugefügt
- `backend/models/Tariff.js` - Neue Felder hinzugefügt
- `backend/utils/tariff-importer.js` - Unterstützt beide Felder
- `backend/services/ogkTariffDownloader.js` - XML-Parser aktualisiert
- `backend/services/serviceCatalogUpdateService.js` - Aktualisiert für neue Felder
- `backend/utils/billing-calculator.js` - Unterstützt beide Felder
- `backend/routes/billing.js` - Unterstützt beide Felder
- `backend/routes/billing-reports.js` - Unterstützt beide Felder
- `frontend/src/pages/ServiceCatalog.tsx` - UI aktualisiert mit neuen Feldern

---

### **2. Bundesland-Unterstützung hinzugefügt** ✅

**Problem:** ÖGK-Honorarordnungen sind oft nach Bundesländern getrennt

**Lösung:**
- ✅ Feld `federalState` in `ServiceCatalog.ogk` hinzugefügt
- ✅ Feld `federalState` in `Tariff.kho` hinzugefügt
- ✅ Unterstützte Bundesländer:
  - Burgenland
  - Kärnten
  - Niederösterreich
  - Oberösterreich
  - Salzburg
  - Steiermark
  - Tirol
  - Vorarlberg
  - Wien
- ✅ Optional: `null` = für alle Bundesländer gültig

**Betroffene Dateien:**
- `backend/models/ServiceCatalog.js`
- `backend/models/Tariff.js`
- `backend/utils/tariff-importer.js`
- `backend/services/ogkTariffDownloader.js`
- `frontend/src/pages/ServiceCatalog.tsx`

---

### **3. Versicherungsträger-Unterstützung hinzugefügt** ✅

**Problem:** Verschiedene Versicherungsträger haben unterschiedliche Honorarordnungen

**Lösung:**
- ✅ Feld `insuranceProvider` in `ServiceCatalog.ogk` hinzugefügt
- ✅ Feld `insuranceProvider` in `Tariff.kho` hinzugefügt
- ✅ Unterstützte Versicherungsträger:
  - `oegk` - Österreichische Gesundheitskasse
  - `bvaeb` - Versicherungsanstalt für Eisenbahnen und Bergbau
  - `svs` - Sozialversicherung der Selbständigen
  - `kfa` - Krankenfürsorgeanstalt der Bediensteten der Stadt Wien
  - `pva` - Pensionsversicherungsanstalt
  - `vaeb` - Versicherungsanstalt öffentlich Bediensteter
  - `auva` - Allgemeine Unfallversicherungsanstalt
  - `all` - Für alle Versicherungsträger gültig (Standard)

**Betroffene Dateien:**
- `backend/models/ServiceCatalog.js`
- `backend/models/Tariff.js`
- `backend/utils/tariff-importer.js`
- `backend/services/ogkTariffDownloader.js`
- `backend/routes/tariffs.js` - Filter nach Versicherungsträger
- `frontend/src/pages/ServiceCatalog.tsx`

---

### **4. KHO-Import verbessert** ✅

**Verbesserungen:**
- ✅ Unterstützt sowohl `khoCode` als auch `ebmCode` (Backward Compatibility)
- ✅ Unterstützt `insuranceProvider` und `federalState` in CSV-Import
- ✅ XML-Parser aktualisiert für neue Felder
- ✅ Automatische Migration beim Speichern

**Betroffene Dateien:**
- `backend/utils/tariff-importer.js`
- `backend/services/ogkTariffDownloader.js`

---

### **5. Automatische Zuordnung verbessert** ✅

**Verbesserungen:**
- ✅ `serviceCatalogUpdateService.js` aktualisiert
- ✅ Sucht nach `khoCode` oder `ebmCode` (Backward Compatibility)
- ✅ Aktualisiert sowohl neue als auch Legacy-Felder
- ✅ Übernimmt Versicherungsträger und Bundesland aus Tariff

**Betroffene Dateien:**
- `backend/services/serviceCatalogUpdateService.js`

---

### **6. Frontend erweitert** ✅

**Verbesserungen:**
- ✅ UI zeigt "KHO-Code" statt "EBM-Code"
- ✅ UI zeigt "KHO-Preis" statt "EBM-Preis"
- ✅ Dropdown für Versicherungsträger hinzugefügt
- ✅ Dropdown für Bundesland hinzugefügt
- ✅ TypeScript-Interface aktualisiert

**Betroffene Dateien:**
- `frontend/src/pages/ServiceCatalog.tsx`

---

## 📊 Datenbank-Änderungen

### **ServiceCatalog-Modell:**

```javascript
ogk: {
  // Neue korrekte Felder
  khoCode: String,              // KHO-Code
  khoPrice: Number,              // KHO-Preis in Euro
  khoGroup: String,              // KHO-Gruppe
  khoSubGroup: String,           // KHO-Untergruppe
  insuranceProvider: String,      // Versicherungsträger
  federalState: String,          // Bundesland (optional)
  
  // Legacy-Felder (Backward Compatibility)
  ebmCode: String,               // ⚠️ DEPRECATED
  ebmPrice: Number,              // ⚠️ DEPRECATED
  ebmGroup: String,              // ⚠️ DEPRECATED
  ebmSubGroup: String,           // ⚠️ DEPRECATED
  
  // Weitere Felder
  requiresApproval: Boolean,
  billingFrequency: String,
  additionalServices: Array
}
```

### **Tariff-Modell:**

```javascript
kho: {
  // Neue korrekte Felder
  khoCode: String,              // KHO-Code
  price: Number,                // Preis in Cent
  insuranceProvider: String,     // Versicherungsträger
  federalState: String,          // Bundesland (optional)
  
  // Legacy-Feld (Backward Compatibility)
  ebmCode: String,              // ⚠️ DEPRECATED
  
  // Weitere Felder
  category: String,
  requiresApproval: Boolean,
  billingFrequency: String
}
```

---

## 🔄 Migration

**Automatische Migration:**
- Pre-Hook in `ServiceCatalog` migriert `ebmCode` → `khoCode` beim Speichern
- Pre-Hook in `Tariff` migriert `ebmCode` → `khoCode` beim Speichern
- Bestehende Daten bleiben kompatibel

**Manuelle Migration (optional):**
```javascript
// Script zum Migrieren aller bestehenden Daten
// Kann später erstellt werden, wenn gewünscht
```

---

## 📝 API-Änderungen

### **GET /api/tariffs/kho**

**Neue Query-Parameter:**
- `insuranceProvider` - Filter nach Versicherungsträger
- `federalState` - Filter nach Bundesland

**Beispiel:**
```
GET /api/tariffs/kho?insuranceProvider=oegk&federalState=wien
```

---

## ✅ Backward Compatibility

**Alle Legacy-Felder bleiben erhalten:**
- `ogk.ebmCode` → wird automatisch zu `ogk.khoCode` migriert
- `ogk.ebmPrice` → wird automatisch zu `ogk.khoPrice` migriert
- `kho.ebmCode` → wird automatisch zu `kho.khoCode` migriert

**Code unterstützt beide Felder:**
- Sucht zuerst nach neuen Feldern (`khoCode`, `khoPrice`)
- Fallback auf Legacy-Felder (`ebmCode`, `ebmPrice`)

---

## 🎯 Nächste Schritte (Optional)

### **1. Manuelle Migration (Optional):**
- Script zum Migrieren aller bestehenden Daten
- Entfernen der Legacy-Felder nach Migration

### **2. Erweiterte Features:**
- Automatische Zuordnung von KHO-Codes zu ServiceCatalog beim Import
- Validierung von KHO-Codes gegen offizielle ÖGK-Liste
- Warnung bei veralteten Tarifen

### **3. Dokumentation:**
- Benutzerhandbuch für Tarifverwaltung
- Anleitung für Import von Honorarordnungen

---

## 📊 Zusammenfassung

✅ **Terminologie korrigiert:** EBM → KHO  
✅ **Bundesland-Unterstützung:** Implementiert  
✅ **Versicherungsträger-Unterstützung:** Implementiert  
✅ **KHO-Import verbessert:** Unterstützt neue Felder  
✅ **Automatische Zuordnung:** Verbessert  
✅ **Frontend erweitert:** UI aktualisiert  
✅ **Backward Compatibility:** Vollständig erhalten  

**Status:** ✅ **Alle Verbesserungen implementiert**
