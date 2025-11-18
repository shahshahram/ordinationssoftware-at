# 🏥 ELGA Ambulanzbefund - Implementierungskonzept (Executive Summary)

**Version:** 1.0  
**Datum:** 2025-11-01  
**Status:** Machbarkeitsanalyse & Konzept

---

## 📋 Executive Summary

### Zielsetzung
Implementierung eines **dynamischen Formularsystems für Ambulanzbefunde** gemäß ELGA Implementierungsleitfaden mit:
- **Mehrere Spezialisierungen** (Allgemein, HNO, Interne, etc.)
- **Arbeitsbefund-Workflow** (lokaler Ordinationsbefund → CDA-Export)
- **ELGA-konforme CDA-Generierung**
- **Integration in bestehende XDS Registry/Repository**

### Machbarkeit: ✅ **HOCH**

Die Basis-Architektur existiert bereits:
- ✅ XDS Registry/Repository System
- ✅ CDA-Viewer & XSLT-Transformation
- ✅ Document Template System (Grundlage vorhanden)
- ✅ DocumentDesign-Konzept (dokumentiert)
- ✅ ELGA Valuesets/CodeSystems (importiert)

---

## 🎯 Anforderungen

### Funktionale Anforderungen

1. **Arbeitsbefund-Formulare**
   - Dynamische Formular-Architektur basierend auf ELGA IL
   - Spezialisierungs-spezifische Felder (Allgemein, HNO, Interne, etc.)
   - Validierung gemäß IL-Regeln
   - Medizinisch relevant & validiert

2. **CDA-Generierung**
   - Export von Arbeitsbefund → ELGA CDA
   - Konform mit ELGA Ambulanzbefund IL (Version prüfen)
   - Verwendung Allgemeiner IL (Version abhängig vom speziellen IL)
   - Integration in XDS Registry/Repository

3. **Workflow**
   - **Arbeitsbefund** = Primäre Quelle
   - **CDA** = Export/Archivierung (nicht umgekehrt)
   - Später: Übernahme von CDA-Bestandteilen in Arbeitsbefund

4. **Spezialisierungen**
   - Alle Spezialisierungen die gemäß IL umsetzbar sind
   - Konfigurierbare Formular-Varianten
   - Gemeinsame Basis + spezialisierte Felder

---

## 🏗️ Technische Architektur

### 1. Datenmodell

#### 1.1 Arbeitsbefund-Model (Neues Schema)

```javascript
// backend/models/Ambulanzbefund.js

const AmbulanzbefundSchema = new mongoose.Schema({
  // Identifikation
  documentNumber: { type: String, required: true, unique: true, index: true },
  version: { type: Number, default: 1 },
  
  // Zuordnung
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Spezialisierung
  specialization: {
    type: String,
    enum: ['allgemein', 'hno', 'interne', 'chirurgie', 'dermatologie', 'gyn', 'pädiatrie', 'neurologie', 'orthopädie', 'ophthalmologie', 'urologie'],
    required: true,
    index: true
  },
  
  // Formular-Template Referenz
  formTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AmbulanzbefundFormTemplate',
    required: true
  },
  
  // Formulardaten (flexibles Schema basierend auf Template)
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
    // Struktur wird durch formTemplateId definiert
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'validated', 'finalized', 'archived', 'exported'],
    default: 'draft',
    index: true
  },
  
  // Validierung
  validation: {
    isValid: { type: Boolean, default: false },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    validatedAt: Date,
    validationErrors: [{
      field: String,
      message: String,
      severity: { type: String, enum: ['error', 'warning', 'info'] }
    }]
  },
  
  // CDA-Export Information
  cdaExport: {
    exported: { type: Boolean, default: false },
    exportedAt: Date,
    exportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    xdsDocumentEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'XdsDocumentEntry' },
    cdaVersion: String, // ELGA IL Version
    templateId: String, // CDA Template-ID
    formatCode: String,
    classCode: String,
    typeCode: String
  },
  
  // Anamnese & Befunde (strukturiert)
  anamnesis: {
    chiefComplaint: String,
    historyOfPresentIllness: String,
    pastMedicalHistory: String,
    familyHistory: String,
    socialHistory: String,
    reviewOfSystems: mongoose.Schema.Types.Mixed // Spezialisierungs-abhängig
  },
  
  examination: {
    general: mongoose.Schema.Types.Mixed,
    specialized: mongoose.Schema.Types.Mixed, // Spezialisierungs-abhängig
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
      code: String, // ICD-10
      display: String,
      codingScheme: String
    },
    secondaryDiagnoses: [{
      code: String,
      display: String,
      codingScheme: String
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
      urgency: String
    }]
  },
  
  // Metadaten
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  finalizedAt: Date,
  
  // Archivierung
  archivedAt: Date,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'ambulanzbefunde'
});

// Indizes
AmbulanzbefundSchema.index({ patientId: 1, createdAt: -1 });
AmbulanzbefundSchema.index({ locationId: 1, status: 1 });
AmbulanzbefundSchema.index({ specialization: 1, status: 1 });
AmbulanzbefundSchema.index({ 'cdaExport.exported': 1 });
```

