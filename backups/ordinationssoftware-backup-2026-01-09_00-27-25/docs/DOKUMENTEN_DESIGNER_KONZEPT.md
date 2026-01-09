# 📄 Umfassendes Konzept: Einheitliches Dokumenten-Design & Dokumenten-Designer

## 🎯 Übersicht

Dieses Konzept beschreibt ein **einheitliches Dokumentensystem** mit:
- **Einheitliches Layout** für alle Dokumente (Header, Body, Footer)
- **Standort-basierte Dokumenten-Informationen** (Ordination-Daten)
- **Dokumenten-Designer** für Layout-Erstellung
- **Automatischer Daten-Import** aus bestehenden Systemen
- **Integration** mit Versionierung, Workflow und bestehendem System

---

## 🏗️ 1. Einheitliches Dokumenten-Layout

### 1.1 Dokumenten-Struktur

**Alle Dokumente haben die gleiche Hülle:**

```
┌─────────────────────────────────────────┐
│           HEADER (Pflicht)             │
│  - Ordination-Logo                      │
│  - Ordination-Name & Adresse             │
│  - Arzt-Informationen                   │
│  - Dokument-Titel                       │
│  - Erstellungsdatum                     │
├─────────────────────────────────────────┤
│           ADRESSAT (Pflicht)            │
│  - Patient / Empfänger-Daten             │
│  - Adresse                              │
├─────────────────────────────────────────┤
│                                         │
│           DOKUMENT-INHALT               │
│           (Variabel, Designer)          │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│           FOOTER (Pflicht)              │
│  - Ordination-Daten                     │
│  - Kontaktinformationen                 │
│  - Seitenzahl                           │
│  - Rechtliche Hinweise (optional)       │
└─────────────────────────────────────────┘
```

### 1.2 Header-Informationen (von Standort)

```javascript
// Header-Felder (alle Pflicht im Standort)
const HeaderFields = {
  // Logo
  logo: {
    type: 'image',
    source: 'location.logo',  // URL oder Base64
    position: 'left',
    size: { width: '80mm', height: '20mm' }
  },
  
  // Ordination
  ordinationName: {
    type: 'text',
    source: 'location.name',
    style: { fontWeight: 'bold', fontSize: '14pt' }
  },
  ordinationAddress: {
    type: 'text',
    source: 'location.fullAddress',  // Kombiniert: Straße, PLZ, Ort
    style: { fontSize: '10pt' }
  },
  ordinationPhone: {
    type: 'text',
    source: 'location.phone',
    prefix: 'Tel: ',
    style: { fontSize: '9pt' }
  },
  ordinationEmail: {
    type: 'text',
    source: 'location.email',
    prefix: 'E-Mail: ',
    style: { fontSize: '9pt' }
  },
  ordinationWebsite: {
    type: 'text',
    source: 'location.website',
    prefix: 'Web: ',
    style: { fontSize: '9pt' }
  },
  
  // Arzt (vom aktuellen Benutzer)
  doctorName: {
    type: 'text',
    source: 'user.fullName',
    prefix: 'Dr. ',
    style: { fontWeight: 'bold', fontSize: '12pt' }
  },
  doctorTitle: {
    type: 'text',
    source: 'user.profile.title',  // z.B. "Facharzt für..."
    style: { fontSize: '10pt', fontStyle: 'italic' }
  },
  doctorSpecialization: {
    type: 'text',
    source: 'user.profile.specialization',
    style: { fontSize: '10pt' }
  },
  
  // Dokument-Metadaten
  documentTitle: {
    type: 'text',
    source: 'document.title',
    style: { fontWeight: 'bold', fontSize: '16pt', textAlign: 'center' }
  },
  documentDate: {
    type: 'date',
    source: 'document.createdAt',
    format: 'DD.MM.YYYY',
    prefix: 'Datum: ',
    style: { fontSize: '10pt' }
  },
  documentNumber: {
    type: 'text',
    source: 'document.documentNumber',
    prefix: 'Dokument-Nr: ',
    style: { fontSize: '9pt' }
  }
};
```

### 1.3 Footer-Informationen

