# Analyse: Fehlende Billing-Features - Machbarkeit & Integration

## Übersicht

Diese Analyse beschreibt, wie die drei fehlenden Komponenten implementiert werden könnten:
1. **Ausschluss-Logik (Conflict-Detection)**
2. **Begründungspflicht-Validierung**
3. **Kürzel-Mapping zwischen Versicherungsträgern**

---

## 1. Ausschluss-Logik (Conflict-Detection)

### Aktueller Stand

**✅ Vorhanden:**
- `checkDuplicateServiceOnSameDay()` - Prüft Duplikate am selben Tag
- `checkQuarterlyLimitation()` - Prüft Quartals-Limitierung
- `validateBillingServices()` - Hauptvalidierungsfunktion

**❌ Fehlt:**
- `conflicts_with` Logik (z.B. "Ordination" + "Hausbesuch" am selben Tag nicht erlaubt)

### Vorschlag: Implementierung

#### 1.1 Datenmodell-Erweiterung

**ServiceCatalog-Modell erweitern:**

```javascript
// In ServiceCatalog.js, ogk-Objekt erweitern:
ogk: {
  // ... bestehende Felder ...
  
  // NEU: Ausschluss-Regeln
  conflictRules: {
    conflictsWith: [String],        // Array von Service-Codes, die nicht gleichzeitig erlaubt sind
    conflictsOnSameDay: Boolean,    // true = Konflikt nur am selben Tag
    conflictsInSamePeriod: {        // Konflikt in Zeitraum
      period: String,                // 'day', 'week', 'month', 'quarter'
      conflictsWith: [String]
    },
    requiresDifferentDoctor: Boolean, // true = Muss von anderem Arzt sein
    allowOverride: Boolean,          // true = Arzt kann Konflikt überschreiben (mit Begründung)
    overrideRequiresJustification: Boolean // true = Überschreibung erfordert Begründung
  }
}
```

**Beispiel:**
```javascript
{
  code: "ORD1", // Ordination
  ogk: {
    conflictRules: {
      conflictsWith: ["HB1", "TELE"], // Konflikt mit Hausbesuch und Telefonberatung
      conflictsOnSameDay: true,
      allowOverride: true,
      overrideRequiresJustification: true
    }
  }
}
```

#### 1.2 Validierungslogik erweitern

**Neue Funktion in `billing-validation.js`:**