#### 1.2 Ambulanzbefund-Formular-Template (Neues Schema)

```javascript
// backend/models/AmbulanzbefundFormTemplate.js

const AmbulanzbefundFormTemplateSchema = new mongoose.Schema({
  // Identifikation
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true },
  version: { type: String, required: true }, // z.B. "1.0" oder "2.06.5"
  
  // ELGA IL Referenz
  elgaIlReference: {
    generalIlVersion: String, // Allgemeiner IL Version
    specificIlVersion: String, // Ambulanzbefund IL Version
    templateId: String, // CDA Template-ID (falls bekannt)
    formatCode: String,
    classCode: String,
    typeCode: String
  },
  
  // Spezialisierung
  specialization: {
    type: String,
    enum: ['allgemein', 'hno', 'interne', 'chirurgie', 'dermatologie', 'gyn', 'pädiatrie', 'neurologie', 'orthopädie', 'ophthalmologie', 'urologie'],
    required: true
  },
  
  // Formular-Definition (JSON Schema + UI Definition)
  formDefinition: {
    // JSON Schema für Validierung
    schema: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    
    // UI Definition (basierend auf DocumentDesign-Konzept)
    layout: {
      type: mongoose.Schema.Types.Mixed,
      required: true
      // Sections, Fields, AutoSections (siehe DOKUMENTEN_DESIGNER_KONZEPT.md)
    },
    
    // Feld-Mapping zu CDA
    cdaMapping: {
      type: mongoose.Schema.Types.Mixed
      // Mapping von Formularfeldern → CDA-Elemente
    }
  },
  
  // Verfügbarkeit
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }, // Default für Spezialisierung
  
  // Metadaten
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'ambulanzbefund_form_templates'
});

AmbulanzbefundFormTemplateSchema.index({ specialization: 1, isActive: 1 });
AmbulanzbefundFormTemplateSchema.index({ code: 1, version: 1 });
```

---

## 🔄 Workflow

### 2.1 Arbeitsbefund-Erstellung

```
┌─────────────────────────────────────────────────┐
│ 1. Arzt öffnet Patient → "Neuer Ambulanzbefund" │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 2. Spezialisierung wählen (Allgemein, HNO, ...)  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 3. Formular-Template laden (basierend auf       │
│    Spezialisierung + ELGA IL)                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 4. Dynamisches Formular rendern                 │
│    - Basis-Felder (Anamnese, Befund, etc.)     │
│    - Spezialisierungs-spezifische Felder       │
│    - Validierung gemäß IL                      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 5. Daten eingeben & validieren                  │
│    - Echtzeit-Validierung                       │
│    - IL-Regeln prüfen                           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 6. Speichern als "Draft"                        │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 7. Validierung durchführen                       │
│    - Alle Pflichtfelder prüfen                  │
│    - IL-Konformität prüfen                      │
│    - Medizinische Validität prüfen              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 8. Status: "Validated" oder "Finalized"         │
└─────────────────────────────────────────────────┘
```

