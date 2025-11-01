# 🚀 Refactoring-Konzept: Dokumentensystem (Entwicklungsumgebung)

## 🎯 Übersicht

Da das System noch **nicht in Produktion** ist, können wir ein **sauberes Greenfield-Refactoring** durchführen. Keine Rückwärtskompatibilität nötig, keine Dual-Mode-Komplexität - einfach **neu strukturieren**.

---

## ✅ Vorteile (keine Produktion)

### Was wir NICHT brauchen:
- ❌ Keine Rückwärtskompatibilität
- ❌ Keine Dual-Mode-Komplexität
- ❌ Keine Feature-Flags
- ❌ Keine schrittweise Migration bestehender Daten
- ❌ Keine Legacy-API-Endpunkte

### Was wir KÖNNEN:
- ✅ **Saubere neue Architektur** von Anfang an
- ✅ **Direktes Umschreiben** bestehender Schemas
- ✅ **Vollständige Restrukturierung** der Dokumentenverwaltung
- ✅ **Neue Struktur** ohne Altlasten
- ✅ **Einfachere Migration** bestehender Testdaten

---

## 🏗️ 1. Neuer Schema-Ansatz (Clean Slate)

### 1.1 Document Schema komplett neu

```javascript
// backend/models/Document.js - VOLLSTÄNDIG NEU SCHREIBEN

const DocumentSchema = new mongoose.Schema({
  // ========== IDENTIFIKATION ==========
  documentNumber: { 
    type: String, 
    unique: true, 
    required: true,
    index: true
  },
  
  // ========== KLASSIFIZIERUNG ==========
  documentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentType',
    required: true,
    index: true
  },
  documentClass: {
    type: String,
    enum: ['static_medical', 'static_non_medical', 'continuous_medical'],
    required: true
  },
  isMedicalDocument: {
    type: Boolean,
    required: true,
    index: true
  },
  isContinuousDocument: {
    type: Boolean,
    default: false
  },
  continuousDocumentType: {
    type: String,
    enum: ['anamnese', 'medical_status', null],
    default: null
  },
  
  // ========== VERSIONIERUNG ==========
  currentVersion: {
    versionNumber: { 
      type: String, 
      required: true,
      default: '1.0.0'
    },
    versionId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'DocumentVersion' 
    },
    releasedAt: { type: Date },
    releasedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }
  },
  isReleased: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // ========== WORKFLOW ==========
  workflowInstanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowInstance',
    default: null
  },
  workflowStatus: {
    type: String,
    enum: [
      'draft', 
      'being_reviewed', 
      'pending_approval', 
      'approved', 
      'rejected', 
      'changes_requested', 
      'revising', 
      'ready_to_send', 
      'sending', 
      'sent', 
      'archived', 
      'withdrawn'
    ],
    default: 'draft',
    required: true,
    index: true
  },
  
  // ========== PATIENT & ARZT ==========
  patient: {
    id: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    name: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    insuranceNumber: { type: String }
  },
  doctor: {
    id: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: { type: String, required: true },
    title: { type: String },
    specialization: { type: String }
  },
  
  // ========== INHALT (aktuellste Version) ==========
  content: {
    text: { type: String },
    html: { type: String },
    template: { type: String },
    variables: { type: Object }
  },
  
  // ========== MEDIZINISCHE DATEN ==========
  medicalData: {
    medications: [{
      name: { type: String, required: true },
      dosage: { type: String },
      frequency: { type: String },
      duration: { type: String },
      instructions: { type: String }
    }],
    diagnosis: { type: String },
    icd10Code: { 
      type: String,
      index: true
    },
    notes: { type: String }
  },
  
  // ========== ÜBERWEISUNGS-DATEN ==========
  referralData: {
    specialist: { type: String },
    specialization: { type: String },
    reason: { type: String },
    urgency: { 
      type: String, 
      enum: ['normal', 'dringend', 'notfall'] 
    },
    appointment: { type: Date }
  },
  
  // ========== BEFUND-DATEN ==========
  findingData: {
    examinationType: { type: String },
    results: { type: String },
    interpretation: { type: String },
    recommendations: { type: String },
    images: [{ type: String }]
  },
  
  // ========== ANHÄNGE ==========
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // ========== ELGA ==========
  elgaData: {
    isElgaCompatible: { type: Boolean, default: false },
    elgaId: { type: String },
    submissionDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'submitted', 'approved', 'rejected'] 
    }
  },
  
  // ========== PRIORITÄT ==========
  priority: {
    type: String,
    enum: ['niedrig', 'normal', 'hoch', 'dringend'],
    default: 'normal'
  },
  
  // ========== DATENSCHUTZ ==========
  isConfidential: { type: Boolean, default: false },
  retentionPeriod: { type: Number, default: 30 }, // Jahre
  anonymizationDate: { type: Date },
  
  // ========== METADATEN ==========
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  lastModifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  dueDate: { type: Date },
  completedDate: { type: Date },
  
  // ========== VERSIONS-HISTORIE (vereinfacht) ==========
  versionHistory: [{
    versionNumber: String,
    versionId: mongoose.Schema.Types.ObjectId,
    status: String,
    createdAt: Date,
    createdBy: mongoose.Schema.Types.ObjectId
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
DocumentSchema.virtual('fullTitle').get(function() {
  return `${this.documentNumber} - ${this.title || 'Unbenannt'}`;
});

// Indexes für Performance
DocumentSchema.index({ 'patient.id': 1, createdAt: -1 });
DocumentSchema.index({ 'doctor.id': 1, createdAt: -1 });
DocumentSchema.index({ workflowStatus: 1, createdAt: -1 });
DocumentSchema.index({ documentType: 1, workflowStatus: 1 });
DocumentSchema.index({ isReleased: 1, isMedicalDocument: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
```

