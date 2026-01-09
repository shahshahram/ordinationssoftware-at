# 🔍 Ambulanzbefund Backend-Modell - QA Dokumentation

**Datum:** 2025-11-01  
**Version:** 1.0  
**Status:** Zur QA-Prüfung

---

## 📋 Übersicht

Das System besteht aus zwei Haupt-Modellen:
1. **AmbulanzbefundFormTemplate** - Definiert die Struktur von Formularen
2. **Ambulanzbefund** - Speichert die tatsächlichen Arbeitsbefunde

---

## 🎯 1. AmbulanzbefundFormTemplate Model

### 1.1 Basis-Identifikation

```javascript
{
  name: String,              // z.B. "Ambulanzbefund Allgemeinmedizin"
  code: String,              // Eindeutiger Code, z.B. "AMB-ALLG-001"
  version: String,           // z.B. "1.0"
  description: String        // Optional: Beschreibung
}
```

**Validierung:**
- `name`: required, trim, indexed
- `code`: required, unique, uppercase, indexed
- `version`: required, default "1.0"

---

### 1.2 ELGA IL Referenz

```javascript
elgaIlReference: {
  generalIlVersion: String,        // z.B. "3.2.1+20211001" (Allgemeiner IL)
  specificIlVersion: String,       // z.B. "1.0" (Ambulanzbefund IL)
  templateId: String,              // CDA Template-ID (optional)
  formatCode: {
    code: String,
    codingScheme: String,
    displayName: String
  },
  classCode: {
    code: String,
    codingScheme: String,
    displayName: String
  },
  typeCode: {
    code: String,
    codingScheme: String,
    displayName: String
  }
}
```

**Validierung:**
- `generalIlVersion`: required, default "3.2.1+20211001"
- `specificIlVersion`: required, default "1.0"

---

### 1.3 Spezialisierung

```javascript
specialization: String (enum)
```

**Mögliche Werte:**
- `'allgemein'`
- `'hno'`
- `'interne'`
- `'chirurgie'`
- `'dermatologie'`
- `'gyn'`
- `'pädiatrie'`
- `'neurologie'`
- `'orthopädie'`
- `'ophthalmologie'`
- `'urologie'`
- `'psychiatrie'`
- `'radiologie'`
- `'pathologie'`

**Validierung:**
- required
- indexed

---

### 1.4 Formular-Definition

```javascript
formDefinition: {
  // JSON Schema für Validierung (JSON Schema Draft 7)
  schema: Mixed,              // { type: 'object', properties: {...}, required: [...] }
  
  // UI Definition
  layout: Mixed,              // {
                              //   sections: [{ id, label, position, fields: [...] }],
                              //   fields: [{ id, type, label, dataSource, validation, ... }],
                              //   autoSections: [...]
                              // }
  
  // CDA-Mapping (für späteren Export)
  cdaMapping: Mixed           // { "fieldId": "/ClinicalDocument/..." }
}
```

**Beispiel Schema-Struktur:**
```json
{
  "type": "object",
  "properties": {
    "anamnesis": {
      "type": "object",
      "properties": {
        "chiefComplaint": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "historyOfPresentIllness": {
          "type": "string"
        }
      },
      "required": ["chiefComplaint"]
    }
  },
  "required": ["anamnesis"]
}
```

**Beispiel Layout-Struktur:**
```json
{
  "sections": [
    {
      "id": "anamnesis",
      "label": "Anamnese",
      "position": { "row": 0, "column": 0, "order": 1 },
      "fields": ["chiefComplaint", "historyOfPresentIllness"]
    }
  ],
  "fields": [
    {
      "id": "chiefComplaint",
      "type": "textarea",
      "label": "Hauptbeschwerde",
      "dataSource": "anamnesis.chiefComplaint",
      "sectionId": "anamnesis",
      "required": true,
      "position": { "row": 0, "column": 0, "width": 12, "order": 1 },
      "validation": {
        "minLength": 1,
        "maxLength": 1000
      }
    }
  ]
}
```

---

### 1.5 Verfügbare Sektionen

```javascript
availableSections: [{
  id: String,                    // z.B. "vitalSigns"
  label: String,                 // z.B. "Vitalzeichen"
  description: String,           // Optional
  required: Boolean,             // default: false
  category: String (enum),       // 'basic' | 'specialized' | 'optional'
  applicableSpecializations: [String]  // Für welche Spezialisierungen relevant
}]
```

**Zweck:**
- Ermöglicht dynamische Template-Zusammenstellung
- Benutzer kann auswählen, welche Sections aktiviert werden sollen
- `category: 'basic'` = immer aktiviert
- `category: 'optional'` = kann aktiviert/deaktiviert werden

---

