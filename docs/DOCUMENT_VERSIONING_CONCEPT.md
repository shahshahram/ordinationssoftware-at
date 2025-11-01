# 📋 Konzept: Verbesserte Dokumentations-Architektur mit Versionierung

## 🎯 Übersicht

Dieses Konzept beschreibt eine vollständige Überarbeitung des Dokumentationssystems mit Fokus auf:
- **Klare Unterscheidung** zwischen medizinischen und nicht-medizinischen Dokumenten
- **Strikte Versionierung** mit Immutability für freigegebene Dokumente
- **Fortlaufende Dokumentation** für Anamnese und medizinischen Status
- **Vollständige Nachvollziehbarkeit** aller Änderungen

---

## 🏗️ 1. Dokument-Klassifizierung

### 1.1 Dokumentkategorien

#### Medizinische Dokumente (`isMedicalDocument: true`)
Diese Dokumente sind **rechtskräftig** und müssen **vollständig versioniert** werden:

**Kern-Dokumente:**
- Arztbrief / Befundbrief
- Überweisungsbrief
- Zuweisung / Einweisung
- Rücküberweisungsbrief
- Befundbericht (Labor, Radiologie)
- Operationsbericht

**Verordnungen & Formulare:**
- e-Rezept
- Heilmittelverordnung
- Krankenstandsbestätigung
- Bildgebende Diagnostik
- Impfbestätigung

**Berichte:**
- Patientenaufklärung
- Therapieplan
- Verlaufsdokumentation (jedoch als fortlaufendes Dokument)
- Konsiliarbericht
- Pflegebrief
- Gutachten / Attest
- Kostenübernahmeantrag

**Fortlaufende Dokumentationen** (spezielle Behandlung):
- **Anamnese** (`documentClass: 'anamnese'`)
- **Medizinischer Status** (`documentClass: 'medical_status'`)

#### Nicht-medizinische Dokumente (`isMedicalDocument: false`)
Diese Dokumente haben **reduzierte Anforderungen**:
- Rechnung
- Verwaltungsschreiben
- Korrespondenz
- Sonstiges

### 1.2 Dokumentklassen

```typescript
enum DocumentClass {
  // Statische Dokumente (einmalig erstellt, versioniert)
  STATIC_MEDICAL = 'static_medical',      // Arztbrief, Befund, etc.
  STATIC_NON_MEDICAL = 'static_non_medical', // Rechnung, etc.
  
  // Fortlaufende Dokumentationen (kontinuierlich erweiterbar)
  CONTINUOUS_MEDICAL = 'continuous_medical', // Anamnese, Med. Status
}
```

---

## 🔒 2. Dokument-Status und Lifecycle

### 2.1 Status für medizinische Dokumente

```typescript
enum MedicalDocumentStatus {
  DRAFT = 'draft',              // Entwurf - kann bearbeitet werden
  UNDER_REVIEW = 'under_review', // In Prüfung - kann nicht bearbeitet werden
  RELEASED = 'released',        // Freigegeben - IMMUTABLE (nur neue Version möglich)
  ARCHIVED = 'archived',        // Archiviert
  WITHDRAWN = 'withdrawn'       // Zurückgezogen (mit Begründung)
}
```

### 2.2 Status für nicht-medizinische Dokumente

```typescript
enum NonMedicalDocumentStatus {
  DRAFT = 'draft',
  FINAL = 'final',             // Final - kann bearbeitet werden (weniger kritisch)
  ARCHIVED = 'archived'
}
```

### 2.3 Status-Übergänge

**Medizinische Dokumente:**
```
DRAFT → UNDER_REVIEW → RELEASED → ARCHIVED
         ↓
      WITHDRAWN
```

**Regeln:**
- Von `DRAFT` → `UNDER_REVIEW`: Erlaubt für Ersteller/Prüfer
- Von `UNDER_REVIEW` → `RELEASED`: Nur mit Freigabeberechtigung
- Von `RELEASED`: **KEINE Bearbeitung mehr möglich**, nur neue Version erstellen
- `WITHDRAWN` erfordert Pflichtbegründung