### 1.2 DocumentType Schema (NEU)

```javascript
// backend/models/DocumentType.js - NEU

const DocumentTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  
  // Klassifizierung
  documentClass: {
    type: String,
    enum: ['static_medical', 'static_non_medical', 'continuous_medical'],
    required: true
  },
  isMedicalDocument: {
    type: Boolean,
    required: true
  },
  isContinuousDocument: {
    type: Boolean,
    default: false
  },
  
  // Kategorisierung
  category: {
    type: String,
    required: true  // 'Kern-Dokumente', 'Verordnungen', etc.
  },
  subcategory: {
    type: String
  },
  
  // Workflow
  defaultWorkflowId: {
    type: String,
    default: 'standard_medical_workflow'
  },
  
  // Validierung
  requiredFields: [{
    field: String,
    message: String
  }],
  validationRules: [String],
  
  // UI-Konfiguration
  icon: String,
  color: String,
  priority: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadaten
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DocumentType', DocumentTypeSchema);
```

---

## 📦 2. Komplette Restrukturierung der Dokumentenverwaltung

### 2.1 Backend-Struktur neu organisieren

```
backend/
├── models/
│   ├── Document.js              # NEU geschrieben
│   ├── DocumentType.js          # NEU
│   ├── DocumentVersion.js       # ERWEITERT
│   ├── DocumentTemplate.js      # BLEIBT (leicht angepasst)
│   ├── WorkflowDefinition.js    # NEU
│   └── WorkflowInstance.js      # NEU
│
├── services/
│   ├── documentService.js        # NEU - Hauptlogik
│   ├── documentVersionService.js # NEU - Versionierung
│   ├── documentWorkflowService.js # NEU - Workflow
│   ├── documentTypeService.js    # NEU - Typ-Management
│   └── documentValidationService.js # NEU - Validierung
│
├── routes/
│   ├── documents.js             # KOMPLETT NEU
│   ├── documentTypes.js         # NEU
│   ├── documentVersions.js      # NEU
│   ├── documentWorkflows.js     # NEU
│   └── documentTemplates.js    # BLEIBT (angepasst)
│
└── data/
    ├── documentTypes.js         # Seed-Daten für Typen
    └── workflowDefinitions.js   # Seed-Daten für Workflows
```

### 2.2 Service-Layer Architektur

