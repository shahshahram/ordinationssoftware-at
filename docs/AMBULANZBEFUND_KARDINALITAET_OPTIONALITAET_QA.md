# 🔍 Ambulanzbefund - Kardinalität & Optionalität (QA Check)

**Datum:** 2025-11-01  
**Version:** 2.0 (Korrigiert nach ELGA IL-Anforderungen)  
**Status:** Detaillierte QA-Prüfung

---

## 📊 Übersicht: Beziehungsmodell

### Entity-Relationship-Diagramm

```
┌─────────────────────────┐
│ AmbulanzbefundFormTemplate│
│ (1)                      │
└──────────┬───────────────┘
           │ 1
           │
           │ formTemplateId (REQUIRED, FK)
           │
           ↓ N
┌─────────────────────────┐
│    Ambulanzbefund       │
│        (N)              │
└──────────┬───────────────┘
            │
            ├── patientId (REQUIRED, FK) ──→ Patient (1)
            │
            ├── locationId (REQUIRED, FK) ──→ Location (1)
            │
            ├── createdBy (REQUIRED, FK) ──→ User (1)
            │
            ├── finalizedBy (OPTIONAL, FK) ──→ User (1) [nur wenn finalized]
            │
            ├── validatedBy (OPTIONAL, FK) ──→ User (1) [nur wenn validated]
            │
            └── cdaExport.xdsDocumentEntryId (OPTIONAL, FK) ──→ XdsDocumentEntry (0..1)
                                                                 [nur wenn exported]
```

---

## 🎯 1. AmbulanzbefundFormTemplate - Kardinalität & Optionalität

### 1.1 Basis-Identifikation

| Feld | Type | Required | Optional | Unique | Index | Begründung |
|------|------|----------|----------|--------|-------|------------|
| `name` | String | ✅ **YES** | ❌ | ❌ | ✅ | Pflicht für Identifikation |
| `code` | String | ✅ **YES** | ❌ | ✅ | ✅ | Eindeutiger Code, Pflicht |
| `version` | String | ✅ **YES** | ❌ | ❌ | ❌ | Pflicht, Default "1.0" |
| `description` | String | ❌ | ✅ **YES** | ❌ | ❌ | Optional, nur für Dokumentation |

**Kardinalität:** 
- Template → Template-Versionen: **1:N** (ein Template kann mehrere Versionen haben, aber unterschiedliche Codes)

---

### 1.2 ELGA IL Referenz

| Feld | Type | Required | Optional | Begründung (ELGA IL) |
|------|------|----------|----------|----------------------|
| `elgaIlReference` | Object | ✅ **YES** | ❌ | Ganzes Objekt required |
| `elgaIlReference.generalIlVersion` | String | ✅ **YES** | ❌ | **PFLICHT** gemäß IL - immer erforderlich |
| `elgaIlReference.specificIlVersion` | String | ✅ **YES** | ❌ | **PFLICHT** - Ambulanzbefund IL Version |
| `elgaIlReference.templateId` | String | ❌ | ✅ **YES** | Optional - nur wenn bekannt |
| `elgaIlReference.formatCode` | Object | ❌ | ✅ **YES** | **KONDITIONAL** - Required für CDA-Export |
| `elgaIlReference.classCode` | Object | ❌ | ✅ **YES** | **KONDITIONAL** - Required für CDA-Export |
| `elgaIlReference.typeCode` | Object | ❌ | ✅ **YES** | **KONDITIONAL** - Required für CDA-Export |

**Konditionale Logik:**
- ✅ `formatCode`, `classCode`, `typeCode` sind **OPTIONAL** im Template
- ⚠️ **ABER:** Wenn CDA-Export verwendet wird, müssen sie **PFLICHT** sein
- 📝 **Validierung:** Service-Level Prüfung beim CDA-Export

**Korrektur erforderlich:** ⚠️
- Aktuell: Alle optional
- Sollte: Validation im Service für CDA-Export

---

### 1.3 Spezialisierung

| Feld | Type | Required | Optional | Enum | Begründung |
|------|------|----------|----------|------|------------|
| `specialization` | String | ✅ **YES** | ❌ | 14 Werte | Pflicht - bestimmt Template-Struktur |