```javascript
/**
 * Prüft ob Services Konflikte haben
 * @param {Array} services - Array von Service-Objekten
 * @param {String} patientId - Patient-ID
 * @param {Date} invoiceDate - Rechnungsdatum
 * @returns {Promise<Object>} { hasConflicts: boolean, conflicts: Array, warnings: Array }
 */
async function checkServiceConflicts(services, patientId, invoiceDate, excludeInvoiceId = null) {
  const conflicts = [];
  const warnings = [];
  
  // Gruppiere Services nach Datum
  const servicesByDate = {};
  for (const service of services) {
    const serviceDate = service.date ? new Date(service.date) : invoiceDate;
    const dateKey = serviceDate.toISOString().split('T')[0];
    
    if (!servicesByDate[dateKey]) {
      servicesByDate[dateKey] = [];
    }
    servicesByDate[dateKey].push(service);
  }
  
  // Prüfe Konflikte für jeden Tag
  for (const [dateKey, dayServices] of Object.entries(servicesByDate)) {
    // Lade ServiceCatalog-Einträge für alle Services
    const serviceCodes = dayServices.map(s => s.serviceCode);
    const serviceDocs = await ServiceCatalog.find({ code: { $in: serviceCodes } });
    
    // Erstelle Mapping: serviceCode -> ServiceCatalog
    const serviceMap = {};
    serviceDocs.forEach(doc => {
      serviceMap[doc.code] = doc;
    });
    
    // Prüfe Konflikte zwischen allen Service-Paaren
    for (let i = 0; i < dayServices.length; i++) {
      const service1 = dayServices[i];
      const doc1 = serviceMap[service1.serviceCode];
      
      if (!doc1 || !doc1.ogk?.conflictRules?.conflictsWith) {
        continue;
      }
      
      for (let j = i + 1; j < dayServices.length; j++) {
        const service2 = dayServices[j];
        const doc2 = serviceMap[service2.serviceCode];
        
        // Prüfe ob service1 mit service2 kollidiert
        if (doc1.ogk.conflictRules.conflictsWith.includes(service2.serviceCode)) {
          // Prüfe ob Überschreibung erlaubt ist
          if (doc1.ogk.conflictRules.allowOverride) {
            // Prüfe ob Begründung vorhanden ist
            if (doc1.ogk.conflictRules.overrideRequiresJustification) {
              if (!service1.justification && !service1.notes) {
                conflicts.push({
                  type: 'conflict',
                  severity: 'error',
                  service1: service1.serviceCode,
                  service2: service2.serviceCode,
                  message: `${doc1.name} und ${doc2?.name || service2.serviceCode} können nicht am selben Tag abgerechnet werden. Begründung erforderlich.`
                });
              } else {
                warnings.push({
                  type: 'conflict_override',
                  service1: service1.serviceCode,
                  service2: service2.serviceCode,
                  message: `${doc1.name} und ${doc2?.name || service2.serviceCode} werden am selben Tag abgerechnet (mit Begründung).`
                });
              }
            } else {
              warnings.push({
                type: 'conflict_override',
                service1: service1.serviceCode,
                service2: service2.serviceCode,
                message: `${doc1.name} und ${doc2?.name || service2.serviceCode} werden am selben Tag abgerechnet.`
              });
            }
          } else {
            // Keine Überschreibung erlaubt
            conflicts.push({
              type: 'conflict',
              severity: 'error',
              service1: service1.serviceCode,
              service2: service2.serviceCode,
              message: `${doc1.name} und ${doc2?.name || service2.serviceCode} können nicht am selben Tag abgerechnet werden.`
            });
          }
        }
      }
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts,
    warnings: warnings
  };
}
```

#### 1.3 Integration in bestehende Validierung

**Erweitere `validateBillingServices()`:**

```javascript
async function validateBillingServices(patientId, services, invoiceDate, excludeInvoiceId = null) {
  const errors = [];
  const warnings = [];
  
  // ... bestehende Validierung ...
  
  // NEU: Prüfe Service-Konflikte
  const conflictCheck = await checkServiceConflicts(services, patientId, invoiceDate, excludeInvoiceId);
  
  if (conflictCheck.hasConflicts) {
    conflictCheck.conflicts.forEach(conflict => {
      errors.push(conflict.message);
    });
  }
  
  conflictCheck.warnings.forEach(warning => {
    warnings.push(warning.message);
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}
```

#### 1.4 Frontend-Integration

**Invoice-Service-Array erweitern:**

```typescript
// In Invoice-Service-Interface:
interface InvoiceService {
  date: Date;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  // NEU:
  justification?: string;  // Begründung für Konflikt-Überschreibung
  notes?: string;           // Zusätzliche Notizen
}
```

**UI-Validierung:**
- Beim Hinzufügen eines Services: Prüfe Konflikte in Echtzeit
- Zeige Warnung/Fehler, wenn Konflikt erkannt wird
- Zeige Eingabefeld für Begründung, wenn `overrideRequiresJustification: true`

### Machbarkeit: ✅ SEHR GUT

**Vorteile:**
- Nutzt bestehende Validierungsstruktur
- Minimal-invasive Änderungen (nur ServiceCatalog erweitern)
- Rückwärtskompatibel (optionales Feld)
- Flexibel erweiterbar

**Risiken:**
- Performance: Bei vielen Services könnte die Konfliktprüfung langsam werden
- Lösung: Caching der ServiceCatalog-Daten, Indexierung

**Aufwand:**
- Backend: ~2-3 Stunden
- Frontend: ~2-3 Stunden
- Testing: ~2 Stunden
- **Gesamt: ~6-8 Stunden**

---

## 2. Begründungspflicht-Validierung