```javascript
// backend/services/documentService.js

class DocumentService {
  constructor() {
    this.versionService = new DocumentVersionService();
    this.workflowService = new DocumentWorkflowService();
    this.validationService = new DocumentValidationService();
  }
  
  /**
   * Erstellt neues Dokument
   */
  async createDocument(documentData, userId) {
    // 1. Validierung
    await this.validationService.validateDocumentData(documentData);
    
    // 2. Dokument erstellen
    const document = new Document({
      ...documentData,
      createdBy: userId,
      doctor: await this.getDoctorInfo(userId),
      currentVersion: { versionNumber: '1.0.0' }
    });
    
    // 3. Workflow starten
    const workflow = await this.workflowService.startWorkflow(
      document._id,
      documentData.documentType.defaultWorkflowId
    );
    document.workflowInstanceId = workflow._id;
    
    // 4. Erste Version erstellen
    await this.versionService.createInitialVersion(document);
    
    await document.save();
    return document;
  }
  
  /**
   * Aktualisiert Dokument (mit Versionierung)
   */
  async updateDocument(documentId, updates, userId) {
    const document = await Document.findById(documentId);
    
    // Prüfung: Ist freigegeben?
    if (document.isReleased) {
      // Neue Version erstellen
      return this.versionService.createNewVersion(documentId, updates, userId);
    }
    
    // Normale Aktualisierung
    Object.assign(document, updates);
    document.lastModifiedBy = userId;
    
    // Optional: Version-Snapshot für DRAFT (für Nachvollziehbarkeit)
    if (document.isMedicalDocument) {
      await this.versionService.createOptionalSnapshot(document);
    }
    
    await document.save();
    return document;
  }
  
  /**
   * Dokument freigeben
   */
  async releaseDocument(documentId, userId, comment) {
    const document = await Document.findById(documentId);
    
    // Workflow: Status-Übergang
    await this.workflowService.transition(
      document.workflowInstanceId,
      'approve',
      userId,
      comment
    );
    
    // Version als RELEASED markieren
    await this.versionService.markVersionAsReleased(
      document.currentVersion.versionId,
      userId,
      comment
    );
    
    // Dokument aktualisieren
    document.isReleased = true;
    document.workflowStatus = 'approved';
    document.currentVersion.releasedAt = new Date();
    document.currentVersion.releasedBy = userId;
    
    await document.save();
    return document;
  }
}
```

---

## 🗂️ 3. Dokumenttyp-Management komplett neu

### 3.1 Seed-Daten für Dokumenttypen

```javascript
// backend/data/documentTypes.js

const DOCUMENT_TYPES = [
  // Kern-Dokumente
  {
    code: 'arztbrief',
    name: 'Arztbrief / Befundbrief',
    description: 'Medizinischer Befundbrief',
    documentClass: 'static_medical',
    category: 'Kern-Dokumente',
    defaultWorkflowId: 'standard_medical_workflow',
    icon: 'Description',
    color: '#1976d2',
    requiredFields: [
      { field: 'content.text', message: 'Text ist erforderlich' },
      { field: 'medicalData.diagnosis', message: 'Diagnose ist erforderlich' }
    ]
  },
  {
    code: 'befund',
    name: 'Befundbericht',
    description: 'Labor- oder Radiologiebefund',
    documentClass: 'static_medical',
    category: 'Kern-Dokumente',
    defaultWorkflowId: 'standard_medical_workflow',
    icon: 'Assessment',
    color: '#1976d2'
  },
  
  // Fortlaufende Dokumentationen
  {
    code: 'anamnese',
    name: 'Anamnese',
    description: 'Fortlaufende Anamnese',
    documentClass: 'continuous_medical',
    isContinuousDocument: true,
    continuousDocumentType: 'anamnese',
    category: 'Fortlaufende Dokumentation',
    defaultWorkflowId: 'continuous_document_workflow',
    icon: 'LocalHospital',
    color: '#d32f2f'
  },
  {
    code: 'medical_status',
    name: 'Medizinischer Status',
    description: 'Aktueller medizinischer Status',
    documentClass: 'continuous_medical',
    isContinuousDocument: true,
    continuousDocumentType: 'medical_status',
    category: 'Fortlaufende Dokumentation',
    defaultWorkflowId: 'continuous_document_workflow',
    icon: 'MonitorHeart',
    color: '#d32f2f'
  },
  
  // Nicht-medizinische Dokumente
  {
    code: 'rechnung',
    name: 'Rechnung',
    description: 'Rechnungsstellung',
    documentClass: 'static_non_medical',
    category: 'Verwaltung',
    defaultWorkflowId: 'simple_workflow',
    icon: 'Receipt',
    color: '#388e3c'
  },
  
  // ... alle anderen Typen
];

module.exports = DOCUMENT_TYPES;
```

### 3.2 Setup-Script

```javascript
// backend/scripts/setupDocumentTypes.js

const DocumentType = require('../models/DocumentType');
const DOCUMENT_TYPES = require('../data/documentTypes');

async function setupDocumentTypes() {
  console.log('Erstelle Dokumenttypen...');
  
  for (const typeData of DOCUMENT_TYPES) {
    await DocumentType.findOneAndUpdate(
      { code: typeData.code },
      typeData,
      { upsert: true, new: true }
    );
    console.log(`✓ ${typeData.name}`);
  }
  
  console.log('Dokumenttypen erstellt!');
}

module.exports = setupDocumentTypes;
```

---

## 🔄 4. Migration bestehender Testdaten (Einfach)