### 2.2 CDA-Export

```
┌─────────────────────────────────────────────────┐
│ 1. Arbeitsbefund auswählen (Status: Finalized) │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 2. "Als CDA exportieren" klicken                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 3. CDA-Generator Service                        │
│    - FormData → CDA Mapping                     │
│    - ELGA IL Template anwenden                │
│    - Allgemeiner IL Version beachten            │
│    - Metadaten setzen (ClassCode, TypeCode,    │
│      FormatCode)                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 4. CDA XML generieren                           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 5. XDS Registry/Repository                      │
│    - DocumentEntry erstellen                    │
│    - Datei im Repository speichern              │
│    - Metadaten registrieren                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 6. Arbeitsbefund aktualisieren                  │
│    - cdaExport.exported = true                  │
│    - xdsDocumentEntryId verknüpfen             │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Technische Komponenten

### 3.1 Backend Services

#### 3.1.1 Ambulanzbefund Service

```javascript
// backend/services/AmbulanzbefundService.js

class AmbulanzbefundService {
  /**
   * Erstellt neuen Arbeitsbefund
   */
  async createAmbulanzbefund(patientId, locationId, userId, specialization, formData) {
    // 1. Template laden
    const template = await this.getTemplateForSpecialization(specialization);
    
    // 2. Validierung
    const validation = await this.validateFormData(formData, template);
    
    // 3. Arbeitsbefund erstellen
    const ambefund = await Ambulanzbefund.create({
      patientId,
      locationId,
      createdBy: userId,
      specialization,
      formTemplateId: template._id,
      formData,
      validation
    });
    
    return ambefund;
  }
  
  /**
   * Validiert Formulardaten gegen Template & IL
   */
  async validateFormData(formData, template) {
    // JSON Schema Validierung
    const schemaValidation = await this.validateAgainstSchema(formData, template.formDefinition.schema);
    
    // IL-Regeln Validierung
    const ilValidation = await this.validateAgainstIL(formData, template.elgaIlReference);
    
    return {
      isValid: schemaValidation.isValid && ilValidation.isValid,
      errors: [...schemaValidation.errors, ...ilValidation.errors]
    };
  }
  
  /**
   * Exportiert Arbeitsbefund als CDA
   */
  async exportToCDA(ambefundId, userId) {
    const ambefund = await Ambulanzbefund.findById(ambefundId)
      .populate('formTemplateId')
      .populate('patientId')
      .populate('locationId')
      .populate('createdBy');
    
    // 1. CDA generieren
    const cdaXml = await CdaGeneratorService.generateAmbulanzbefundCDA(
      ambefund,
      ambefund.formTemplateId
    );
    
    // 2. XDS Registry/Repository
    const xdsEntry = await XdsRegistryService.registerDocument(
      ambefund.locationId._id,
      {
        fileBuffer: Buffer.from(cdaXml, 'utf8'),
        metadata: {
          patientId: ambefund.patientId._id.toString(),
          title: `Ambulanzbefund - ${ambefund.patientId.firstName} ${ambefund.patientId.lastName}`,
          mimeType: 'application/xml',
          classCode: ambefund.formTemplateId.elgaIlReference.classCode,
          typeCode: ambefund.formTemplateId.elgaIlReference.typeCode,
          formatCode: ambefund.formTemplateId.elgaIlReference.formatCode,
          comments: `Exportiert aus Arbeitsbefund ${ambefund.documentNumber}`
        }
      },
      userId
    );
    
    // 3. Arbeitsbefund aktualisieren
    ambefund.cdaExport = {
      exported: true,
      exportedAt: new Date(),
      exportedBy: userId,
      xdsDocumentEntryId: xdsEntry._id,
      cdaVersion: ambefund.formTemplateId.elgaIlReference.specificIlVersion,
      templateId: ambefund.formTemplateId.elgaIlReference.templateId,
      formatCode: ambefund.formTemplateId.elgaIlReference.formatCode,
      classCode: ambefund.formTemplateId.elgaIlReference.classCode,
      typeCode: ambefund.formTemplateId.elgaIlReference.typeCode
    };
    await ambefund.save();
    
    return { ambefund, xdsEntry, cdaXml };
  }
}
```

#### 3.1.2 CDA Generator Service

```javascript
// backend/services/CdaGeneratorService.js