---

## 📚 3. Versionierungssystem

### 3.1 Versionierungsstrategie

#### Für statische medizinische Dokumente:
- **Hauptdokument** (`Document`) speichert immer die **aktuellste Version**
- **Alle Versionen** werden in `DocumentVersion` Collection gespeichert
- Versionen sind **IMMUTABLE** (unveränderlich) nach Freigabe
- Version-Nummer: `major.minor.patch` (z.B. `1.0.0`, `1.1.0`, `2.0.0`)

#### Für fortlaufende Dokumentationen (Anamnese, Med. Status):
- **Ein einziges Hauptdokument** pro Patient
- **Versionierung erfolgt bei jeder Änderung** (auch bei DRAFT-Status)
- **Jede Version** ist ein "Snapshot" des gesamten Dokuments
- **Zeitreihen** können abgefragt werden
- Änderungen sind **immer nachvollziehbar**

### 3.2 Versions-Erstellung

**Szenario 1: Freigegebenes Dokument ändern**
```
1. Benutzer öffnet RELEASED Dokument v1.0.0
2. System zeigt Warnung: "Dokument ist freigegeben. Neue Version wird erstellt."
3. Bei Speichern: 
   - Alte Version → DocumentVersion Collection
   - Neue Version (v1.1.0) → Hauptdokument
   - Status zurückgesetzt auf DRAFT
```

**Szenario 2: DRAFT-Dokument ändern**
```
1. Benutzer bearbeitet DRAFT Dokument
2. Bei Speichern: Optional Version-Snapshot erstellen
3. Hauptdokument wird aktualisiert
```

---

## 🗄️ 4. Datenbank-Schema

### 4.1 Document Schema (Hauptdokument)

```javascript
const DocumentSchema = {
  // Identifikation
  documentNumber: { type: String, unique: true, required: true },
  documentClass: { 
    type: String, 
    enum: ['static_medical', 'static_non_medical', 'continuous_medical'],
    required: true 
  },
  isMedicalDocument: { type: Boolean, required: true },
  
  // Typ und Kategorie
  type: { type: String, required: true },
  category: { type: String },
  
  // Für fortlaufende Dokumentationen
  isContinuousDocument: { type: Boolean, default: false },
  continuousDocumentType: { 
    type: String, 
    enum: ['anamnese', 'medical_status', null],
    default: null 
  },
  
  // Versionierung
  currentVersion: {
    versionNumber: { type: String, default: '1.0.0' }, // major.minor.patch
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentVersion' },
    releasedAt: { type: Date },
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'under_review', 'released', 'archived', 'withdrawn'],
    default: 'draft' 
  },
  
  // Freigabe-Lock
  isReleased: { type: Boolean, default: false }, // True wenn RELEASED
  releasedVersion: { type: String }, // Version die freigegeben wurde
  
  // Patient
  patient: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    dateOfBirth: { type: String, required: true }
  },
  
  // Arzt
  doctor: {
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  
  // Inhalt (aktuellste Version)
  content: {
    text: { type: String },
    html: { type: String },
    template: { type: String },
    variables: { type: Object }
  },
  
  // Medizinische Daten
  medicalData: { type: Object },
  referralData: { type: Object },
  findingData: { type: Object },
  
  // Metadaten
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Audit
  versionHistory: [{ 
    versionNumber: String,
    versionId: mongoose.Schema.Types.ObjectId,
    status: String,
    createdAt: Date,
    createdBy: mongoose.Schema.Types.ObjectId
  }]
};
```

### 4.2 DocumentVersion Schema (Immutable Versionen)