### 4.1 Migrations-Script

```javascript
// backend/scripts/migrateExistingDocuments.js

const Document = require('../models/Document'); // ALTES Schema
const DocumentNew = require('../models/DocumentNew'); // NEUES Schema
const DocumentType = require('../models/DocumentType');

async function migrateDocuments() {
  console.log('Starte Migration...');
  
  const oldDocuments = await Document.find({});
  const typeMap = await createTypeMap(); // Typ-Code → DocumentType _id
  
  for (const oldDoc of oldDocuments) {
    try {
      // Dokumenttyp finden
      const documentType = await DocumentType.findOne({ 
        code: oldDoc.type 
      });
      
      if (!documentType) {
        console.warn(`Typ nicht gefunden: ${oldDoc.type}`);
        continue;
      }
      
      // Neues Dokument erstellen
      const newDoc = new DocumentNew({
        // Metadaten
        documentNumber: oldDoc.documentNumber,
        documentType: documentType._id,
        documentClass: documentType.documentClass,
        isMedicalDocument: documentType.isMedicalDocument,
        isContinuousDocument: documentType.isContinuousDocument,
        continuousDocumentType: documentType.continuousDocumentType,
        
        // Status (migriert)
        workflowStatus: mapOldStatus(oldDoc.status),
        
        // Versionierung
        currentVersion: {
          versionNumber: `1.0.${oldDoc.version || 1}`,
        },
        isReleased: oldDoc.status === 'sent' || oldDoc.status === 'ready',
        
        // Inhalt
        content: oldDoc.content,
        medicalData: oldDoc.medicalData,
        referralData: oldDoc.referralData,
        findingData: oldDoc.findingData,
        
        // Patient & Arzt
        patient: {
          id: oldDoc.patient.id,
          name: oldDoc.patient.name,
          dateOfBirth: new Date(oldDoc.patient.dateOfBirth),
          insuranceNumber: oldDoc.patient.insuranceNumber
        },
        doctor: oldDoc.doctor,
        
        // Rest
        attachments: oldDoc.attachments,
        elgaData: oldDoc.elgaData,
        priority: oldDoc.priority,
        isConfidential: oldDoc.isConfidential,
        retentionPeriod: oldDoc.retentionPeriod,
        
        // Metadaten
        createdBy: oldDoc.createdBy,
        lastModifiedBy: oldDoc.lastModifiedBy,
        createdAt: oldDoc.createdAt,
        updatedAt: oldDoc.updatedAt
      });
      
      await newDoc.save();
      
      // Erste Version erstellen
      await createInitialVersion(newDoc);
      
      console.log(`✓ Migriert: ${oldDoc.documentNumber}`);
      
    } catch (error) {
      console.error(`✗ Fehler bei ${oldDoc._id}:`, error.message);
    }
  }
  
  console.log('Migration abgeschlossen!');
}

function mapOldStatus(oldStatus) {
  const map = {
    'draft': 'draft',
    'ready': 'ready_to_send',
    'sent': 'sent',
    'received': 'sent',
    'archived': 'archived'
  };
  return map[oldStatus] || 'draft';
}
```

---

## 🎨 5. Frontend komplett neu strukturieren

### 5.1 Neue Verzeichnisstruktur

```
frontend/src/
├── pages/
│   └── documents/
│       ├── DocumentsPage.tsx           # Haupt-Seite
│       ├── DocumentsList.tsx           # Liste
│       ├── DocumentsByCategory.tsx      # Nach Kategorien
│       ├── DocumentEditor.tsx           # Editor
│       ├── DocumentViewer.tsx           # Anzeige
│       └── components/
│           ├── DocumentTypeSelector.tsx
│           ├── DocumentStatusBadge.tsx
│           ├── DocumentActions.tsx
│           ├── DocumentFilters.tsx
│           ├── DocumentVersionHistory.tsx
│           └── DocumentWorkflowStepper.tsx
│
├── store/
│   └── slices/
│       ├── documentSlice.ts            # NEU geschrieben
│       ├── documentTypeSlice.ts        # NEU
│       ├── documentVersionSlice.ts     # NEU
│       └── documentWorkflowSlice.ts    # NEU
│
└── components/
    └── documents/
        ├── DocumentCard.tsx
        ├── DocumentListItem.tsx
        └── ...
```

### 5.2 DocumentType-Management im Frontend