**Kardinalität:** 
- Template → Spezialisierung: **N:1** (ein Template gehört zu EINER Spezialisierung)
- Spezialisierung → Templates: **1:N** (eine Spezialisierung kann mehrere Templates haben)

**Konsistenz-Regel:**
- ✅ `specialization` muss mit `formTemplateId.specialization` übereinstimmen (Ambulanzbefund)

---

### 1.4 Formular-Definition

| Feld | Type | Required | Optional | Begründung |
|------|------|----------|----------|------------|
| `formDefinition` | Object | ✅ **YES** | ❌ | Kern des Templates |
| `formDefinition.schema` | Mixed | ✅ **YES** | ❌ | **PFLICHT** - JSON Schema für Validierung |
| `formDefinition.layout` | Mixed | ✅ **YES** | ❌ | **PFLICHT** - UI Definition |
| `formDefinition.cdaMapping` | Mixed | ❌ | ✅ **YES** | Optional - nur für CDA-Export nötig |

**Kardinalität:**
- Template → Schema: **1:1** (ein Template hat ein Schema)
- Template → Layout: **1:1** (ein Template hat ein Layout)
- Template → CDA-Mapping: **1:0..1** (optional, nur wenn CDA-Export)

**Konditionale Logik im Schema:**
- JSON Schema selbst kann konditionale Requirements definieren (`if/then/else`)
- Frontend/Service muss diese auswerten

---

### 1.5 Verfügbare Sektionen

| Feld | Type | Required | Optional | Array | Begründung |
|------|------|----------|----------|-------|------------|
| `availableSections` | Array | ❌ | ✅ **YES** | ✅ | Optional - nur wenn Sections-Management |
| `availableSections[].id` | String | ✅ **YES** | ❌ | - | Pflicht wenn Section vorhanden |
| `availableSections[].label` | String | ✅ **YES** | ❌ | - | Pflicht wenn Section vorhanden |
| `availableSections[].description` | String | ❌ | ✅ **YES** | - | Optional |
| `availableSections[].required` | Boolean | ❌ | ✅ **YES** | - | Default: false |
| `availableSections[].category` | String | ❌ | ✅ **YES** | - | Default: 'optional' |
| `availableSections[].applicableSpecializations` | Array | ❌ | ✅ **YES** | ✅ | Optional |

**Kardinalität:**
- Template → Sections: **1:N** (ein Template kann mehrere Sections haben)
- Sections → Specializations: **N:M** (eine Section kann für mehrere Spezialisierungen gelten)

**Konditionale Logik:**
- ✅ `category: 'basic'` → Section ist **immer aktiv** (required)
- ✅ `category: 'specialized'` → Section ist **aktiv für bestimmte Spezialisierungen**
- ✅ `category: 'optional'` → Section kann **aktiviert/deaktiviert** werden

**Validierung:**
- ⚠️ Wenn `category: 'basic'` → `required: true` sollte automatisch sein
- ⚠️ Wenn `applicableSpecializations` gesetzt → Section nur für diese Spezialisierungen sichtbar

---

### 1.6 Verfügbarkeit & Zuordnung

| Feld | Type | Required | Optional | Default | Begründung |
|------|------|----------|----------|---------|------------|
| `isActive` | Boolean | ❌ | ✅ **YES** | `true` | Optional (Default: true) |
| `isDefault` | Boolean | ❌ | ✅ **YES** | `false` | Optional - markiert Default |
| `locationId` | ObjectId | ❌ | ✅ **YES** | `null` | Optional - null = global |

**Kardinalität:**
- Location → Template: **1:N** (ein Standort kann mehrere Templates haben)
- Template → Location: **N:0..1** (ein Template kann standort-spezifisch oder global sein)

**Konsistenz-Regeln:**
- ⚠️ `isDefault: true` → Es sollte **nur EIN** Default-Template pro `specialization` + `locationId` Kombination geben
- ⚠️ Validierung erforderlich: Service-Level Prüfung

---

### 1.7 Metadaten

| Feld | Type | Required | Optional | Begründung |
|------|------|----------|----------|------------|
| `createdBy` | ObjectId | ✅ **YES** | ❌ | **PFLICHT** - Audit-Trail |
| `updatedBy` | ObjectId | ❌ | ✅ **YES** | Optional - nur wenn aktualisiert |
| `tags` | Array | ❌ | ✅ **YES** | Optional - für Kategorisierung |
| `usageCount` | Number | ❌ | ✅ **YES** | Optional - Statistik (Default: 0) |