```javascript
const FooterFields = {
  ordinationFooter: {
    type: 'text',
    source: 'location.footerText',  // Konfigurierbar im Standort
    style: { fontSize: '8pt', color: '#666' }
  },
  contactInfo: {
    type: 'text',
    source: 'location.contactInfo',  // Kombiniert: Tel, Email, Web
    style: { fontSize: '8pt' }
  },
  legalNotice: {
    type: 'text',
    source: 'location.legalNotice',  // Optional: Datenschutz, etc.
    style: { fontSize: '7pt', color: '#999' }
  },
  pageNumber: {
    type: 'system',
    source: 'system.pageNumber',
    format: 'Seite {current} von {total}',
    style: { fontSize: '8pt', textAlign: 'right' }
  }
};
```

### 1.4 Standort-Schema erweitern

```javascript
// backend/models/Location.js - ERWEITERN

const LocationSchema = new mongoose.Schema({
  // ... existierende Felder ...
  
  // ========== DOKUMENTEN-KONFIGURATION (NEU) ==========
  documentConfig: {
    // Header-Konfiguration
    header: {
      logo: {
        url: String,  // URL zum Logo
        width: { type: Number, default: 80 },  // mm
        height: { type: Number, default: 20 },  // mm
        position: { 
          type: String, 
          enum: ['left', 'center', 'right'],
          default: 'left'
        }
      },
      showOrdinationName: { type: Boolean, default: true },
      showOrdinationAddress: { type: Boolean, default: true },
      showOrdinationPhone: { type: Boolean, default: true },
      showOrdinationEmail: { type: Boolean, default: true },
      showOrdinationWebsite: { type: Boolean, default: false },
      showDoctorName: { type: Boolean, default: true },
      showDoctorTitle: { type: Boolean, default: true },
      showDoctorSpecialization: { type: Boolean, default: true },
      showDocumentTitle: { type: Boolean, default: true },
      showDocumentDate: { type: Boolean, default: true },
      showDocumentNumber: { type: Boolean, default: true }
    },
    
    // Footer-Konfiguration
    footer: {
      footerText: String,  // z.B. "Diese Praxis ist Mitglied der Ärztekammer..."
      showContactInfo: { type: Boolean, default: true },
      showLegalNotice: { type: Boolean, default: false },
      legalNoticeText: String,
      showPageNumber: { type: Boolean, default: true }
    },
    
    // Layout-Einstellungen
    layout: {
      pageSize: { 
        type: String, 
        enum: ['A4', 'A5', 'Letter'],
        default: 'A4'
      },
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait'
      },
      margins: {
        top: { type: Number, default: 20 },      // mm
        right: { type: Number, default: 20 },
        bottom: { type: Number, default: 20 },
        left: { type: Number, default: 20 },
        header: { type: Number, default: 15 },   // Header-Abstand
        footer: { type: Number, default: 15 }    // Footer-Abstand
      },
      fontFamily: {
        type: String,
        default: 'Arial, sans-serif'
      },
      primaryColor: {
        type: String,
        default: '#000000'
      },
      secondaryColor: {
        type: String,
        default: '#666666'
      }
    }
  },
  
  // ========== ERWEITERTE ORDINATION-DATEN (PFlichtfelder) ==========
  // Pflichtfelder für Dokumentenerstellung
  legalEntity: {
    name: { type: String, required: true },  // Rechtsträger
    legalForm: String,  // z.B. "Ordination", "Praxisgemeinschaft"
    taxId: String,      // UID-Nummer
    chamberNumber: String,  // Ärztekammer-Nummer
    licenseNumber: String   // Ordinations-Lizenz
  },
  
  // Bank-Daten (für Rechnungen)
  banking: {
    bankName: String,
    iban: String,
    bic: String,
    accountHolder: String
  },
  
  // Zusätzliche Kontakt-Informationen
  website: { type: String, trim: true },
  fax: { type: String, trim: true },
  
  // Ordination-spezifische Daten
  specialties: [String],  // Fachrichtungen
  languages: [String],   // Sprechsprachen
  paymentMethods: [String],  // Zahlungsmethoden
  
  // Öffnungszeiten (für Dokumente)
  openingHours: {
    monday: { from: String, to: String },
    tuesday: { from: String, to: String },
    wednesday: { from: String, to: String },
    thursday: { from: String, to: String },
    friday: { from: String, to: String },
    saturday: { from: String, to: String },
    sunday: { from: String, to: String }
  }
});
```