### 1.6 Verfügbarkeit & Zuordnung

```javascript
{
  isActive: Boolean,           // default: true, indexed
  isDefault: Boolean,           // default: false, indexed (Default für Spezialisierung)
  locationId: ObjectId,         // null = global verfügbar, indexed
}
```

**Logik:**
- `isDefault: true` + `specialization: 'allgemein'` = Default-Template für Allgemeinmedizin
- `locationId: null` = Global verfügbar
- `locationId: <id>` = Nur für diesen Standort

---

### 1.7 Metadaten

```javascript
{
  createdBy: ObjectId (ref: 'User'),    // required
  updatedBy: ObjectId (ref: 'User'),    // optional
  tags: [String],                       // Optional
  usageCount: Number                    // default: 0 (Statistik)
}
```

---

### 1.8 Indizes

```javascript
// Einfache Indizes
- { name: 'text', description: 'text', category: 1 }  // Textsuche
- { isActive: 1, category: 1 }
- { createdBy: 1 }

// Zusammengesetzte Indizes
- { specialization: 1, isActive: 1 }
- { specialization: 1, isDefault: 1 }
- { code: 1, version: 1 }
- { locationId: 1, specialization: 1 }
```

---

### 1.9 Statische Methoden

#### `findDefaultForSpecialization(specialization, locationId = null)`

**Zweck:** Findet Default-Template für Spezialisierung

**Priorisierung:**
1. Standort-spezifisches Default-Template
2. Globales Default-Template
3. `null` wenn nicht gefunden

#### `findForSpecialization(specialization, locationId = null)`

**Zweck:** Findet alle Templates für Spezialisierung

**Logik:**
- Wenn `locationId` gesetzt: Standort-spezifische + globale Templates
- Wenn `locationId` null: Nur globale Templates
- Sortiert: `isDefault: -1` (Default zuerst), dann `name: 1`

---

### 1.10 Instanz-Methoden

#### `validateFormData(formData)`

**Zweck:** Validiert Formular-Daten gegen Schema

**Rückgabe:**
```javascript
{
  isValid: Boolean,
  errors: [{
    field: String,
    message: String,
    severity: 'error' | 'warning' | 'info'
  }]
}
```

**Hinweis:** Implementierung erfolgt im Service mit AJV

#### `getTemplateWithSections(selectedSectionIds = [])`

**Zweck:** Gibt Template mit gefilterten Sections zurück

**Logik:**
- Wenn `selectedSectionIds` leer: Alle Sections
- Ansonsten: Nur ausgewählte Sections + zugehörige Fields

**Rückgabe:** Template-Objekt mit `effectiveLayout`

---

## 🏥 2. Ambulanzbefund Model

### 2.1 Identifikation

```javascript
{
  documentNumber: String,        // Unique, indexed, auto-generiert
                                  // Format: "AMB-{timestamp}-{uuid8}"
  version: Number                 // default: 1
}
```

**Auto-Generierung:**
```javascript
default: () => `AMB-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`
```

---

### 2.2 Zuordnung

```javascript
{
  patientId: ObjectId (ref: 'Patient'),      // required, indexed
  locationId: ObjectId (ref: 'Location'),    // required, indexed
  createdBy: ObjectId (ref: 'User'),         // required
}
```

---

### 2.3 Spezialisierung & Template

```javascript
{
  specialization: String (enum),             // required, indexed
                                            // (gleiche Werte wie Template)
  formTemplateId: ObjectId (ref: 'AmbulanzbefundFormTemplate'),  // required
  selectedSections: [String]                 // IDs der aktivierten Sections
}
```

**Logik:**
- `specialization` muss mit `formTemplateId.specialization` übereinstimmen
- `selectedSections` kann leer sein (= alle Sections verwenden)

---

### 2.4 Formular-Daten

```javascript
{
  formData: Mixed,              // required, default: {}
                                // Struktur definiert durch formTemplateId.formDefinition.schema
}
```

**Beispiel:**
```json
{
  "anamnesis": {
    "chiefComplaint": "Kopfschmerzen seit 2 Tagen",
    "historyOfPresentIllness": "Patient klagt über..."
  },
  "examination": {
    "general": "Zustand gut",
    "vitalSigns": {
      "bloodPressure": "120/80",
      "heartRate": 72,
      "temperature": 36.5
    }
  }
}
```

---

### 2.5 Strukturierte Daten (Optional, für bessere Querying)