**Kardinalität:**
- User → Template (created): **1:N**
- User → Template (updated): **1:N**

---

## 🏥 2. Ambulanzbefund - Kardinalität & Optionalität

### 2.1 Identifikation

| Feld | Type | Required | Optional | Unique | Auto | Begründung |
|------|------|----------|----------|--------|------|------------|
| `documentNumber` | String | ✅ **YES** | ❌ | ✅ | ✅ | **PFLICHT** - Eindeutige ID |
| `version` | Number | ❌ | ✅ **YES** | ❌ | ✅ | Optional (Default: 1) |

**Kardinalität:**
- Ambulanzbefund → DocumentNumber: **1:1** (eindeutig)

**Konsistenz:**
- ✅ Auto-Generierung funktioniert korrekt

---

### 2.2 Zuordnung (Referenzen)

| Feld | Type | Required | Optional | FK | Kardinalität | Begründung |
|------|------|----------|----------|-----|--------------|------------|
| `patientId` | ObjectId | ✅ **YES** | ❌ | ✅ | **N:1** | **PFLICHT** - Patient-Referenz |
| `locationId` | ObjectId | ✅ **YES** | ❌ | ✅ | **N:1** | **PFLICHT** - Standort-Referenz |
| `createdBy` | ObjectId | ✅ **YES** | ❌ | ✅ | **N:1** | **PFLICHT** - Audit-Trail |
| `formTemplateId` | ObjectId | ✅ **YES** | ❌ | ✅ | **N:1** | **PFLICHT** - Template-Referenz |

**Kardinalität:**
- Patient → Ambulanzbefund: **1:N** (ein Patient kann mehrere Befunde haben)
- Location → Ambulanzbefund: **1:N** (ein Standort kann mehrere Befunde haben)
- User → Ambulanzbefund (created): **1:N** (ein User kann mehrere Befunde erstellen)
- Template → Ambulanzbefund: **1:N** (ein Template kann für mehrere Befunde verwendet werden)

**Referenzielle Integrität:**
- ✅ Alle FK-Referenzen sind required und korrekt

---

### 2.3 Spezialisierung & Template

| Feld | Type | Required | Optional | Begründung |
|------|------|----------|----------|------------|
| `specialization` | String | ✅ **YES** | ❌ | **PFLICHT** - bestimmt Formular-Struktur |
| `formTemplateId` | ObjectId | ✅ **YES** | ❌ | **PFLICHT** - Template-Referenz |
| `selectedSections` | Array | ❌ | ✅ **YES** | Optional - nur wenn Sections ausgewählt |

**Konsistenz-Regel:**
- ⚠️ **KRITISCH:** `specialization` muss mit `formTemplateId.specialization` übereinstimmen
- 📝 **Validierung:** Service-Level Prüfung im `AmbulanzbefundService.createAmbulanzbefund()`

**Kardinalität:**
- Sections → Ambulanzbefund: **N:M** (mehrere Sections können für einen Befund aktiviert sein)

**Konditionale Logik:**
- ✅ `selectedSections` leer → Alle Sections aus Template verwenden
- ✅ `selectedSections` gefüllt → Nur ausgewählte Sections verwenden

---

### 2.4 Formular-Daten

| Feld | Type | Required | Optional | Default | Begründung |
|------|------|----------|----------|---------|------------|
| `formData` | Mixed | ✅ **YES** | ❌ | `{}` | **PFLICHT** - auch wenn leer |

**Kardinalität:**
- Ambulanzbefund → formData: **1:1** (ein Befund hat ein formData-Objekt)

**Konditionale Anforderungen:**
- ⚠️ **KRITISCH:** Struktur von `formData` wird durch `formTemplateId.formDefinition.schema` definiert
- ⚠️ **Validierung:** JSON Schema-Validierung gegen Template-Schema
- ⚠️ **Pflichtfelder:** Werden durch `schema.required` definiert
- ⚠️ **Konditionale Felder:** Werden durch `if/then/else` im JSON Schema definiert

**Beispiel Konditionale:**
```json
{
  "if": {
    "properties": {
      "assessment.primaryDiagnosis": { "const": "I10" }
    }
  },
  "then": {
    "required": ["plan.therapy", "plan.medications"]
  }
}
```