---

## 🎨 2. Dokumenten-Designer Konzept

### 2.1 Designer-Architektur

**Zweistufiges System:**

1. **Basis-Layout** (Header/Footer) - Einheitlich, vom Standort
2. **Dokument-Inhalt** - Variabel, vom Designer

### 2.2 DocumentDesign Schema

```javascript
// backend/models/DocumentDesign.js - NEU

const DocumentDesignSchema = new mongoose.Schema({
  // Identifikation
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  
  // Zuordnung
  documentTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentType',
    required: true,
    index: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null  // null = global verfügbar
  },
  
  // Layout-Definition (JSON-basiert)
  layout: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Layout-Struktur:
  layout: {
    sections: [
      {
        id: String,  // Eindeutige ID
        type: 'section',  // 'section', 'field', 'group'
        label: String,    // Sichtbarer Name
        position: {
          row: Number,
          column: Number,
          order: Number
        },
        style: {
          backgroundColor: String,
          border: String,
          padding: String,
          margin: String
        },
        children: [/* rekursiv weitere Elemente */]
      }
    ],
    
    fields: [
      {
        id: String,
        type: 'field',  // 'text', 'date', 'number', 'boolean', 'select', 'textarea', 'richText'
        label: String,
        dataSource: String,  // 'patient.firstName', 'diagnosis.code', etc.
        required: Boolean,
        visible: Boolean,
        position: {
          row: Number,
          column: Number,
          width: Number,  // Grid-Spalten (1-12)
          order: Number
        },
        style: {
          fontSize: String,
          fontWeight: String,
          color: String,
          textAlign: String
        },
        validation: {
          minLength: Number,
          maxLength: Number,
          pattern: String,
          customValidation: String  // JavaScript-Funktion (sicher ausgeführt)
        },
        formatting: {
          prefix: String,  // z.B. "Dr. "
          suffix: String,  // z.B. " kg"
          dateFormat: String,  // "DD.MM.YYYY"
          numberFormat: String,  // "0.00"
          transform: String  // Funktion für Transformation
        }
      }
    ],
    
    // Automatische Daten-Bereiche
    autoSections: [
      {
        id: String,
        type: 'autoSection',  // 'diagnosis_list', 'medications_list', 'lab_results', etc.
        dataSource: 'diagnoses',  // Welche Datenquelle?
        filter: Object,  // MongoDB-Filter
        sort: Object,    // Sortierung
        limit: Number,   // Max. Anzahl
        template: String // Template für jedes Element
      }
    ]
  },
  
  // Versionierung
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadaten
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});
```

### 2.3 Datenquellen für automatischen Import