### Aktueller Stand

**✅ Vorhanden:**
- `requiresApproval` Feld in ServiceCatalog
- `notes` Feld in Performance und Invoice
- `justification` wird bereits in verschiedenen Modellen verwendet (z.B. Appointment)

**❌ Fehlt:**
- Validierung, dass `justification`/`notes` ausgefüllt sind, wenn `requiresApproval: true`
- Validierung für spezifische Felder (z.B. "Dringlichkeit" erfordert Uhrzeit)

### Vorschlag: Implementierung

#### 2.1 Datenmodell-Erweiterung

**ServiceCatalog-Modell erweitern:**

```javascript
// In ServiceCatalog.js, ogk-Objekt erweitern:
ogk: {
  // ... bestehende Felder ...
  
  // NEU: Begründungspflicht-Regeln
  justificationRules: {
    requiresJustification: Boolean,        // true = Begründung ist Pflicht
    justificationType: String,             // 'text', 'time', 'diagnosis', 'combination'
    justificationFields: {                // Welche Felder sind Pflicht
      text: Boolean,                       // Textfeld erforderlich
      time: Boolean,                       // Uhrzeit erforderlich
      diagnosis: Boolean,                  // Diagnose erforderlich
      urgency: Boolean,                   // Dringlichkeit erforderlich
      reason: Boolean                     // Grund erforderlich
    },
    minLength: Number,                    // Mindestlänge für Text (optional)
    maxLength: Number,                    // Maximallänge für Text (optional)
    validationPattern: String            // Regex-Pattern für Validierung (optional)
  }
}
```

**Beispiel:**
```javascript
{
  code: "DURG", // Dringlichkeit
  ogk: {
    justificationRules: {
      requiresJustification: true,
      justificationType: 'combination',
      justificationFields: {
        text: true,      // Textfeld erforderlich
        time: true,      // Uhrzeit erforderlich
        urgency: true    // Dringlichkeit erforderlich
      },
      minLength: 10
    }
  }
}
```

#### 2.2 Validierungslogik erweitern

**Neue Funktion in `billing-validation.js`:**

```javascript
/**
 * Prüft ob Begründungspflicht erfüllt ist
 * @param {Object} service - Service-Objekt
 * @param {Object} serviceDoc - ServiceCatalog-Eintrag
 * @returns {Object} { isValid: boolean, errors: Array, warnings: Array }
 */
function validateJustification(service, serviceDoc) {
  const errors = [];
  const warnings = [];
  
  if (!serviceDoc.ogk?.justificationRules?.requiresJustification) {
    return { isValid: true, errors: [], warnings: [] };
  }
  
  const rules = serviceDoc.ogk.justificationRules;
  
  // Prüfe Textfeld
  if (rules.justificationFields.text) {
    const justification = service.justification || service.notes || '';
    
    if (!justification || justification.trim().length === 0) {
      errors.push(`Begründung ist für ${serviceDoc.name} erforderlich`);
    } else if (rules.minLength && justification.length < rules.minLength) {
      errors.push(`Begründung muss mindestens ${rules.minLength} Zeichen lang sein`);
    } else if (rules.maxLength && justification.length > rules.maxLength) {
      errors.push(`Begründung darf maximal ${rules.maxLength} Zeichen lang sein`);
    }
    
    // Prüfe Regex-Pattern
    if (rules.validationPattern) {
      const pattern = new RegExp(rules.validationPattern);
      if (!pattern.test(justification)) {
        errors.push(`Begründung entspricht nicht dem erforderlichen Format`);
      }
    }
  }
  
  // Prüfe Uhrzeit
  if (rules.justificationFields.time) {
    if (!service.serviceTime || !service.serviceDatetime) {
      errors.push(`Uhrzeit ist für ${serviceDoc.name} erforderlich`);
    }
  }
  
  // Prüfe Diagnose
  if (rules.justificationFields.diagnosis) {
    // Prüfe ob Diagnose in Invoice vorhanden ist
    // (wird von außen übergeben)
  }
  
  // Prüfe Dringlichkeit
  if (rules.justificationFields.urgency) {
    if (!service.urgency || !service.urgencyLevel) {
      errors.push(`Dringlichkeit ist für ${serviceDoc.name} erforderlich`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}
```