---

### 2.5 Strukturierte Daten (Optional, für Querying)

| Feld | Type | Required | Optional | Extrahiert aus | Begründung |
|------|------|----------|----------|----------------|------------|
| `anamnesis` | Object | ❌ | ✅ **YES** | `formData.anamnesis` | Optional - erleichtert Querying |
| `examination` | Object | ❌ | ✅ **YES** | `formData.examination` | Optional - erleichtert Querying |
| `assessment` | Object | ❌ | ✅ **YES** | `formData.assessment` | Optional - erleichtert Querying |
| `plan` | Object | ❌ | ✅ **YES** | `formData.plan` | Optional - erleichtert Querying |

**Kardinalität:**
- Ambulanzbefund → Strukturierte Daten: **1:0..1** (optional, wird aus formData extrahiert)

**Extraktion:**
- ✅ Pre-save Hook extrahiert automatisch aus `formData`
- ✅ Wenn `formData` entsprechende Felder hat → strukturierte Daten werden gesetzt
- ✅ Wenn nicht → strukturierte Daten bleiben undefined

**⚠️ WICHTIG:**
- Strukturierte Daten sind **NUR für Querying/Zugriff**
- **Quelle der Wahrheit ist `formData`**
- Strukturierte Daten können leer/undefined sein, auch wenn `formData` gefüllt ist

---

### 2.6 Status

| Feld | Type | Required | Optional | Default | Enum | Begründung |
|------|------|----------|----------|---------|------|------------|
| `status` | String | ❌ | ✅ **YES** | `'draft'` | 5 Werte | Optional (Default: 'draft') |

**Status-Workflow:**
```
draft (initial)
  ↓ (validieren)
validated (wenn isValid: true)
  ↓ (finalisieren)
finalized (wenn validated)
  ↓ (exportieren)
exported (nach CDA-Export)
  ↓ (optional)
archived
```

**Kardinalität:**
- Ambulanzbefund → Status: **1:1** (ein Befund hat einen Status)

**Konditionale Übergänge:**
- ⚠️ `validated` → Nur wenn `validation.isValid: true`
- ⚠️ `finalized` → Nur wenn `status: 'validated'` UND `validation.isValid: true`
- ⚠️ `exported` → Nur wenn `status: 'finalized'`
- ⚠️ `archived` → Kann aus jedem Status außer `exported` erreicht werden

---

### 2.7 Validierung

| Feld | Type | Required | Optional | Default | Begründung |
|------|------|----------|----------|---------|------------|
| `validation` | Object | ❌ | ✅ **YES** | `{isValid: false}` | Optional - wird bei Validierung gesetzt |
| `validation.isValid` | Boolean | ❌ | ✅ **YES** | `false` | Optional (Default: false) |
| `validation.validatedBy` | ObjectId | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn validiert |
| `validation.validatedAt` | Date | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn validiert |
| `validation.validationErrors` | Array | ❌ | ✅ **YES** | `[]` | Optional |

**Kardinalität:**
- Ambulanzbefund → Validation: **1:1** (ein Befund hat eine Validation)
- Validation → Errors: **1:N** (eine Validation kann mehrere Errors haben)

**Konditionale Logik:**
- ✅ `validatedBy` und `validatedAt` sind **NUR gesetzt** wenn `markAsValidated()` aufgerufen wurde
- ✅ `validationErrors` kann leer sein, auch wenn `isValid: false` (wenn andere Validierungsfehler)

**Konsistenz-Regeln:**
- ⚠️ Wenn `validatedBy` gesetzt → `validatedAt` muss auch gesetzt sein
- ⚠️ Wenn `isValid: true` → `status` sollte `'validated'` oder `'finalized'` sein

---

### 2.8 CDA-Export Information

| Feld | Type | Required | Optional | Default | Begründung |
|------|------|----------|----------|---------|------------|
| `cdaExport` | Object | ❌ | ✅ **YES** | `{exported: false}` | Optional - nur wenn exportiert |
| `cdaExport.exported` | Boolean | ❌ | ✅ **YES** | `false` | Optional (Default: false) |
| `cdaExport.exportedAt` | Date | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |
| `cdaExport.exportedBy` | ObjectId | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |
| `cdaExport.xdsDocumentEntryId` | ObjectId | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |
| `cdaExport.cdaVersion` | String | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |
| `cdaExport.templateId` | String | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |
| `cdaExport.formatCode` | String | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |
| `cdaExport.classCode` | String | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |
| `cdaExport.typeCode` | String | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn exported: true |