```javascript
// backend/data/documentDataSources.js

const DATA_SOURCES = {
  // Patienten-Daten
  patient: {
    'patient.firstName': { type: 'string', source: 'patient.firstName' },
    'patient.lastName': { type: 'string', source: 'patient.lastName' },
    'patient.fullName': { type: 'string', source: 'patient.fullName', computed: true },
    'patient.dateOfBirth': { type: 'date', source: 'patient.dateOfBirth' },
    'patient.age': { type: 'number', source: 'patient.age', computed: true },
    'patient.gender': { type: 'string', source: 'patient.gender' },
    'patient.address.street': { type: 'string', source: 'patient.address.street' },
    'patient.address.city': { type: 'string', source: 'patient.address.city' },
    'patient.address.postalCode': { type: 'string', source: 'patient.address.postalCode' },
    'patient.phone': { type: 'string', source: 'patient.phone' },
    'patient.email': { type: 'string', source: 'patient.email' },
    'patient.insuranceNumber': { type: 'string', source: 'patient.insuranceNumber' },
    'patient.insuranceProvider': { type: 'string', source: 'patient.insuranceProvider' },
    'patient.socialSecurityNumber': { type: 'string', source: 'patient.socialSecurityNumber' }
  },
  
  // Diagnosen
  diagnoses: {
    'diagnosis.active': {
      type: 'array',
      source: 'patientDiagnoses',
      filter: { status: 'active' },
      fields: ['code', 'display', 'status', 'onsetDate', 'severity', 'notes']
    },
    'diagnosis.primary': {
      type: 'object',
      source: 'patientDiagnoses',
      filter: { isPrimary: true, status: 'active' },
      fields: ['code', 'display']
    },
    'diagnosis.all': {
      type: 'array',
      source: 'patientDiagnoses',
      fields: ['code', 'display', 'status', 'onsetDate', 'resolvedDate', 'notes']
    },
    'diagnosis.icd10Code': {
      type: 'string',
      source: 'document.medicalData.icd10Code'
    }
  },
  
  // Leistungen / Services
  services: {
    'services.currentVisit': {
      type: 'array',
      source: 'appointment.services',
      fields: ['code', 'name', 'description', 'price', 'quantity']
    },
    'services.all': {
      type: 'array',
      source: 'performance',
      filter: { patientId: 'current', status: 'completed' },
      fields: ['code', 'name', 'date', 'price', 'quantity']
    }
  },
  
  // Anamnese
  anamnesis: {
    'anamnesis.current': {
      type: 'object',
      source: 'patientAnamnesis',
      fields: ['chiefComplaint', 'historyOfPresentIllness', 'pastMedicalHistory', 'familyHistory', 'socialHistory', 'reviewOfSystems']
    },
    'anamnesis.history': {
      type: 'array',
      source: 'patientAnamnesisHistory',
      sort: { createdAt: -1 },
      limit: 10,
      fields: ['content', 'createdAt', 'createdBy']
    }
  },
  
  // Medizinischer Status
  medicalStatus: {
    'status.current': {
      type: 'object',
      source: 'patientMedicalStatus',
      fields: ['vitalSigns', 'examination', 'assessment', 'plan']
    },
    'status.vitalSigns': {
      type: 'object',
      source: 'patientMedicalStatus.vitalSigns',
      fields: ['bloodPressure', 'heartRate', 'temperature', 'weight', 'height', 'bmi']
    }
  },
  
  // Medikamente
  medications: {
    'medications.current': {
      type: 'array',
      source: 'patient.currentMedications',
      fields: ['name', 'dosage', 'frequency', 'duration', 'instructions']
    },
    'medications.all': {
      type: 'array',
      source: 'patientMedications',
      filter: { patientId: 'current' },
      fields: ['name', 'dosage', 'frequency', 'startDate', 'endDate', 'prescribedBy']
    }
  },
  
  // Laborwerte
  labResults: {
    'lab.recent': {
      type: 'array',
      source: 'labResults',
      filter: { patientId: 'current' },
      sort: { date: -1 },
      limit: 5,
      fields: ['testName', 'result', 'unit', 'referenceRange', 'date', 'status']
    },
    'lab.all': {
      type: 'array',
      source: 'labResults',
      filter: { patientId: 'current' },
      sort: { date: -1 },
      fields: ['testName', 'result', 'unit', 'referenceRange', 'date']
    }
  },
  
  // Termine
  appointments: {
    'appointment.current': {
      type: 'object',
      source: 'appointment',
      fields: ['date', 'time', 'duration', 'location', 'reason', 'notes']
    },
    'appointment.next': {
      type: 'object',
      source: 'appointments',
      filter: { patientId: 'current', date: { $gte: 'today' } },
      sort: { date: 1 },
      limit: 1,
      fields: ['date', 'time', 'location', 'reason']
    }
  },
  
  // Arzt-Daten
  doctor: {
    'doctor.fullName': { type: 'string', source: 'user.fullName' },
    'doctor.title': { type: 'string', source: 'user.profile.title' },
    'doctor.specialization': { type: 'string', source: 'user.profile.specialization' },
    'doctor.phone': { type: 'string', source: 'user.profile.phone' },
    'doctor.email': { type: 'string', source: 'user.email' }
  },
  
  // Ordination-Daten
  location: {
    'location.name': { type: 'string', source: 'location.name' },
    'location.address': { type: 'string', source: 'location.fullAddress' },
    'location.phone': { type: 'string', source: 'location.phone' },
    'location.email': { type: 'string', source: 'location.email' },
    'location.website': { type: 'string', source: 'location.website' }
  },
  
  // System-Daten
  system: {
    'system.currentDate': { type: 'date', source: 'now' },
    'system.currentTime': { type: 'time', source: 'now' },
    'system.documentNumber': { type: 'string', source: 'document.documentNumber' },
    'system.pageNumber': { type: 'number', source: 'page.current' },
    'system.totalPages': { type: 'number', source: 'page.total' }
  }
};
```