```javascript
{
  // Wird aus formData extrahiert (Pre-save Hook)
  anamnesis: {
    chiefComplaint: String,
    historyOfPresentIllness: String,
    pastMedicalHistory: String,
    familyHistory: String,
    socialHistory: String,
    reviewOfSystems: Mixed
  },
  
  examination: {
    general: Mixed,
    specialized: Mixed,
    vitalSigns: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      bmi: Number
    }
  },
  
  assessment: {
    primaryDiagnosis: {
      code: String,              // ICD-10
      display: String,
      codingScheme: String
    },
    secondaryDiagnoses: [{
      code: String,
      display: String,
      codingScheme: String,
      date: Date
    }],
    clinicalImpression: String
  },
  
  plan: {
    therapy: String,
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    followUp: {
      date: Date,
      reason: String
    },
    referrals: [{
      specialist: String,
      specialization: String,
      reason: String,
      urgency: 'normal' | 'dringend' | 'notfall'
    }]
  }
}
```

**Zweck:**
- Erleichtert Querying (z.B. "Alle Befunde mit Diagnose XY")
- Wird im Pre-save Hook automatisch aus `formData` extrahiert

---

### 2.6 Status

```javascript
{
  status: String (enum),        // default: 'draft', indexed
                                // 'draft' | 'validated' | 'finalized' | 'archived' | 'exported'
}
```

**Status-Workflow:**
```
draft → validated → finalized → exported
              ↓
          archived
```

---

### 2.7 Validierung

```javascript
{
  validation: {
    isValid: Boolean,           // default: false
    validatedBy: ObjectId (ref: 'User'),
    validatedAt: Date,
    validationErrors: [{
      field: String,
      message: String,
      severity: 'error' | 'warning' | 'info'
    }]
  }
}
```

---

### 2.8 CDA-Export Information

```javascript
{
  cdaExport: {
    exported: Boolean,           // default: false
    exportedAt: Date,
    exportedBy: ObjectId (ref: 'User'),
    xdsDocumentEntryId: ObjectId (ref: 'XdsDocumentEntry'),
    cdaVersion: String,          // ELGA IL Version
    templateId: String,          // CDA Template-ID
    formatCode: String,
    classCode: String,
    typeCode: String
  }
}
```

---

### 2.9 Metadaten

```javascript
{
  createdAt: Date,              // default: Date.now, indexed
  updatedAt: Date,              // default: Date.now
  finalizedAt: Date,
  finalizedBy: ObjectId (ref: 'User'),
  archivedAt: Date,
  archivedBy: ObjectId (ref: 'User'),
  archiveReason: String,
  notes: String,
  tags: [String]
}
```

---

### 2.10 Indizes

```javascript
// Einfache Indizes
- { documentNumber: 1 }          // Unique
- { patientId: 1, createdAt: -1 }  // Sortiert nach Patient, dann Datum
- { locationId: 1, status: 1 }
- { specialization: 1, status: 1 }
- { formTemplateId: 1 }
- { createdBy: 1 }

// Zusammengesetzte Indizes
- { 'cdaExport.exported': 1 }    // Für Query: "Alle exportierten Befunde"
```

---

### 2.11 Virtuals

```javascript
{
  patient: Virtual (ref: 'Patient'),
  formTemplate: Virtual (ref: 'AmbulanzbefundFormTemplate')
}
```

**Verwendung:**
```javascript
const ambefund = await Ambulanzbefund.findById(id).populate('patient').populate('formTemplate');
```

---

### 2.12 Instanz-Methoden

#### `markAsValidated(validatedBy, errors = [])`

**Zweck:** Markiert als validiert

**Logik:**
- Wenn `errors.length === 0`: Status → `'validated'`
- Ansonsten: Status → `'draft'`

#### `finalize(finalizedBy)`

**Zweck:** Finalisiert den Arbeitsbefund

**Validierung:**
- Muss `status: 'validated'` UND `validation.isValid: true` sein
- Sonst: Error

#### `markAsExported(xdsDocumentEntryId, exportedBy, cdaInfo)`

**Zweck:** Markiert als nach CDA exportiert

**Parameter:**
- `xdsDocumentEntryId`: Referenz zum XDS DocumentEntry
- `exportedBy`: User-ID
- `cdaInfo`: { cdaVersion, templateId, formatCode, classCode, typeCode }

**Setzt:**
- `status: 'exported'`
- Alle CDA-Export-Informationen

---

### 2.13 Pre-save Hook

**Zweck:** Extrahiert strukturierte Daten aus `formData`

**Logik:**
```javascript
if (formData.anamnesis) {
  this.anamnesis = { ...this.anamnesis, ...formData.anamnesis };
}
// Gleiche Logik für examination, assessment, plan
```

**Vorteil:**
- Beide Strukturen (`formData` und strukturierte Felder) werden synchron gehalten
- Ermöglicht flexibles Querying

---

## 🔗 Beziehungen zwischen Modellen