**Kardinalität:**
- Ambulanzbefund → XdsDocumentEntry: **1:0..1** (optional, nur wenn exportiert)
- Ambulanzbefund → CDA-Export: **1:1** (ein Befund hat eine CDA-Export-Info)

**Konditionale Logik:**
- ⚠️ **KRITISCH:** Wenn `exported: true` → **ALLE** anderen Felder müssen gesetzt sein
- ⚠️ `exportedAt` → Required wenn `exported: true`
- ⚠️ `exportedBy` → Required wenn `exported: true`
- ⚠️ `xdsDocumentEntryId` → Required wenn `exported: true`
- ⚠️ `cdaVersion`, `templateId`, `formatCode`, `classCode`, `typeCode` → Required wenn `exported: true`

**Konsistenz-Regeln:**
- ✅ Wenn `exported: true` → `status` muss `'exported'` sein
- ⚠️ Validierung erforderlich: Service-Level Prüfung in `markAsExported()`

---

### 2.9 Metadaten

| Feld | Type | Required | Optional | Auto | Begründung |
|------|------|----------|----------|------|------------|
| `createdAt` | Date | ❌ | ✅ **YES** | ✅ | Auto (Default: Date.now) |
| `updatedAt` | Date | ❌ | ✅ **YES** | ✅ | Auto (Default: Date.now) |
| `finalizedAt` | Date | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn finalized |
| `finalizedBy` | ObjectId | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn finalized |
| `archivedAt` | Date | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn archived |
| `archivedBy` | ObjectId | ❌ | ✅ **YES** | - | **KONDITIONAL** - nur wenn archived |
| `archiveReason` | String | ❌ | ✅ **YES** | - | Optional |
| `notes` | String | ❌ | ✅ **YES** | - | Optional |
| `tags` | Array | ❌ | ✅ **YES** | - | Optional |

**Kardinalität:**
- Ambulanzbefund → Timestamps: **1:1** (ein Befund hat Timestamps)
- User → Ambulanzbefund (finalized): **1:N** (optional)
- User → Ambulanzbefund (archived): **1:N** (optional)

**Konditionale Logik:**
- ⚠️ `finalizedAt` und `finalizedBy` → Nur wenn `status: 'finalized'`
- ⚠️ `archivedAt` und `archivedBy` → Nur wenn `status: 'archived'`
- ✅ `archiveReason` → Optional, auch wenn archived

---

## ⚠️ Identifizierte Probleme & Korrekturen

### Problem 1: CDA-Export Felder - Konditionale Validierung fehlt

**Aktueller Zustand:**
```javascript
cdaExport: {
  exported: Boolean,
  exportedAt: Date,  // Optional
  exportedBy: ObjectId,  // Optional
  // ... alle optional
}
```

**Problem:**
- Wenn `exported: true`, müssen alle Felder gesetzt sein
- Aktuell keine Validierung vorhanden

**Lösung:**
- ✅ Validierung in `markAsExported()` Methode hinzufügen
- ✅ Pre-save Hook für Konsistenz-Check

### Problem 2: Template ELGA IL Referenz - Konditionale Requirements

**Aktueller Zustand:**
```javascript
elgaIlReference: {
  formatCode: Object,  // Optional
  classCode: Object,  // Optional
  typeCode: Object    // Optional
}
```

**Problem:**
- Für CDA-Export sind diese Felder PFLICHT
- Aber im Template optional

**Lösung:**
- ✅ Service-Level Validierung beim CDA-Export
- ✅ Warnung wenn Template ohne diese Felder für CDA-Export verwendet wird

### Problem 3: Konsistenz zwischen specialization und formTemplateId

**Problem:**
- Keine automatische Validierung dass `specialization === formTemplateId.specialization`

**Lösung:**
- ✅ Bereits in Service implementiert
- ✅ Pre-save Hook könnte zusätzliche Sicherheit bieten

### Problem 4: Strukturierte Daten - Optionalität nicht klar