#### 2.3 Integration in bestehende Validierung

**Erweitere `validateBillingServices()`:**

```javascript
async function validateBillingServices(patientId, services, invoiceDate, excludeInvoiceId = null, invoiceDiagnoses = []) {
  const errors = [];
  const warnings = [];
  
  // ... bestehende Validierung ...
  
  // NEU: Prüfe Begründungspflicht
  for (const service of services) {
    const serviceDoc = await ServiceCatalog.findOne({ code: service.serviceCode });
    
    if (serviceDoc && serviceDoc.ogk?.justificationRules?.requiresJustification) {
      // Prüfe Diagnose, falls erforderlich
      if (serviceDoc.ogk.justificationRules.justificationFields.diagnosis) {
        if (!invoiceDiagnoses || invoiceDiagnoses.length === 0) {
          errors.push(`Diagnose ist für ${serviceDoc.name} erforderlich`);
        }
      }
      
      // Prüfe Begründung
      const justificationCheck = validateJustification(service, serviceDoc);
      if (!justificationCheck.isValid) {
        errors.push(...justificationCheck.errors);
      }
      warnings.push(...justificationCheck.warnings);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}
```

#### 2.4 Frontend-Integration

**Invoice-Service-Interface erweitern:**

```typescript
interface InvoiceService {
  date: Date;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  // NEU:
  justification?: string;     // Begründung
  serviceTime?: string;       // Uhrzeit (HH:mm)
  urgency?: boolean;          // Dringlichkeit
  urgencyLevel?: string;      // Dringlichkeitsstufe
  notes?: string;            // Zusätzliche Notizen
}
```

**UI-Validierung:**
- Beim Auswählen eines Services: Prüfe `justificationRules`
- Zeige Pflichtfelder dynamisch an (Textfeld, Uhrzeit, etc.)
- Validiere in Echtzeit beim Ausfüllen
- Zeige Fehler, wenn Pflichtfelder fehlen

### Machbarkeit: ✅ SEHR GUT

**Vorteile:**
- Nutzt bestehende `notes`/`justification` Felder
- Minimal-invasive Änderungen
- Flexibel erweiterbar (verschiedene Begründungstypen)
- Rückwärtskompatibel

**Risiken:**
- Frontend-Komplexität: Dynamische Felder je nach Service
- Lösung: Wiederverwendbare Komponenten für verschiedene Feldtypen

**Aufwand:**
- Backend: ~2-3 Stunden
- Frontend: ~4-5 Stunden (dynamische Felder)
- Testing: ~2 Stunden
- **Gesamt: ~8-10 Stunden**

---

## 3. Kürzel-Mapping zwischen Versicherungsträgern

### Aktueller Stand

**✅ Vorhanden:**
- `insuranceProvider` Feld in ServiceCatalog
- `LaborMapping` Modell als Beispiel für Mapping-Logik
- Versicherungsträger-Enum: `['oegk', 'bvaeb', 'svs', 'kfa', 'pva', 'vaeb', 'auva', 'all']`

**❌ Fehlt:**
- Mapping-Tabelle zwischen Service-Codes verschiedener Versicherungsträger
- Automatische Code-Zuordnung basierend auf Patient-Versicherung

### Vorschlag: Implementierung

#### 3.1 Neues Datenmodell

**Neues Modell: `ServiceCodeMapping.js`**