```javascript
const DocumentVersionSchema = {
  // Referenz zum Hauptdokument
  documentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true,
    index: true
  },
  
  // Versions-Information
  versionNumber: { type: String, required: true }, // "1.0.0", "1.1.0"
  majorVersion: { type: Number, required: true },
  minorVersion: { type: Number, required: true },
  patchVersion: { type: Number, required: true },
  
  // Vollständiger Dokument-Snapshot (IMMUTABLE)
  documentSnapshot: {
    // Alle Felder des Dokumentes zu diesem Zeitpunkt
    content: { type: Object },
    medicalData: { type: Object },
    referralData: { type: Object },
    findingData: { type: Object },
    status: { type: String },
    // ... alle anderen Felder
  },
  
  // Status dieser Version
  versionStatus: { 
    type: String, 
    enum: ['draft', 'under_review', 'released', 'withdrawn'],
    required: true 
  },
  
  // Freigabe-Information
  releasedAt: { type: Date },
  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  releaseComment: { type: String },
  
  // Rückzug-Information
  withdrawnAt: { type: Date },
  withdrawnBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  withdrawalReason: { type: String },
  
  // Änderungs-Information
  changeReason: { type: String }, // Warum wurde diese Version erstellt?
  changesFromPreviousVersion: {
    summary: { type: String },
    fieldsChanged: [{ type: String }],
    diffData: { type: Object } // Strukturierte Diff-Information
  },
  
  // Audit Trail (IMMUTABLE)
  createdAt: { type: Date, default: Date.now, immutable: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', immutable: true },
  
  // Technische Metadaten
  documentHash: { type: String }, // SHA-256 Hash für Integrität
  ipAddress: { type: String },
  userAgent: { type: String }
};

// Compound Index für schnelle Abfragen
DocumentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });
DocumentVersionSchema.index({ documentId: 1, createdAt: -1 });
```

### 4.3 ContinuousDocumentVersion Schema (für Anamnese/Med. Status)

```javascript
const ContinuousDocumentVersionSchema = {
  // Referenz zum Hauptdokument (ein Dokument pro Patient)
  documentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true,
    index: true
  },
  
  // Version (fortlaufend, auch bei DRAFT-Änderungen)
  versionNumber: { type: Number, required: true }, // 1, 2, 3, ...
  
  // Zuordnung zu einem Besuch/Termin (optional)
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  visitDate: { type: Date, required: true },
  
  // Vollständiger Snapshot
  contentSnapshot: { type: Object, required: true },
  
  // Änderungen gegenüber vorheriger Version
  changes: {
    added: [{ field: String, value: Object }],
    modified: [{ field: String, oldValue: Object, newValue: Object }],
    removed: [{ field: String, oldValue: Object }]
  },
  
  // Wer hat was geändert
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changeReason: { type: String },
  changeComment: { type: String },
  
  // Zeitstempel
  createdAt: { type: Date, default: Date.now, immutable: true }
};

ContinuousDocumentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });
ContinuousDocumentVersionSchema.index({ documentId: 1, visitDate: -1 });
```

---

## 🔄 5. Workflow-Logik

### 5.1 Dokument erstellen

```javascript
// Pseudocode
function createDocument(documentData) {
  // Neues Hauptdokument erstellen
  const document = new Document({
    ...documentData,
    documentClass: determineDocumentClass(documentData.type),
    isMedicalDocument: isMedicalType(documentData.type),
    currentVersion: {
      versionNumber: '1.0.0',
      versionId: null,
      releasedAt: null
    },
    status: 'draft'
  });
  
  // Erste Version-Snapshot erstellen
  const version = createVersionSnapshot(document, '1.0.0', 'created');
  
  document.currentVersion.versionId = version._id;
  await document.save();
  
  return document;
}
```

### 5.2 Dokument bearbeiten