```
AmbulanzbefundFormTemplate (1) ──┐
                                 │
                                 │ formTemplateId
                                 │
                                 ↓
                          Ambulanzbefund (N)

Patient (1) ────────────────────┐
                                 │
                                 │ patientId
                                 │
                                 ↓
                          Ambulanzbefund (N)

Location (1) ────────────────────┐
                                 │
                                 │ locationId
                                 │
                                 ↓
                          Ambulanzbefund (N)

User (1) ────────────────────────┐
                                 │
                                 │ createdBy
                                 │
                                 ↓
                          Ambulanzbefund (N)

XdsDocumentEntry (1) ────────────┐
                                 │
                                 │ xdsDocumentEntryId
                                 │ (via cdaExport)
                                 │
                                 ↓
                          Ambulanzbefund (1)
```

---

## ⚠️ QA-Checkpunkte

### Model AmbulanzbefundFormTemplate

- [x] **Eindeutigkeit:** `code` muss unique sein ✅
- [x] **Spezialisierung:** Enum-Werte vollständig? ✅ (14 Werte)
- [x] **Template-Priorisierung:** `findDefaultForSpecialization` funktioniert korrekt? ✅
- [x] **Standort-Logik:** Standort-spezifische vs. globale Templates korrekt? ✅
- [x] **Schema-Validierung:** JSON Schema Format korrekt? ✅ (Service-Level)
- [x] **Layout-Struktur:** Fields haben korrekte `sectionId` Referenzen? ✅
- [x] **Konditionale CDA-Felder:** Service-Level Validierung beim Export? ✅

### Model Ambulanzbefund

- [x] **DocumentNumber:** Auto-Generierung funktioniert? ✅
- [x] **Spezialisierung-Konsistenz:** `specialization` == `formTemplateId.specialization`? ✅ (Service-Level)
- [x] **Pre-save Hook:** Strukturierte Daten werden korrekt extrahiert? ✅
- [x] **Pre-save Hook:** CDA-Export Validierung implementiert? ✅
- [x] **Pre-save Hook:** Status-Konsistenz-Prüfung? ✅
- [x] **Status-Workflow:** Übergänge korrekt validiert? ✅ (Pre-save Hook + Methoden)
- [x] **CDA-Export:** `markAsExported` validiert alle Felder? ✅
- [x] **Konditionale Validierung:** IL-Regeln berücksichtigt? ✅ (Service-Level)

### Beziehungen

- [ ] **Referenzen:** Alle `ref` korrekt?
- [ ] **Cascading:** Was passiert bei Löschung?
- [ ] **Populate:** Virtuals funktionieren?

### Performance

- [ ] **Indizes:** Alle Query-Pfade indexiert?
- [ ] **Text-Suche:** Volltext-Index auf Templates?
- [ ] **Pagination:** Für große Listen implementiert?

### Datenintegrität

- [ ] **Required Fields:** Alle Pflichtfelder definiert?
- [ ] **Defaults:** Sinnvolle Defaults gesetzt?
- [ ] **Validierung:** Enum-Werte vollständig?

---

## 📝 Beispiel-Daten

### Beispiel Template

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Ambulanzbefund Allgemeinmedizin",
  "code": "AMB-ALLG-001",
  "version": "1.0",
  "specialization": "allgemein",
  "isDefault": true,
  "isActive": true,
  "formDefinition": {
    "schema": {
      "type": "object",
      "properties": {
        "anamnesis": {
          "type": "object",
          "properties": {
            "chiefComplaint": { "type": "string", "minLength": 1 }
          },
          "required": ["chiefComplaint"]
        }
      }
    },
    "layout": {
      "sections": [
        {
          "id": "anamnesis",
          "label": "Anamnese",
          "fields": ["chiefComplaint"]
        }
      ],
      "fields": [
        {
          "id": "chiefComplaint",
          "type": "textarea",
          "label": "Hauptbeschwerde",
          "required": true,
          "sectionId": "anamnesis"
        }
      ]
    }
  }
}
```

### Beispiel Arbeitsbefund

```json
{
  "_id": "507f191e810c19729de860ea",
  "documentNumber": "AMB-1730512345-A1B2C3D4",
  "version": 1,
  "patientId": "507f1f77bcf86cd799439012",
  "locationId": "507f1f77bcf86cd799439013",
  "createdBy": "507f1f77bcf86cd799439014",
  "specialization": "allgemein",
  "formTemplateId": "507f1f77bcf86cd799439011",
  "selectedSections": ["anamnesis", "examination"],
  "formData": {
    "anamnesis": {
      "chiefComplaint": "Kopfschmerzen"
    }
  },
  "status": "draft",
  "validation": {
    "isValid": false,
    "validationErrors": []
  },
  "cdaExport": {
    "exported": false
  }
}
```

---

**Ende der QA-Dokumentation**

