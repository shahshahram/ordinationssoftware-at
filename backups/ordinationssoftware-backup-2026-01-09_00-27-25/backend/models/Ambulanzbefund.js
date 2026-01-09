const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Ambulanzbefund Model
 * Lokaler Arbeitsbefund für Ordinationen
 */
const AmbulanzbefundSchema = new mongoose.Schema({
  // Identifikation
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `AMB-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  version: {
    type: Number,
    default: 1
  },
  
  // Zuordnung
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'patientModel', // Dynamische Referenz für Patient oder PatientExtended
    required: true,
    index: true
  },
  patientModel: {
    type: String,
    enum: ['Patient', 'PatientExtended'],
    default: 'PatientExtended', // Standard ist PatientExtended
    index: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Spezialisierung
  specialization: {
    type: String,
    enum: [
      'allgemein',
      'hno',
      'interne',
      'chirurgie',
      'dermatologie',
      'gyn',
      'pädiatrie',
      'neurologie',
      'orthopädie',
      'ophthalmologie',
      'urologie',
      'psychiatrie',
      'radiologie',
      'pathologie'
    ],
    required: true,
    index: true
  },
  
  // Formular-Template Referenz
  formTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AmbulanzbefundFormTemplate',
    required: true
  },
  
  // Ausgewählte Sections (für dynamisches Template)
  selectedSections: [{
    type: String
    // IDs der aktivierten Sections
  }],
  
  // Formulardaten (flexibles Schema basierend auf Template)
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {}
    // Struktur wird durch formTemplateId.formDefinition.schema definiert
  },
  
  // Strukturierte Daten (optional, für bessere Querying)
  anamnesis: {
    chiefComplaint: String,
    historyOfPresentIllness: String,
    pastMedicalHistory: String,
    familyHistory: String,
    socialHistory: String,
    reviewOfSystems: mongoose.Schema.Types.Mixed
  },
  
  examination: {
    general: mongoose.Schema.Types.Mixed,
    specialized: mongoose.Schema.Types.Mixed,
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
      code: String,
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
      urgency: {
        type: String,
        enum: ['normal', 'dringend', 'notfall']
      }
    }]
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
    isValid: {
      type: Boolean,
      default: false
    },
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    validatedAt: Date,
    validationErrors: [{
      field: String,
      message: String,
      severity: {
        type: String,
        enum: ['error', 'warning', 'info']
      }
    }]
  },
  
  // CDA-Export Information
  cdaExport: {
    exported: {
      type: Boolean,
      default: false
    },
    exportedAt: Date,
    exportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    xdsDocumentEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'XdsDocumentEntry'
    },
    cdaVersion: String,
    templateId: String,
    formatCode: String,
    classCode: String,
    typeCode: String
  },
  
  // Metadaten
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  finalizedAt: Date,
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Archivierung
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  archiveReason: String,
  
  // Kommentare/Notizen
  notes: String,
  
  // Tags für Kategorisierung
  tags: [String]
}, {
  timestamps: true,
  collection: 'ambulanzbefunde'
});

// Indizes
AmbulanzbefundSchema.index({ patientId: 1, createdAt: -1 });
AmbulanzbefundSchema.index({ locationId: 1, status: 1 });
AmbulanzbefundSchema.index({ specialization: 1, status: 1 });
AmbulanzbefundSchema.index({ 'cdaExport.exported': 1 });
AmbulanzbefundSchema.index({ formTemplateId: 1 });
AmbulanzbefundSchema.index({ createdBy: 1 });

// Virtual: Patient Info (dynamisch basierend auf patientModel)
AmbulanzbefundSchema.virtual('patient', {
  refPath: 'patientModel',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true
});

// Virtual: Template Info
AmbulanzbefundSchema.virtual('formTemplate', {
  ref: 'AmbulanzbefundFormTemplate',
  localField: 'formTemplateId',
  foreignField: '_id',
  justOne: true
});

// Method: Markiere als validiert
AmbulanzbefundSchema.methods.markAsValidated = function(validatedBy, errors = []) {
  this.status = errors.length === 0 ? 'validated' : 'draft';
  this.validation = {
    isValid: errors.length === 0,
    validatedBy,
    validatedAt: new Date(),
    validationErrors: errors
  };
  return this.save();
};

// Method: Finalisiere
AmbulanzbefundSchema.methods.finalize = function(finalizedBy) {
  if (this.status !== 'validated' && this.validation.isValid !== true) {
    throw new Error('Arbeitsbefund muss zuerst validiert sein');
  }
  this.status = 'finalized';
  this.finalizedAt = new Date();
  this.finalizedBy = finalizedBy;
  return this.save();
};

// Method: Markiere als exportiert
AmbulanzbefundSchema.methods.markAsExported = function(xdsDocumentEntryId, exportedBy, cdaInfo) {
  // Validierung: Alle cdaInfo-Felder müssen vorhanden sein
  const requiredFields = ['cdaVersion', 'templateId', 'formatCode', 'classCode', 'typeCode'];
  const missingFields = requiredFields.filter(field => !cdaInfo || !cdaInfo[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`CDA-Info unvollständig: Fehlende Felder: ${missingFields.join(', ')}`);
  }
  
  if (!xdsDocumentEntryId || !exportedBy) {
    throw new Error('xdsDocumentEntryId und exportedBy sind erforderlich');
  }
  
  this.cdaExport = {
    exported: true,
    exportedAt: new Date(),
    exportedBy,
    xdsDocumentEntryId,
    cdaVersion: cdaInfo.cdaVersion,
    templateId: cdaInfo.templateId,
    formatCode: cdaInfo.formatCode,
    classCode: cdaInfo.classCode,
    typeCode: cdaInfo.typeCode
  };
  this.status = 'exported';
  return this.save();
};

// Pre-save Hook: Extrahiere strukturierte Daten aus formData & Validierung
AmbulanzbefundSchema.pre('save', function(next) {
  // 1. Validierung: Wenn exported, müssen alle CDA-Felder gesetzt sein
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
  
  // 2. Validierung: Wenn finalized, müssen finalizedAt/By gesetzt sein
  if (this.status === 'finalized' && !this.finalizedAt) {
    return next(new Error('finalizedAt muss gesetzt sein wenn status finalized'));
  }
  
  // 3. Validierung: Wenn archived, müssen archivedAt/By gesetzt sein
  if (this.status === 'archived' && !this.archivedAt) {
    return next(new Error('archivedAt muss gesetzt sein wenn status archived'));
  }
  
  // 4. Validierung: Wenn validated, sollten validatedBy/At gesetzt sein
  if (this.status === 'validated' && this.validation?.isValid === true && !this.validation.validatedAt) {
    // Warnung, aber kein Fehler (kann durch markAsValidated gesetzt werden)
    logger.warn(`Ambulanzbefund ${this.documentNumber} ist validated aber validatedAt nicht gesetzt`);
  }
  
  // 5. Extrahiere strukturierte Daten aus formData
  if (this.formData) {
    // Anamnese
    if (this.formData.anamnesis) {
      this.anamnesis = {
        chiefComplaint: this.formData.anamnesis.chiefComplaint || this.anamnesis?.chiefComplaint,
        historyOfPresentIllness: this.formData.anamnesis.historyOfPresentIllness || this.anamnesis?.historyOfPresentIllness,
        pastMedicalHistory: this.formData.anamnesis.pastMedicalHistory || this.anamnesis?.pastMedicalHistory,
        familyHistory: this.formData.anamnesis.familyHistory || this.anamnesis?.familyHistory,
        socialHistory: this.formData.anamnesis.socialHistory || this.anamnesis?.socialHistory,
        reviewOfSystems: this.formData.anamnesis.reviewOfSystems || this.anamnesis?.reviewOfSystems
      };
    }
    
    // Examination
    if (this.formData.examination) {
      this.examination = {
        general: this.formData.examination.general || this.examination?.general,
        specialized: this.formData.examination.specialized || this.examination?.specialized,
        vitalSigns: {
          bloodPressure: this.formData.examination.vitalSigns?.bloodPressure || this.examination?.vitalSigns?.bloodPressure,
          heartRate: this.formData.examination.vitalSigns?.heartRate || this.examination?.vitalSigns?.heartRate,
          temperature: this.formData.examination.vitalSigns?.temperature || this.examination?.vitalSigns?.temperature,
          weight: this.formData.examination.vitalSigns?.weight || this.examination?.vitalSigns?.weight,
          height: this.formData.examination.vitalSigns?.height || this.examination?.vitalSigns?.height,
          bmi: this.formData.examination.vitalSigns?.bmi || this.examination?.vitalSigns?.bmi
        }
      };
    }
    
    // Assessment
    if (this.formData.assessment) {
      this.assessment = {
        primaryDiagnosis: this.formData.assessment.primaryDiagnosis || this.assessment?.primaryDiagnosis,
        secondaryDiagnoses: this.formData.assessment.secondaryDiagnoses || this.assessment?.secondaryDiagnoses || [],
        clinicalImpression: this.formData.assessment.clinicalImpression || this.assessment?.clinicalImpression
      };
    }
    
    // Plan
    if (this.formData.plan) {
      this.plan = {
        therapy: this.formData.plan.therapy || this.plan?.therapy,
        medications: this.formData.plan.medications || this.plan?.medications || [],
        followUp: this.formData.plan.followUp || this.plan?.followUp,
        referrals: this.formData.plan.referrals || this.plan?.referrals || []
      };
    }
  }
  
  next();
});

module.exports = mongoose.model('Ambulanzbefund', AmbulanzbefundSchema);