```javascript
const mongoose = require('mongoose');

const ServiceCodeMappingSchema = new mongoose.Schema({
  // Basis-Service (interner Code)
  baseCode: {
    type: String,
    required: true,
    index: true
  },
  
  // Service-Name (für Anzeige)
  baseName: {
    type: String,
    required: true
  },
  
  // Mappings zu verschiedenen Versicherungsträgern
  mappings: [{
    insuranceProvider: {
      type: String,
      enum: ['oegk', 'bvaeb', 'svs', 'kfa', 'pva', 'vaeb', 'auva'],
      required: true
    },
    code: {
      type: String,
      required: true  // Externer Code für diesen Versicherungsträger
    },
    name: String,     // Optional: Name beim Versicherungsträger
    price: Number,    // Optional: Preis beim Versicherungsträger (in Euro)
    validFrom: Date,  // Optional: Gültig ab
    validUntil: Date, // Optional: Gültig bis
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Metadaten
  specialty: String,  // Fachrichtung (optional)
  category: String,   // Kategorie (optional)
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index für schnelle Suche
ServiceCodeMappingSchema.index({ baseCode: 1, 'mappings.insuranceProvider': 1 });
ServiceCodeMappingSchema.index({ 'mappings.code': 1, 'mappings.insuranceProvider': 1 });

module.exports = mongoose.model('ServiceCodeMapping', ServiceCodeMappingSchema);
```

**Beispiel-Daten:**
```javascript
{
  baseCode: "EKG",
  baseName: "Elektrokardiogramm",
  mappings: [
    {
      insuranceProvider: "oegk",
      code: "15",
      name: "EKG",
      price: 12.50,
      isActive: true
    },
    {
      insuranceProvider: "svs",
      code: "12",
      name: "Elektrokardiogramm",
      price: 13.00,
      isActive: true
    },
    {
      insuranceProvider: "bvaeb",
      code: "EKG-001",
      name: "EKG Standard",
      price: 12.00,
      isActive: true
    }
  ]
}
```

#### 3.2 Mapping-Service

**Neuer Service: `serviceCodeMappingService.js`**

```javascript
const ServiceCodeMapping = require('../models/ServiceCodeMapping');
const ServiceCatalog = require('../models/ServiceCatalog');

class ServiceCodeMappingService {
  /**
   * Findet den passenden Code für einen Versicherungsträger
   * @param {String} baseCode - Interner Service-Code
   * @param {String} insuranceProvider - Versicherungsträger (oegk, svs, etc.)
   * @returns {Promise<Object|null>} Mapping-Objekt oder null
   */
  async findMapping(baseCode, insuranceProvider) {
    try {
      const mapping = await ServiceCodeMapping.findOne({
        baseCode: baseCode,
        'mappings.insuranceProvider': insuranceProvider,
        'mappings.isActive': true,
        isActive: true
      });
      
      if (!mapping) {
        return null;
      }
      
      // Finde spezifisches Mapping
      const providerMapping = mapping.mappings.find(
        m => m.insuranceProvider === insuranceProvider && m.isActive
      );
      
      if (!providerMapping) {
        return null;
      }
      
      return {
        baseCode: mapping.baseCode,
        baseName: mapping.baseName,
        providerCode: providerMapping.code,
        providerName: providerMapping.name || mapping.baseName,
        providerPrice: providerMapping.price,
        insuranceProvider: insuranceProvider
      };
    } catch (error) {
      console.error('[ServiceCodeMapping] Fehler beim Finden des Mappings:', error);
      return null;
    }
  }
  
  /**
   * Konvertiert einen Service-Code für einen Versicherungsträger
   * @param {String} baseCode - Interner Service-Code
   * @param {String} insuranceProvider - Versicherungsträger
   * @returns {Promise<String|null>} Provider-spezifischer Code oder null
   */
  async convertCode(baseCode, insuranceProvider) {
    const mapping = await this.findMapping(baseCode, insuranceProvider);
    return mapping ? mapping.providerCode : null;
  }
  
  /**
   * Konvertiert mehrere Service-Codes für einen Versicherungsträger
   * @param {Array} services - Array von Service-Objekten
   * @param {String} insuranceProvider - Versicherungsträger
   * @returns {Promise<Array>} Array von konvertierten Services
   */
  async convertServices(services, insuranceProvider) {
    const convertedServices = [];
    
    for (const service of services) {
      const mapping = await this.findMapping(service.serviceCode, insuranceProvider);
      
      if (mapping) {
        convertedServices.push({
          ...service,
          serviceCode: mapping.providerCode,
          serviceName: mapping.providerName,
          unitPrice: mapping.providerPrice || service.unitPrice
        });
      } else {
        // Fallback: Verwende Original-Code
        convertedServices.push(service);
      }
    }
    
    return convertedServices;
  }
  
  /**
   * Erstellt automatisch Mapping aus ServiceCatalog
   * @param {String} baseCode - Interner Service-Code
   * @returns {Promise<Object>} Erstelltes Mapping
   */
  async createMappingFromServiceCatalog(baseCode) {
    const service = await ServiceCatalog.findOne({ code: baseCode });
    
    if (!service) {
      throw new Error(`Service ${baseCode} nicht gefunden`);
    }
    
    // Erstelle Mapping mit vorhandenen Daten
    const mapping = new ServiceCodeMapping({
      baseCode: baseCode,
      baseName: service.name,
      mappings: []
    });
    
    // Füge Mappings für alle Versicherungsträger hinzu, die im ServiceCatalog definiert sind
    if (service.ogk?.insuranceProvider && service.ogk.insuranceProvider !== 'all') {
      mapping.mappings.push({
        insuranceProvider: service.ogk.insuranceProvider,
        code: service.ogk.khoCode || service.ogk.ebmCode || baseCode,
        name: service.name,
        price: service.ogk.khoPrice || service.ogk.ebmPrice || service.price,
        isActive: true
      });
    }
    
    await mapping.save();
    return mapping;
  }
}

module.exports = new ServiceCodeMappingService();
```