```javascript
function updateDocument(documentId, updates, userId) {
  const document = await Document.findById(documentId);
  
  // Prüfung: Ist Dokument freigegeben?
  if (document.isReleased && document.status === 'released') {
    // NEUE VERSION erstellen statt zu bearbeiten
    return createNewVersion(documentId, updates, userId);
  }
  
  // Für DRAFT-Dokumente: Optional Version-Snapshot
  if (document.documentClass === 'static_medical') {
    // Optionale Version für DRAFT (für Nachvollziehbarkeit)
    await createOptionalVersionSnapshot(document, userId);
  }
  
  // Dokument aktualisieren
  document.content = { ...document.content, ...updates.content };
  document.lastModifiedBy = userId;
  document.updatedAt = new Date();
  
  await document.save();
  return document;
}
```

### 5.3 Neue Version erstellen (von RELEASED Dokument)

```javascript
function createNewVersion(documentId, updates, userId) {
  const oldDocument = await Document.findById(documentId);
  
  // Alte Version als Snapshot speichern
  const oldVersion = await DocumentVersion.create({
    documentId: documentId,
    versionNumber: oldDocument.currentVersion.versionNumber,
    majorVersion: extractMajor(oldDocument.currentVersion.versionNumber),
    minorVersion: extractMinor(oldDocument.currentVersion.versionNumber),
    patchVersion: extractPatch(oldDocument.currentVersion.versionNumber),
    documentSnapshot: oldDocument.toObject(), // Vollständiger Snapshot
    versionStatus: 'released', // Status der alten Version
    releasedAt: oldDocument.currentVersion.releasedAt,
    releasedBy: oldDocument.currentVersion.releasedBy,
    createdAt: oldDocument.createdAt,
    createdBy: oldDocument.createdBy,
    documentHash: calculateHash(oldDocument)
  });
  
  // Neue Version-Nummer bestimmen (minor increment)
  const newVersionNumber = incrementMinorVersion(
    oldDocument.currentVersion.versionNumber
  );
  
  // Hauptdokument aktualisieren
  oldDocument.content = { ...oldDocument.content, ...updates.content };
  oldDocument.currentVersion = {
    versionNumber: newVersionNumber,
    versionId: null, // Wird nach Version-Erstellung gesetzt
    releasedAt: null,
    releasedBy: null
  };
  oldDocument.status = 'draft'; // Zurück zu DRAFT
  oldDocument.isReleased = false;
  oldDocument.lastModifiedBy = userId;
  
  // Neue Version-Snapshot erstellen
  const newVersion = await DocumentVersion.create({
    documentId: documentId,
    versionNumber: newVersionNumber,
    documentSnapshot: oldDocument.toObject(),
    versionStatus: 'draft',
    changeReason: updates.changeReason || 'Neue Version nach Freigabe',
    changesFromPreviousVersion: calculateChanges(oldVersion, updates),
    createdBy: userId
  });
  
  oldDocument.currentVersion.versionId = newVersion._id;
  await oldDocument.save();
  
  return oldDocument;
}
```

### 5.4 Dokument freigeben

```javascript
function releaseDocument(documentId, userId, comment) {
  const document = await Document.findById(documentId);
  
  if (document.status !== 'under_review') {
    throw new Error('Dokument muss in Prüfung sein');
  }
  
  // Aktuelle Version als RELEASED markieren
  const currentVersion = await DocumentVersion.findById(
    document.currentVersion.versionId
  );
  
  currentVersion.versionStatus = 'released';
  currentVersion.releasedAt = new Date();
  currentVersion.releasedBy = userId;
  currentVersion.releaseComment = comment;
  await currentVersion.save();
  
  // Hauptdokument aktualisieren
  document.status = 'released';
  document.isReleased = true;
  document.releasedVersion = document.currentVersion.versionNumber;
  document.currentVersion.releasedAt = new Date();
  document.currentVersion.releasedBy = userId;
  await document.save();
  
  // Audit Trail
  document.versionHistory.push({
    versionNumber: document.currentVersion.versionNumber,
    versionId: currentVersion._id,
    status: 'released',
    createdAt: new Date(),
    createdBy: userId
  });
  await document.save();
  
  return document;
}
```