class CdaGeneratorService {
  /**
   * Generiert CDA Ambulanzbefund
   */
  async generateAmbulanzbefundCDA(ambefund, template) {
    // 1. Basis-CDA-Struktur (Allgemeiner IL)
    const baseCda = await this.loadBaseCDATemplate(template.elgaIlReference.generalIlVersion);
    
    // 2. Spezieller IL Template (Ambulanzbefund)
    const specificTemplate = await this.loadSpecificILTemplate(
      'Ambulanzbefund',
      template.elgaIlReference.specificIlVersion
    );
    
    // 3. Daten-Mapping
    const cdaData = this.mapFormDataToCDA(ambefund.formData, template.formDefinition.cdaMapping);
    
    // 4. CDA XML zusammenbauen
    const cdaXml = this.buildCDAXML(baseCda, specificTemplate, cdaData, {
      patient: ambefund.patientId,
      author: ambefund.createdBy,
      location: ambefund.locationId,
      documentId: ambefund.documentNumber,
      templateId: template.elgaIlReference.templateId,
      formatCode: template.elgaIlReference.formatCode,
      classCode: template.elgaIlReference.classCode,
      typeCode: template.elgaIlReference.typeCode
    });
    
    // 5. Validierung
    await this.validateCDA(cdaXml, template.elgaIlReference);
    
    return cdaXml;
  }
  
  /**
   * Mappt Formular-Daten zu CDA-Struktur
   */
  mapFormDataToCDA(formData, cdaMapping) {
    // Mapping-Logik basierend auf template.formDefinition.cdaMapping
    // ...
  }
}
```

### 3.2 Frontend Komponenten

#### 3.2.1 Ambulanzbefund Editor

```
frontend/src/pages/AmbulanzbefundEditor.tsx
  - Spezialisierung-Auswahl
  - Dynamisches Formular-Rendering
  - Validierung (Echtzeit)
  - Speichern/Laden
  - CDA-Export Button

frontend/src/components/AmbulanzbefundForm/
  - DynamicFormRenderer.tsx (rendert Formular aus Template)
  - FormField.tsx (einzelnes Feld)
  - ValidationDisplay.tsx (Validierungs-Fehler)
  - CdaExportDialog.tsx