#### 3.3 Integration in Billing-Service

**Erweitere `billingService.js`:**

```javascript
const serviceCodeMappingService = require('./serviceCodeMappingService');

// In submitToELDA() oder ähnlicher Funktion:
async submitToELDA(job, billingResponse) {
  // ... bestehende Logik ...
  
  // NEU: Konvertiere Service-Codes für Versicherungsträger
  const patient = await this.loadPatientData(performance.patientId);
  const insuranceProvider = this.mapInsuranceProviderToCode(patient.insuranceProvider);
  
  if (insuranceProvider) {
    const convertedServices = await serviceCodeMappingService.convertServices(
      eldaData.services,
      insuranceProvider
    );
    
    eldaData.services = convertedServices;
  }
  
  // ... rest der Logik ...
}

// Hilfsfunktion
mapInsuranceProviderToCode(insuranceProvider) {
  const mapping = {
    'ÖGK (Österreichische Gesundheitskasse)': 'oegk',
    'SVS (Sozialversicherung der Selbständigen)': 'svs',
    'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)': 'bvaeb',
    'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)': 'kfa',
    'PVA (Pensionsversicherungsanstalt)': 'pva',
    'VAEB (Versicherungsanstalt öffentlich Bediensteter)': 'vaeb',
    'AUVA (Allgemeine Unfallversicherungsanstalt)': 'auva'
  };
  
  return mapping[insuranceProvider] || null;
}
```

#### 3.4 Frontend-Integration

**ServiceCatalog-UI erweitern:**

- Neuer Tab "Code-Mappings" in ServiceCatalog-Verwaltung
- Tabelle mit allen Versicherungsträgern
- Eingabefelder für Code, Name, Preis pro Versicherungsträger
- Automatische Vorschläge aus ServiceCatalog-Daten

**Invoice-UI:**
- Beim Erstellen einer Rechnung: Zeige automatisch den richtigen Code basierend auf Patient-Versicherung
- Tooltip: "Interner Code: EKG → ÖGK-Code: 15"

### Machbarkeit: ✅ GUT

**Vorteile:**
- Nutzt bestehende `LaborMapping`-Struktur als Vorlage
- Klare Trennung: Mapping-Modell vs. ServiceCatalog
- Flexibel: Unterstützt mehrere Versicherungsträger
- Rückwärtskompatibel: Fallback auf Original-Code