### 5.5 Fortlaufende Dokumentation (Anamnese/Med. Status)

```javascript
function updateContinuousDocument(documentId, updates, userId, appointmentId) {
  const document = await Document.findById(documentId);
  
  if (!document.isContinuousDocument) {
    throw new Error('Kein fortlaufendes Dokument');
  }
  
  // Aktuellen Zustand als Snapshot speichern
  const currentVersion = await ContinuousDocumentVersion.findOne({
    documentId: documentId
  }).sort({ versionNumber: -1 });
  
  const newVersionNumber = currentVersion 
    ? currentVersion.versionNumber + 1 
    : 1;
  
  // Änderungen berechnen
  const changes = calculateChanges(
    currentVersion?.contentSnapshot || {},
    { ...document.content, ...updates }
  );
  
  // Neue Version erstellen
  await ContinuousDocumentVersion.create({
    documentId: documentId,
    versionNumber: newVersionNumber,
    appointmentId: appointmentId,
    visitDate: new Date(),
    contentSnapshot: { ...document.content, ...updates },
    changes: changes,
    changedBy: userId,
    changeReason: updates.changeReason,
    changeComment: updates.comment
  });
  
  // Hauptdokument aktualisieren
  document.content = { ...document.content, ...updates };
  document.lastModifiedBy = userId;
  document.updatedAt = new Date();
  await document.save();
  
  return document;
}
```

---

## 📊 6. API-Endpunkte

### 6.1 Dokument-Operationen

```
GET    /api/documents                           # Liste aller Dokumente
GET    /api/documents/:id                       # Einzelnes Dokument (aktuelle Version)
GET    /api/documents/:id/versions              # Alle Versionen eines Dokuments
GET    /api/documents/:id/versions/:version     # Spezifische Version abrufen
GET    /api/documents/:id/comparison/:v1/:v2     # Versionen vergleichen

POST   /api/documents                            # Neues Dokument erstellen
PUT    /api/documents/:id                        # Dokument bearbeiten (mit Prüfung)
POST   /api/documents/:id/new-version            # Neue Version erstellen (von RELEASED)

POST   /api/documents/:id/submit-review          # Zur Prüfung einreichen
POST   /api/documents/:id/release               # Dokument freigeben
POST   /api/documents/:id/withdraw               # Dokument zurückziehen

GET    /api/documents/:id/audit-trail            # Vollständiger Audit-Trail
GET    /api/documents/:id/history               # Versionshistorie
```

### 6.2 Fortlaufende Dokumentationen

```
GET    /api/patients/:patientId/anamnesis              # Aktuelle Anamnese
GET    /api/patients/:patientId/anamnesis/history      # Anamnese-Verlauf
GET    /api/patients/:patientId/anamnesis/:version     # Spezifische Version

PUT    /api/patients/:patientId/anamnesis             # Anamnese aktualisieren

GET    /api/patients/:patientId/medical-status         # Aktueller med. Status
GET    /api/patients/:patientId/medical-status/history  # Status-Verlauf
PUT    /api/patients/:patientId/medical-status         # Status aktualisieren
```

---

## 🎨 7. Frontend-Implementierung

### 7.1 Dokument-Editor

**Features:**
- **Status-Anzeige** prominent sichtbar
- **Versions-Badge** (z.B. "v1.0.0 - RELEASED")
- **Warnung** wenn RELEASED-Dokument bearbeitet wird
- **Versions-Verlauf** Sidebar
- **Vergleichs-Ansicht** zwischen Versionen

### 7.2 Versions-Historie

**UI-Komponenten:**
- Timeline-Ansicht aller Versionen
- Diff-Ansicht zwischen Versionen
- Filtern nach Status, Datum, Benutzer
- Export einzelner Versionen

### 7.3 Fortlaufende Dokumentation