---

## 🎨 3. Designer UI-Konzept

### 3.1 Designer-Komponenten

```
frontend/src/pages/document-designer/
├── DocumentDesignerPage.tsx          # Haupt-Seite
├── components/
│   ├── DesignerCanvas.tsx            # Drag & Drop Canvas
│   ├── FieldPalette.tsx              # Verfügbare Felder
│   ├── FieldEditor.tsx               # Feld-Editor (Properties)
│   ├── LayoutGrid.tsx                # Grid-System
│   ├── PreviewPanel.tsx              # Live-Vorschau
│   ├── DataSourceSelector.tsx        # Datenquellen-Auswahl
│   └── AutoSectionConfig.tsx        # Auto-Bereiche konfigurieren
```

### 3.2 Designer-Funktionalität

**Features:**
1. **Drag & Drop** - Felder auf Canvas ziehen
2. **Grid-System** - 12-Spalten-Grid für Layout
3. **Live-Preview** - Echtzeit-Vorschau mit Testdaten
4. **Feld-Eigenschaften** - Rechts-Panel für Feld-Konfiguration
5. **Datenquellen-Browser** - Verfügbare Datenfelder durchsuchen
6. **Auto-Bereiche** - Listen (Diagnosen, Medikamente, etc.) konfigurieren
7. **Stil-Editor** - CSS-ähnliche Styling-Optionen
8. **Validierung** - Validierungsregeln definieren

### 3.3 Designer-Workflow

```
1. Dokumenttyp auswählen
   ↓
2. Layout-Grid öffnen
   ↓
3. Felder hinzufügen (Drag & Drop)
   ↓
4. Feld konfigurieren:
   - Datenquelle wählen
   - Label setzen
   - Formatierung
   - Validierung
   - Styling
   ↓
5. Auto-Bereiche hinzufügen:
   - Diagnosen-Liste
   - Medikamente-Liste
   - Laborwerte-Tabelle
   ↓
6. Live-Vorschau testen
   ↓
7. Speichern
```

---

## 📊 4. PDF-Generierung mit einheitlichem Layout

### 4.1 PDF-Service Architektur