**Problem:**
- Strukturierte Daten (`anamnesis`, `examination`, etc.) sind optional
- Aber werden automatisch aus `formData` extrahiert
- Verwirrung: Sind sie required wenn `formData` vorhanden?

**Klarstellung:**
- ✅ Strukturierte Daten sind **IMMER optional**
- ✅ Sie werden nur extrahiert wenn `formData` entsprechende Felder hat
- ✅ Wenn `formData` vorhanden aber keine strukturierten Felder → strukturierte Daten bleiben undefined
- ✅ Das ist **korrekt so**

---

## ✅ Korrekturen am Modell

### Korrektur 1: Pre-save Hook für CDA-Export Validierung

```javascript
// In Ambulanzbefund Schema
AmbulanzbefundSchema.pre('save', function(next) {
  // ... bestehende Logik ...
  
  // Validierung: Wenn exported, müssen alle CDA-Felder gesetzt sein
  if (this.cdaExport?.exported === true) {
    const requiredFields = [
      'exportedAt',
      'exportedBy',
      'xdsDocumentEntryId',
      'cdaVersion',
      'templateId',
      'formatCode',
      'classCode',
      'typeCode'
    ];
    
    const missingFields = requiredFields.filter(field => !this.cdaExport[field]);
    if (missingFields.length > 0) {
      return next(new Error(`CDA-Export unvollständig: Fehlende Felder: ${missingFields.join(', ')}`));
    }
    
    // Status muss 'exported' sein
    if (this.status !== 'exported') {
      this.status = 'exported';
    }
  }
  
  next();
});
```

### Korrektur 2: Validierung in markAsExported()

```javascript
// Bereits korrekt implementiert, aber zusätzliche Validierung
AmbulanzbefundSchema.methods.markAsExported = function(xdsDocumentEntryId, exportedBy, cdaInfo) {
  // Validierung: Alle cdaInfo-Felder müssen vorhanden sein
  const requiredFields = ['cdaVersion', 'templateId', 'formatCode', 'classCode', 'typeCode'];
  const missingFields = requiredFields.filter(field => !cdaInfo[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`CDA-Info unvollständig: Fehlende Felder: ${missingFields.join(', ')}`);
  }
  
  if (!xdsDocumentEntryId || !exportedBy) {
    throw new Error('xdsDocumentEntryId und exportedBy sind erforderlich');
  }
  
  // ... bestehende Logik ...
};
```

---

## 📋 Zusammenfassung: Required vs Optional

### AmbulanzbefundFormTemplate

**✅ Immer Required:**
- `name`, `code`, `version`
- `elgaIlReference.generalIlVersion`, `elgaIlReference.specificIlVersion`
- `specialization`
- `formDefinition.schema`, `formDefinition.layout`
- `createdBy`

**✅ Immer Optional:**
- `description`
- `elgaIlReference.templateId`, `formatCode`, `classCode`, `typeCode`
- `formDefinition.cdaMapping`
- `availableSections` (Array kann leer sein)
- `isActive`, `isDefault`, `locationId`
- `updatedBy`, `tags`, `usageCount`

**⚠️ Konditional Required:**
- `elgaIlReference.formatCode`, `classCode`, `typeCode` → **Required wenn CDA-Export verwendet**

---

### Ambulanzbefund

**✅ Immer Required:**
- `documentNumber` (auto-generiert)
- `patientId`, `locationId`, `createdBy`
- `specialization`, `formTemplateId`
- `formData` (auch wenn `{}`)

**✅ Immer Optional:**
- `version`
- `selectedSections`
- Alle strukturierten Daten (`anamnesis`, `examination`, `assessment`, `plan`)
- `status` (Default: 'draft')
- `validation` (wird bei Bedarf gesetzt)
- `cdaExport` (wird bei Bedarf gesetzt)
- Alle Metadaten (`finalizedAt`, `archivedAt`, etc.)
- `notes`, `tags`

**⚠️ Konditional Required:**
- `validation.validatedBy`, `validatedAt` → **Required wenn validiert**
- `cdaExport.*` → **Required wenn `exported: true`**
- `finalizedAt`, `finalizedBy` → **Required wenn `status: 'finalized'`**
- `archivedAt`, `archivedBy` → **Required wenn `status: 'archived'`**

---

**Ende der QA-Dokumentation**