**Risiken:**
- Datenpflege: Mappings müssen für alle Services gepflegt werden
- Lösung: Automatische Erstellung aus ServiceCatalog, manuelle Anpassung möglich
- Performance: Bei vielen Services könnte Mapping langsam sein
- Lösung: Caching, Indexierung

**Aufwand:**
- Backend (Modell + Service): ~4-5 Stunden
- Backend (Integration): ~2-3 Stunden
- Frontend (UI): ~4-5 Stunden
- Daten-Migration: ~2-3 Stunden (Initial-Mappings erstellen)
- Testing: ~3 Stunden
- **Gesamt: ~15-19 Stunden**

---

## Zusammenfassung: Machbarkeit & Integration

### 1. Ausschluss-Logik (Conflict-Detection)

**Machbarkeit:** ✅ SEHR GUT
- Nutzt bestehende Validierungsstruktur
- Minimal-invasive Änderungen
- **Aufwand: ~6-8 Stunden**

**Integration:**
- ✅ Keine Breaking Changes
- ✅ Rückwärtskompatibel (optionales Feld)
- ✅ Performance: Gut (mit Caching)

---

### 2. Begründungspflicht-Validierung

**Machbarkeit:** ✅ SEHR GUT
- Nutzt bestehende Felder (`notes`, `justification`)
- Flexibel erweiterbar
- **Aufwand: ~8-10 Stunden**

**Integration:**
- ✅ Keine Breaking Changes
- ✅ Rückwärtskompatibel
- ⚠️ Frontend-Komplexität: Dynamische Felder (lösbar)

---

### 3. Kürzel-Mapping zwischen Versicherungsträgern

**Machbarkeit:** ✅ GUT
- Nutzt bestehende `LaborMapping`-Struktur als Vorlage
- Klare Architektur
- **Aufwand: ~15-19 Stunden**

**Integration:**
- ✅ Keine Breaking Changes
- ✅ Rückwärtskompatibel (Fallback auf Original-Code)
- ⚠️ Datenpflege: Mappings müssen gepflegt werden (lösbar mit automatischer Erstellung)

---

## Gesamtbewertung

### Realisierbarkeit: ✅ ALLE DREI KOMPONENTEN SIND REALISIERBAR

**Gründe:**
1. **Bestehende Infrastruktur:** Alle drei Komponenten können die vorhandene Validierungs- und Mapping-Struktur nutzen
2. **Rückwärtskompatibilität:** Alle Änderungen sind optional und brechen nichts
3. **Modulare Architektur:** Jede Komponente kann unabhängig implementiert werden
4. **Bewährte Patterns:** Nutzt bereits vorhandene Patterns (LaborMapping, Validierung)

### Integration ohne Probleme: ✅ JA

**Voraussetzungen:**
1. **Schrittweise Implementierung:** Eine Komponente nach der anderen
2. **Testing:** Jede Komponente einzeln testen
3. **Migration:** Bestehende Daten bleiben kompatibel
4. **Fallback-Mechanismen:** Wenn Mapping/Validierung fehlschlägt, Fallback auf Original-Verhalten

### Empfohlene Reihenfolge

1. **Ausschluss-Logik** (6-8h) - Schnellste Implementierung, sofortiger Nutzen
2. **Begründungspflicht** (8-10h) - Mittlerer Aufwand, wichtiges Feature
3. **Kürzel-Mapping** (15-19h) - Längster Aufwand, aber sehr wertvoll für Multi-Versicherungsträger-Support

### Gesamtaufwand: ~29-37 Stunden

**Realistische Schätzung mit Puffer:** ~40-50 Stunden (inkl. Testing, Dokumentation, Bug-Fixes)

---

## Nächste Schritte (wenn implementiert werden soll)

1. **Datenmodell-Design finalisieren** (1-2h)
2. **Backend-Implementierung** (schrittweise, eine Komponente nach der anderen)
3. **Frontend-Integration** (parallel zu Backend)
4. **Testing** (Unit-Tests, Integration-Tests)
5. **Dokumentation** (API-Dokumentation, Benutzerhandbuch)
6. **Migration** (Initial-Daten für bestehende Services)