```javascript
// backend/services/unifiedDocumentPDFService.js

class UnifiedDocumentPDFService {
  constructor() {
    this.pdfGenerator = require('../utils/pdfGenerator');
  }
  
  /**
   * Generiert PDF mit einheitlichem Layout
   */
  async generateDocumentPDF(documentId, options = {}) {
    const document = await Document.findById(documentId)
      .populate('documentType')
      .populate('patient.id')
      .populate('doctor.id')
      .populate('workflowInstanceId');
    
    // 1. Standort-Daten laden
    const location = await Location.findById(
      document.doctor.id.locationId || options.locationId
    );
    
    // 2. Dokument-Design laden
    const design = await DocumentDesign.findOne({
      documentTypeId: document.documentType._id,
      locationId: location._id,
      isActive: true
    }) || await DocumentDesign.findOne({
      documentTypeId: document.documentType._id,
      locationId: null,  // Globales Design
      isActive: true
    });
    
    // 3. Daten sammeln
    const data = await this.collectDocumentData(document);
    
    // 4. Header generieren
    const headerHTML = this.generateHeader(location, document, data);
    
    // 5. Footer generieren
    const footerHTML = this.generateFooter(location, document);
    
    // 6. Body generieren (aus Design)
    const bodyHTML = this.generateBody(design, document, data);
    
    // 7. Vollständiges HTML zusammenfügen
    const fullHTML = this.combineHTML(headerHTML, bodyHTML, footerHTML, location);
    
    // 8. PDF generieren
    const pdfBuffer = await this.pdfGenerator.generatePDF(fullHTML, {
      format: location.documentConfig.layout.pageSize || 'A4',
      orientation: location.documentConfig.layout.orientation || 'portrait',
      margin: {
        top: `${location.documentConfig.layout.margins.top + location.documentConfig.layout.margins.header}mm`,
        right: `${location.documentConfig.layout.margins.right}mm`,
        bottom: `${location.documentConfig.layout.margins.bottom + location.documentConfig.layout.margins.footer}mm`,
        left: `${location.documentConfig.layout.margins.left}mm`
      },
      displayHeaderFooter: true,
      headerTemplate: headerHTML,
      footerTemplate: footerHTML
    });
    
    return pdfBuffer;
  }
  
  /**
   * Sammelt alle Daten für das Dokument
   */
  async collectDocumentData(document) {
    const data = {
      // Basis-Daten
      document: document.toObject(),
      patient: await this.getPatientData(document.patient.id),
      doctor: await this.getDoctorData(document.doctor.id),
      
      // Automatische Daten-Bereiche
      diagnoses: await this.getDiagnoses(document.patient.id),
      medications: await this.getMedications(document.patient.id),
      labResults: await this.getLabResults(document.patient.id),
      services: await this.getServices(document),
      anamnesis: await this.getAnamnesis(document.patient.id),
      medicalStatus: await this.getMedicalStatus(document.patient.id),
      appointments: await this.getAppointments(document.patient.id),
      
      // System-Daten
      system: {
        currentDate: new Date(),
        documentNumber: document.documentNumber,
        pageNumber: null,  // Wird beim Rendering gesetzt
        totalPages: null
      }
    };
    
    return data;
  }
  
  /**
   * Generiert Header-HTML
   */
  generateHeader(location, document, data) {
    const config = location.documentConfig.header;
    
    let html = '<div class="document-header">';
    
    // Logo
    if (config.showLogo && location.documentConfig.header.logo.url) {
      html += `<img src="${location.documentConfig.header.logo.url}" 
                    style="width: ${location.documentConfig.header.logo.width}mm; 
                           height: ${location.documentConfig.header.logo.height}mm;" />`;
    }
    
    // Ordination-Daten
    if (config.showOrdinationName) {
      html += `<div class="ordination-name">${location.name}</div>`;
    }
    if (config.showOrdinationAddress) {
      html += `<div class="ordination-address">${this.formatAddress(location)}</div>`;
    }
    // ... weitere Header-Felder
    
    // Arzt-Daten
    if (config.showDoctorName) {
      html += `<div class="doctor-name">${data.doctor.fullName}</div>`;
    }
    
    // Dokument-Metadaten
    if (config.showDocumentTitle) {
      html += `<div class="document-title">${document.title || document.documentType.name}</div>`;
    }
    if (config.showDocumentDate) {
      html += `<div class="document-date">Datum: ${this.formatDate(data.system.currentDate)}</div>`;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Generiert Body aus Design
   */
  generateBody(design, document, data) {
    let html = '<div class="document-body">';
    
    // Felder rendern
    for (const field of design.layout.fields) {
      if (!field.visible) continue;
      
      const value = this.resolveDataSource(field.dataSource, data);
      html += this.renderField(field, value);
    }
    
    // Auto-Bereiche rendern
    for (const autoSection of design.layout.autoSections) {
      const sectionData = this.resolveAutoSection(autoSection, data);
      html += this.renderAutoSection(autoSection, sectionData);
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Resolved Datenquelle
   */
  resolveDataSource(dataSource, data) {
    // z.B. "patient.firstName" -> data.patient.firstName
    const parts = dataSource.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return value;
  }
}
```

---

## 🔗 5. Integration mit bestehenden Systemen

### 5.1 Integration mit Versionierung

```javascript
// Versionierung speichert auch das verwendete Design

DocumentVersionSchema = {
  // ... bestehende Felder ...
  
  designId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentDesign'
  },
  designVersion: {
    type: Number
  },
  
  // Vollständiger HTML-Snapshot (für Reproduzierbarkeit)
  renderedHTML: {
    type: String
  },
  renderedPDFHash: {
    type: String  // SHA-256 Hash des PDFs
  }
};
```

### 5.2 Integration mit Workflow

```javascript
// Workflow kann Design-Validierung beinhalten

WorkflowStep = {
  // ... bestehende Felder ...
  
  designValidation: {
    required: Boolean,  // Design muss vorhanden sein?
    validateFields: Boolean,  // Felder validieren?
    validateDataSources: Boolean  // Datenquellen prüfen?
  }
};
```

### 5.3 Integration mit Migration

```javascript
// Migrations-Script für bestehende Dokumente

async function migrateToUnifiedDesign() {
  // 1. Standard-Designs erstellen
  const defaultDesigns = await createDefaultDesigns();
  
  // 2. Bestehende Dokumente mit Standard-Design verknüpfen
  await Document.updateMany(
    { designId: { $exists: false } },
    { $set: { designId: defaultDesigns[document.documentType] } }
  );
  
  // 3. Standort-Konfigurationen setzen
  await ensureLocationDocumentConfigs();
}
```

---

## 📋 6. Implementierungs-Reihenfolge

### Phase 1: Standort-Erweiterung (1 Woche)
1. ✅ Location Schema erweitern
2. ✅ Standort-Daten als Pflichtfelder markieren
3. ✅ Standort-Verwaltungs-UI erweitern
4. ✅ Validierung für Pflichtfelder

### Phase 2: Header/Footer-System (1 Woche)
1. ✅ Header-Generator Service
2. ✅ Footer-Generator Service
3. ✅ HTML-Templates erstellen
4. ✅ PDF-Integration

### Phase 3: Datenquellen-System (1-2 Wochen)
1. ✅ Datenquellen-Definitionen
2. ✅ Daten-Sammler Service
3. ✅ Auto-Bereiche (Listen)
4. ✅ Test mit echten Daten

### Phase 4: Designer Backend (2 Wochen)
1. ✅ DocumentDesign Schema
2. ✅ Designer-API (CRUD)
3. ✅ Layout-Engine
4. ✅ Feld-Renderer

### Phase 5: Designer Frontend (3-4 Wochen)
1. ✅ Designer-UI
2. ✅ Drag & Drop Canvas
3. ✅ Feld-Editor
4. ✅ Live-Preview
5. ✅ Datenquellen-Browser

### Phase 6: PDF-Generierung (1 Woche)
1. ✅ Unified PDF Service
2. ✅ HTML-Kombinierer
3. ✅ CSS-Styling
4. ✅ Testing

### Phase 7: Integration & Migration (1 Woche)
1. ✅ Integration mit Versionierung
2. ✅ Integration mit Workflow
3. ✅ Migrations-Scripte
4. ✅ Testing

**Gesamt: ~10-12 Wochen**

---

## ✅ 7. Vorteile des Konzepts

### Einheitlichkeit
- ✅ Alle Dokumente sehen gleich aus (Header/Footer)
- ✅ Professionelles Erscheinungsbild
- ✅ Standort-Branding konsistent

### Flexibilität
- ✅ Designer ermöglicht Anpassungen
- ✅ Verschiedene Designs pro Dokumenttyp
- ✅ Standort-spezifische Designs möglich

### Automatisierung
- ✅ Automatischer Import von Diagnosen, etc.
- ✅ Weniger manuelle Eingabe
- ✅ Aktuelle Daten werden verwendet

### Wartbarkeit
- ✅ Design-Änderungen ohne Code
- ✅ Zentrale Konfiguration
- ✅ Versionierung der Designs

---

**Dieses Konzept integriert nahtlos mit Versionierung, Workflow und bestehendem System!** 🎨