**Spezial-UI für Anamnese/Med. Status:**
- **Zeitleisten-Ansicht** mit allen Änderungen
- **Side-by-Side Vergleich** verschiedener Zeitpunkte
- **Änderungen hervorheben** (was wurde geändert?)
- **Besuchs-Zuordnung** (Änderung bei welchem Termin?)

---

## 🔐 8. Berechtigungen

### 8.1 Rollen-basierte Aktionen

```
Arzt:
  - Kann alle Dokumente erstellen/bearbeiten
  - Kann medizinische Dokumente freigeben
  - Kann Versionen vergleichen

Assistenz:
  - Kann DRAFT-Dokumente bearbeiten
  - Kann Dokumente zur Prüfung einreichen
  - Kann nicht-medizinische Dokumente freigeben
  - Kann RELEASED-Dokumente nicht bearbeiten

Rezeption:
  - Kann nur nicht-medizinische Dokumente erstellen/bearbeiten
  - Kann keine medizinischen Dokumente freigeben
```

### 8.2 Dokument-Level Berechtigungen

- **Freigabe-Berechtigung** pro Dokumenttyp
- **Freigabe-Workflow** (Wer kann freigeben?)
- **Änderungs-Sperre** für RELEASED Dokumente (automatisch)

---

## 📈 9. Migration bestehender Daten

### 9.1 Migrationsstrategie

1. **Bestandsaufnahme** aller bestehenden Dokumente
2. **Klassifizierung** (medizinisch vs. nicht-medizinisch)
3. **Erste Version** für jedes Dokument erstellen
4. **Status setzen** (bestehende Dokumente als "released" wenn bereits versendet)
5. **Fortlaufende Dokumentationen** identifizieren und migrieren

---

## ✅ 10. Vorteile des Konzepts

### 10.1 Compliance
- **Rechtssicherheit**: Freigegebene Dokumente sind unveränderlich
- **Nachvollziehbarkeit**: Vollständiger Audit-Trail
- **DSGVO-Konformität**: Änderungen werden protokolliert

### 10.2 Benutzerfreundlichkeit
- **Klare Unterscheidung** zwischen Dokumenttypen
- **Intuitive Versionsverwaltung**
- **Zeitleisten-Ansicht** für fortlaufende Dokumentation

### 10.3 Technische Vorteile
- **Immutability** durch Versionierung
- **Performance**: Hauptdokument immer aktuell, Versionen on-demand
- **Skalierbarkeit**: Versionen in separater Collection

---

## 🚀 11. Implementierungs-Roadmap

### Phase 1: Grundlagen
- [ ] Datenbank-Schema erweitern
- [ ] Dokument-Klassifizierung implementieren
- [ ] Basis-Versionierung

### Phase 2: Medizinische Dokumente
- [ ] Status-Management
- [ ] Freigabe-Workflow
- [ ] Immutability für RELEASED

### Phase 3: Fortlaufende Dokumentation
- [ ] Anamnese-Versionierung
- [ ] Med. Status-Versionierung
- [ ] Zeitleisten-Ansicht

### Phase 4: Frontend
- [ ] Dokument-Editor mit Versions-Warnung
- [ ] Versions-Historie UI
- [ ] Vergleichs-Ansicht

### Phase 5: Migration
- [ ] Migrations-Skripte
- [ ] Daten-Validierung
- [ ] Rollback-Mechanismus

---

## 📝 12. Offene Fragen

1. **Version-Nummerierung**: `major.minor.patch` oder nur `major.minor`?
2. **Automatische Versionen**: Bei jedem Speichern oder nur bei Status-Änderung?
3. **Löschung**: Sollen RELEASED Versionen löschbar sein?
4. **Export**: Welche Formate? PDF mit Versions-Info?
5. **Performance**: Wie viele Versionen vorhalten? Archivierung?

---

**Dieses Konzept ist als Diskussionsgrundlage gedacht und sollte vor der Implementierung finalisiert werden.**