```typescript
// frontend/src/store/slices/documentTypeSlice.ts

interface DocumentType {
  _id: string;
  code: string;
  name: string;
  documentClass: 'static_medical' | 'static_non_medical' | 'continuous_medical';
  category: string;
  icon: string;
  color: string;
  // ...
}

// Redux-Slice für dynamische Dokumenttypen
const documentTypeSlice = createSlice({
  name: 'documentTypes',
  initialState: {
    types: [] as DocumentType[],
    categories: {} as Record<string, DocumentType[]>,
    loading: false
  },
  reducers: {
    // ...
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentTypes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDocumentTypes.fulfilled, (state, action) => {
        state.types = action.payload;
        // Nach Kategorien gruppieren
        state.categories = groupByCategory(action.payload);
        state.loading = false;
      });
  }
});
```

### 5.3 Dynamischer Dokumenttyp-Selektor

```typescript
// frontend/src/pages/documents/components/DocumentTypeSelector.tsx

const DocumentTypeSelector: React.FC<Props> = ({ onSelect }) => {
  const { types, categories } = useAppSelector(state => state.documentTypes);
  
  return (
    <Box>
      {Object.entries(categories).map(([category, categoryTypes]) => (
        <Accordion key={category}>
          <AccordionSummary>
            <Typography variant="h6">{category}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {categoryTypes.map(type => (
                <Grid item xs={6} sm={4} md={3} key={type._id}>
                  <Card onClick={() => onSelect(type)}>
                    <CardContent>
                      <Icon sx={{ color: type.color }}>
                        {getIcon(type.icon)}
                      </Icon>
                      <Typography>{type.name}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
```

---

## 🚀 6. Implementierungs-Reihenfolge (Vereinfacht)

### Schritt 1: Backend-Schemas neu (1-2 Tage)
- ✅ Document Schema komplett neu
- ✅ DocumentType Schema
- ✅ DocumentVersion Schema erweitern
- ✅ WorkflowDefinition & WorkflowInstance Schemas

### Schritt 2: Services erstellen (3-5 Tage)
- ✅ documentService
- ✅ documentVersionService
- ✅ documentWorkflowService
- ✅ documentTypeService

### Schritt 3: API-Routes neu (2-3 Tage)
- ✅ /api/documents (komplett neu)
- ✅ /api/document-types (neu)
- ✅ /api/document-versions (neu)
- ✅ /api/document-workflows (neu)

### Schritt 4: Seed-Daten & Migration (1 Tag)
- ✅ Dokumenttypen-Seed
- ✅ Workflow-Definitionen-Seed
- ✅ Migrations-Script für bestehende Daten

### Schritt 5: Frontend-Restrukturierung (5-7 Tage)
- ✅ Neue Komponenten-Struktur
- ✅ Redux Slices neu
- ✅ Dokumenttyp-Management UI
- ✅ Versions-Historie UI
- ✅ Workflow-UI

### Schritt 6: Testing & Polish (2-3 Tage)
- ✅ Integration-Tests
- ✅ Bug-Fixes
- ✅ UI-Verbesserungen

**Gesamt: ~2-3 Wochen** (statt 12-15 Wochen mit Legacy-Support!)

---

## ✅ 7. Vorteile dieser Vorgehensweise

### Einfacher:
- ✅ Keine Dual-Mode-Komplexität
- ✅ Keine Legacy-Code-Pfade
- ✅ Saubere Architektur von Anfang an

### Schneller:
- ✅ Direkte Implementierung
- ✅ Keine Migration-Workarounds
- ✅ Klarer Code ohne Altlasten

### Wartbarer:
- ✅ Konsistente Struktur
- ✅ Klare Abhängigkeiten
- ✅ Moderne Patterns

---

## 🎯 8. Wichtigste Änderungen im Überblick

### Backend:
1. **Document Schema** komplett neu → mit Klassifizierung, Versionierung, Workflow
2. **DocumentType Schema** neu → Konfigurierbare Typen
3. **Services** neu strukturiert → Klare Trennung der Verantwortlichkeiten
4. **Routes** neu organisiert → RESTful API-Struktur

### Frontend:
1. **Komponenten-Struktur** neu → Modulare Architektur
2. **State Management** erweitert → Separate Slices für Typen, Versionen, Workflows
3. **UI** komplett neu → Kategorisierung, Versions-Historie, Workflow-Stepper

### Daten:
1. **Dokumenttypen** als Seed-Daten → Einfach erweiterbar
2. **Workflow-Definitionen** als Seed-Daten → Konfigurierbar
3. **Migration** einmalig → Bestehende Testdaten transformieren

---

**Mit diesem Ansatz können wir ein sauberes, modernes System bauen - ohne Altlasten!** 🚀