```

---

## 📊 Implementierungsphasen

### Phase 1: Basis-Architektur (3-4 Wochen)

**Ziele:**
- Datenmodelle (Ambulanzbefund, FormTemplate)
- Basis-Services (CRUD)
- Frontend-Skeleton

**Deliverables:**
- ✅ MongoDB Schemas
- ✅ Backend Routes & Services
- ✅ Frontend Basis-Komponenten
- ✅ Template-Management UI

### Phase 2: Formular-Engine (4-5 Wochen)

**Ziele:**
- Dynamisches Formular-Rendering
- JSON Schema Validierung
- Template-Verwaltung

**Deliverables:**
- ✅ Dynamic Form Renderer
- ✅ JSON Schema Validator
- ✅ Template Editor/Designer
- ✅ Basis-Templates für 2-3 Spezialisierungen

### Phase 3: ELGA IL Integration (3-4 Wochen)

**Ziele:**
- ELGA IL Templates importieren/definieren
- IL-Regeln Validierung
- CDA-Mapping Definition

**Deliverables:**
- ✅ IL Template-Definitionen
- ✅ IL Validator
- ✅ CDA Mapping Engine
- ✅ Basis-CDA-Generator

### Phase 4: CDA-Generierung (4-5 Wochen)

**Ziele:**
- CDA XML Generation
- XDS Registry Integration
- CDA Validierung

**Deliverables:**
- ✅ CDA Generator Service
- ✅ XDS Integration
- ✅ CDA Validator
- ✅ Test-Suite

### Phase 5: Spezialisierungen (2-3 Wochen pro Spezialisierung)

**Ziele:**
- Spezialisierungs-spezifische Templates
- Tests & Validierung

**Deliverables:**
- ✅ Templates für jede Spezialisierung
- ✅ Tests
- ✅ Dokumentation

### Phase 6: Workflow & UI-Polish (2-3 Wochen)

**Ziele:**
- Workflow-Optimierung
- UI-Verbesserungen
- Dokumentation

**Deliverables:**
- ✅ Optimierte Workflows
- ✅ Polished UI
- ✅ Benutzer-Dokumentation

---

## ⚠️ Risiken & Herausforderungen

### Technische Risiken

1. **ELGA IL Komplexität**
   - **Risiko:** IL-Regeln sind komplex, Template-Definitionen müssen exakt sein
   - **Mitigation:** Frühe IL-Analyse, Validierung gegen echte CDA-Beispiele

2. **CDA-Generierung**
   - **Risiko:** CDA XML-Generierung kann fehleranfällig sein
   - **Mitigation:** Verwendung etablierter Libraries (z.B. `fast-xml-parser`), umfassende Tests

3. **Template-Verwaltung**
   - **Risiko:** Komplexe Template-Definitionen schwierig zu verwalten
   - **Mitigation:** Template-Editor mit Validierung, Versionierung

### Organisatorische Risiken

1. **IL-Versionen**
   - **Risiko:** Unterschiedliche IL-Versionen müssen unterstützt werden
   - **Mitigation:** Version-Management in Templates, klare Versionierung

2. **Spezialisierungen**
   - **Risiko:** Viele Spezialisierungen = viel Entwicklungsaufwand
   - **Mitigation:** Phasenweise Einführung, Fokus auf häufigste Spezialisierungen

---

## 💰 Aufwandsschätzung

### Gesamtaufwand: **18-24 Wochen** (bei 1 Entwickler)

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Basis-Architektur | 3-4 Wochen | Hoch |
| Phase 2: Formular-Engine | 4-5 Wochen | Hoch |
| Phase 3: ELGA IL Integration | 3-4 Wochen | Hoch |
| Phase 4: CDA-Generierung | 4-5 Wochen | Hoch |
| Phase 5: Spezialisierungen | 2-3 Wochen/Spez. | Mittel |
| Phase 6: Workflow & Polish | 2-3 Wochen | Mittel |

**Empfehlung:** Start mit **3-4 häufigsten Spezialisierungen**, weitere sukzessive hinzufügen.

---

## ✅ Nächste Schritte

### 1. Analyse & Planung (1-2 Wochen)
- [ ] ELGA Ambulanzbefund IL detailliert analysieren
- [ ] CDA-Beispiel analysieren (bereits hochgeladen)
- [ ] Template-Struktur final definieren
- [ ] Spezialisierungen priorisieren

### 2. Proof of Concept (2 Wochen)
- [ ] Minimaler CDA-Generator für Ambulanzbefund
- [ ] Einfaches Formular-Template (1 Spezialisierung)
- [ ] CDA-Export Test

### 3. Implementierung starten
- [ ] Phase 1 beginnen

---

## 📚 Referenzen

- **ELGA Implementierungsleitfäden:** `docs/ELGA_IMPLEMENTIERUNGSLEITFAEDEN_AKTUELL.md`
- **DocumentDesign-Konzept:** `docs/DOKUMENTEN_DESIGNER_KONZEPT.md`
- **XDS System:** Bereits implementiert
- **ELGA Valuesets:** Bereits importiert

---

## 🔒 Workflow-Regel (WICHTIG)

**NIEMALS:** CDA → Arbeitsbefund  
**IMMER:** Arbeitsbefund → CDA

**Später:** Übernahme von CDA-Bestandteilen in Arbeitsbefund (separates Feature)

---

**Ende des Executive Summary**



