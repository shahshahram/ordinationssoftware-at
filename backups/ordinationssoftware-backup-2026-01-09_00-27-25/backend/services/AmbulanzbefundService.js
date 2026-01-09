const Ambulanzbefund = require('../models/Ambulanzbefund');
const AmbulanzbefundFormTemplate = require('../models/AmbulanzbefundFormTemplate');
const CdaGeneratorService = require('./CdaGeneratorService');
const XdsRegistryService = require('./XdsRegistryService');
const User = require('../models/User');
const logger = require('../utils/logger');

// JSON Schema Validator - Fallback wenn ajv nicht verfügbar
let ajv = null;
let addFormats = null;

try {
  const Ajv = require('ajv');
  addFormats = require('ajv-formats');
  ajv = new Ajv({ allErrors: true, verbose: true });
  if (addFormats) {
    addFormats(ajv);
  }
} catch (error) {
  logger.warn('AJV nicht verfügbar - Validierung wird vereinfacht durchgeführt');
}

/**
 * Ambulanzbefund Service
 * Verwaltet Arbeitsbefunde und deren Validierung
 */
class AmbulanzbefundService {
  /**
   * Erstellt neuen Arbeitsbefund
   * @param {String} patientId - Patient ID
   * @param {String} locationId - Location ID
   * @param {String} userId - User ID
   * @param {String} specialization - Spezialisierung
   * @param {Object} formData - Formulardaten
   * @param {String} formTemplateId - Template ID (optional)
   * @param {Array} selectedSections - Ausgewählte Sections (optional)
   * @param {String} status - Status ('draft', 'validated', 'finalized') - optional, wird automatisch gesetzt wenn nicht angegeben
   */
  static async createAmbulanzbefund(patientId, locationId, userId, specialization, formData, formTemplateId = null, selectedSections = [], status = null) {
    try {
      // 1. Template laden
      let template;
      if (formTemplateId) {
        template = await AmbulanzbefundFormTemplate.findById(formTemplateId);
        if (!template || !template.isActive) {
          throw new Error('Template nicht gefunden oder nicht aktiv');
        }
        if (template.specialization !== specialization) {
          throw new Error('Template-Spezialisierung stimmt nicht überein');
        }
      } else {
        // Default-Template für Spezialisierung laden
        template = await AmbulanzbefundFormTemplate.findDefaultForSpecialization(specialization, locationId);
        if (!template) {
          throw new Error(`Kein Default-Template für Spezialisierung "${specialization}" gefunden`);
        }
      }
      
      // 2. Validiere FormData gegen Template-Schema
      const validation = await this.validateFormData(formData, template);
      
      // 3. Status bestimmen: Explizit gesetzt > Validierungsergebnis > default 'draft'
      const finalStatus = status || (validation.isValid ? 'validated' : 'draft');
      
      // 4. Bestimme patientModel (Patient oder PatientExtended)
      let patientModel = 'PatientExtended'; // Standard
      const Patient = require('../models/Patient');
      const PatientExtended = require('../models/PatientExtended');
      const patientInExtended = await PatientExtended.findById(patientId);
      const patientInBasic = patientInExtended ? null : await Patient.findById(patientId);
      
      if (patientInExtended) {
        patientModel = 'PatientExtended';
      } else if (patientInBasic) {
        patientModel = 'Patient';
      } else {
        throw new Error(`Patient mit ID ${patientId} nicht gefunden (weder in Patient noch in PatientExtended)`);
      }
      
      // 5. Arbeitsbefund erstellen
      const ambefund = await Ambulanzbefund.create({
        patientId,
        patientModel, // Setze patientModel für dynamische Referenz
        locationId,
        createdBy: userId,
        specialization,
        formTemplateId: template._id,
        selectedSections: selectedSections.length > 0 ? selectedSections : undefined,
        formData,
        validation: {
          isValid: validation.isValid,
          validationErrors: validation.errors
        },
        status: finalStatus
      });
      
      logger.info(`Ambulanzbefund erstellt: ${ambefund.documentNumber}`);
      return { ambefund, template };
    } catch (error) {
      logger.error(`Fehler beim Erstellen des Ambulanzbefunds: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Validiert Formulardaten gegen Template-Schema
   */
  static async validateFormData(formData, template) {
    const errors = [];
    
    try {
      // 1. JSON Schema Validierung (falls AJV verfügbar)
      if (template.formDefinition?.schema && ajv) {
        try {
          const validate = ajv.compile(template.formDefinition.schema);
          const valid = validate(formData);
          
          if (!valid) {
            validate.errors.forEach(error => {
              errors.push({
                field: error.instancePath || error.params?.missingProperty || 'unknown',
                message: error.message || 'Validierungsfehler',
                severity: 'error'
              });
            });
          }
        } catch (schemaError) {
          logger.warn(`Schema-Validierungsfehler: ${schemaError.message}`);
          // Schema-Fehler nicht als Datenfehler behandeln
        }
      }
      
      // 2. IL-Regeln Validierung
      // Konditionale Requirements aus ELGA IL prüfen
      // Beispiel: Wenn bestimmte Section vorhanden, dann bestimmtes Feld required
      if (template.formDefinition?.layout?.fields) {
        const sectionsInFormData = Object.keys(formData).filter(key => 
          template.formDefinition.layout.sections?.some(s => s.id === key)
        );
        
        // Prüfe konditionale Requirements basierend auf vorhandenen Sections
        template.formDefinition.layout.fields.forEach(field => {
          // Wenn Feld in required Section ist und Section vorhanden → Feld muss gefüllt sein
          if (field.required && field.sectionId) {
            const section = template.formDefinition.layout.sections?.find(s => s.id === field.sectionId);
            if (section && sectionsInFormData.includes(field.sectionId)) {
              const fieldValue = this.getNestedValue(formData, field.dataSource || field.id);
              if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
                errors.push({
                  field: field.id || field.dataSource,
                  message: `Pflichtfeld "${field.label}" ist erforderlich (Section ${section.label} aktiviert)`,
                  severity: 'error'
                });
              }
            }
          }
        });
      }
      
      // 3. Pflichtfelder prüfen (basierend auf Template-Layout)
      if (template.formDefinition?.layout?.fields) {
        const requiredFields = template.formDefinition.layout.fields.filter(f => f.required);
        requiredFields.forEach(field => {
          const fieldValue = this.getNestedValue(formData, field.dataSource || field.id);
          if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
            errors.push({
              field: field.id || field.dataSource,
              message: `Pflichtfeld "${field.label}" ist nicht ausgefüllt`,
              severity: 'error'
            });
          }
        });
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error(`Fehler bei FormData-Validierung: ${error.message}`);
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          message: `Validierungsfehler: ${error.message}`,
          severity: 'error'
        }]
      };
    }
  }
  
  /**
   * Aktualisiert Arbeitsbefund
   */
  static async updateAmbulanzbefund(ambefundId, userId, updateData) {
    try {
      const ambefund = await Ambulanzbefund.findById(ambefundId);
      if (!ambefund) {
        throw new Error('Ambulanzbefund nicht gefunden');
      }
      
      // Prüfe Berechtigung (nur Ersteller oder Admin)
      if (ambefund.createdBy.toString() !== userId.toString() && !await this.isAdmin(userId)) {
        throw new Error('Keine Berechtigung zum Bearbeiten');
      }
      
      // Wenn formData aktualisiert wird, neu validieren
      if (updateData.formData) {
        const template = await AmbulanzbefundFormTemplate.findById(ambefund.formTemplateId);
        const validation = await this.validateFormData(updateData.formData, template);
        
        updateData.validation = {
          isValid: validation.isValid,
          validationErrors: validation.errors
        };
        
        // Status: Explizit gesetzt > Validierungsergebnis > bestehender Status (außer 'exported')
        if (updateData.status) {
          // Explizit gesetzter Status wird verwendet
        } else if (ambefund.status === 'exported') {
          // Exportierte Befunde behalten ihren Status
          delete updateData.status;
        } else {
          // Automatisch basierend auf Validierung
          updateData.status = validation.isValid ? 'validated' : 'draft';
        }
      } else if (updateData.status) {
        // Status kann auch ohne formData-Update gesetzt werden
        // (z.B. beim manuellen Setzen als Entwurf)
      }
      
      Object.assign(ambefund, updateData);
      ambefund.updatedAt = new Date();
      
      await ambefund.save();
      
      logger.info(`Ambulanzbefund aktualisiert: ${ambefund.documentNumber}`);
      return ambefund;
    } catch (error) {
      logger.error(`Fehler beim Aktualisieren des Ambulanzbefunds: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Validiert Arbeitsbefund erneut
   */
  static async validateAmbulanzbefund(ambefundId, userId) {
    try {
      const ambefund = await Ambulanzbefund.findById(ambefundId)
        .populate('formTemplateId');
      
      if (!ambefund) {
        throw new Error('Ambulanzbefund nicht gefunden');
      }
      
      const validation = await this.validateFormData(ambefund.formData, ambefund.formTemplateId);
      
      await ambefund.markAsValidated(userId, validation.errors);
      
      logger.info(`Ambulanzbefund validiert: ${ambefund.documentNumber}, gültig: ${validation.isValid}`);
      return { ambefund, validation };
    } catch (error) {
      logger.error(`Fehler bei Validierung: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Finalisiert Arbeitsbefund und exportiert automatisch als CDA ins XDS Repository
   */
  static async finalizeAmbulanzbefund(ambefundId, userId) {
    try {
      // Lade Ambulanzbefund mit allen benötigten Daten
      const ambefund = await Ambulanzbefund.findById(ambefundId)
        .populate('patientId', 'firstName lastName dateOfBirth socialSecurityNumber')
        .populate('locationId')
        .populate('createdBy', 'firstName lastName email')
        .populate('formTemplateId');
      
      if (!ambefund) {
        throw new Error('Ambulanzbefund nicht gefunden');
      }
      
      if (ambefund.status === 'exported') {
        throw new Error('Bereits exportierter Arbeitsbefund kann nicht finalisiert werden');
      }
      
      // Stelle sicher, dass Template vor finalize() geladen ist (da save() populate entfernt)
      let template = ambefund.formTemplateId;
      if (!template || (typeof template === 'string')) {
        logger.info(`Template nicht als Object geladen, lade vor Finalisierung...`);
        template = await AmbulanzbefundFormTemplate.findById(
          typeof template === 'string' ? template : ambefund.formTemplateId
        );
      }
      
      if (!template) {
        logger.error(`Template nicht gefunden für Ambulanzbefund ${ambefund.documentNumber} (ID: ${ambefund.formTemplateId})`);
      } else {
        logger.info(`Template geladen: ${template.code} (${template.name || template._id})`);
      }
      
      // Finalisiere zuerst
      await ambefund.finalize(userId);
      logger.info(`Ambulanzbefund finalisiert: ${ambefund.documentNumber}`);
      
      // Automatischer Export als CDA ins XDS Repository
      try {
        logger.info(`Starte Export-Prüfung für Ambulanzbefund ${ambefund.documentNumber}`);
        if (!template) {
          logger.warn(`Template nicht gefunden für Ambulanzbefund ${ambefund.documentNumber} - Export übersprungen`);
          return ambefund;
        }

        // Prüfe ob Template CDA-Export-Felder hat
        const elgaRef = template.elgaIlReference;
        if (!elgaRef) {
          logger.warn(`Template ${template.code} hat keine ELGA IL Referenz - Export übersprungen`);
          logger.warn(`Template Details: ${JSON.stringify({ code: template.code, name: template.name, hasElgaRef: !!template.elgaIlReference })}`);
          return ambefund;
        }
        
        logger.info(`ELGA IL Referenz gefunden für Template ${template.code}`);
        
        if (!elgaRef.formatCode || !elgaRef.classCode || !elgaRef.typeCode) {
          logger.warn(`Template ${template.code} hat unvollständige ELGA IL Referenz - Export übersprungen`);
          logger.warn(`Fehlende Felder: formatCode=${!!elgaRef.formatCode}, classCode=${!!elgaRef.classCode}, typeCode=${!!elgaRef.typeCode}`);
          logger.warn(`ELGA Ref Details: ${JSON.stringify({ hasFormatCode: !!elgaRef.formatCode, hasClassCode: !!elgaRef.classCode, hasTypeCode: !!elgaRef.typeCode })}`);
          return ambefund;
        }
        
        logger.info(`Template ${template.code} hat vollständige ELGA IL Referenz - Export wird durchgeführt`);

        // Prüfe ob Location XDS Registry aktiviert hat
        const location = typeof ambefund.locationId === 'object' 
          ? ambefund.locationId 
          : await require('../models/Location').findById(ambefund.locationId);
        
        if (!location) {
          logger.error(`Location ${ambefund.locationId} nicht gefunden - Export übersprungen`);
          return ambefund;
        }
        
        if (!location.xdsRegistry || !location.xdsRegistry.enabled) {
          logger.warn(`XDS Registry für Location ${location._id || location.name || ambefund.locationId} nicht aktiviert - Export übersprungen`);
          logger.warn(`XDS Registry Details: enabled=${!!location.xdsRegistry?.enabled}, exists=${!!location.xdsRegistry}`);
          return ambefund;
        }
        
        logger.info(`XDS Registry für Location ${location._id || location.name} ist aktiviert - Export wird durchgeführt`);

        // Generiere CDA XML
        const cdaXml = await CdaGeneratorService.generateAmbulanzbefundCDA(ambefund, template);

        // Lade User für Export
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('Benutzer nicht gefunden');
        }

        // Extrahiere Patient ID (kann Object oder String sein)
        const patientId = typeof ambefund.patientId === 'object'
          ? ambefund.patientId._id.toString()
          : ambefund.patientId.toString();

        // Extrahiere Location ID
        const locationId = typeof ambefund.locationId === 'object'
          ? ambefund.locationId._id.toString()
          : ambefund.locationId.toString();

        // Extrahiere CDA-Metadaten aus Template
        const formatCodeObj = typeof elgaRef.formatCode === 'object' 
          ? elgaRef.formatCode 
          : { code: elgaRef.formatCode, codingScheme: 'ELGA_Formatcode' };
        
        const classCodeObj = typeof elgaRef.classCode === 'object'
          ? elgaRef.classCode
          : { code: elgaRef.classCode, codingScheme: 'ELGA_Dokumentenklassen' };
        
        const typeCodeObj = typeof elgaRef.typeCode === 'object'
          ? elgaRef.typeCode
          : { code: elgaRef.typeCode, codingScheme: 'ELGA_Dokumentenklassen' };

        // Registriere im XDS Registry
        const documentEntry = await XdsRegistryService.registerDocument(
          locationId,
          Buffer.from(cdaXml, 'utf8'),
          {
            patientId: patientId,
            title: `Ambulanzbefund - ${typeof ambefund.patientId === 'object' ? `${ambefund.patientId.firstName} ${ambefund.patientId.lastName}` : patientId}`,
            mimeType: 'application/xml',
            classCode: classCodeObj,
            typeCode: [typeCodeObj],
            formatCode: formatCodeObj,
            comments: `Exportiert aus Ambulanzbefund ${ambefund.documentNumber} (${template.name})`,
            source: 'ambulanzbefund',
            serviceStartTime: ambefund.createdAt,
            serviceStopTime: ambefund.finalizedAt || ambefund.updatedAt
          },
          user
        );

        // Markiere als exportiert
        // templateId: Verwende elgaRef.templateId oder Template-ID als Fallback
        const cdaTemplateId = elgaRef.templateId || (template._id ? template._id.toString() : '1.2.40.0.34.11.2'); // Standard ELGA Template ID als letzter Fallback (gültige Schematron-templateID)
        
        await ambefund.markAsExported(
          documentEntry._id,
          userId,
          {
            cdaVersion: elgaRef.specificIlVersion || '1.0',
            templateId: cdaTemplateId,
            formatCode: formatCodeObj.code || formatCodeObj,
            classCode: classCodeObj.code || classCodeObj,
            typeCode: typeCodeObj.code || typeCodeObj
          }
        );

        logger.info(`Ambulanzbefund ${ambefund.documentNumber} automatisch als CDA exportiert (XDS Entry: ${documentEntry._id})`);
        logger.info(`XDS Document Details: title="${documentEntry.title}", source="${documentEntry.source}", availabilityStatus="${documentEntry.availabilityStatus}", locationId="${documentEntry.locationId}", patientId="${documentEntry.patientId}"`);
      } catch (exportError) {
        // Export-Fehler sollte nicht das Finalisieren verhindern
        logger.error(`Fehler beim automatischen Export des Ambulanzbefunds ${ambefund.documentNumber}: ${exportError.message}`);
        logger.error(`Export Error Stack: ${exportError.stack}`);
        logger.error(`Export Error Details:`, {
          ambefundId: ambefund._id,
          documentNumber: ambefund.documentNumber,
          templateId: template?._id,
          templateCode: template?.code,
          hasElgaRef: !!template?.elgaIlReference,
          locationId: ambefund.locationId,
          userId: userId,
          error: exportError.message,
          errorType: exportError.constructor?.name
        });
        // Weiter mit finalisiertem Status (ohne Export)
      }
      
      return ambefund;
    } catch (error) {
      logger.error(`Fehler beim Finalisieren: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Exportiert einen bereits finalisierten Ambulanzbefund nachträglich ins XDS Repository
   * @param {String} ambefundId - Ambulanzbefund ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Der exportierte Ambulanzbefund mit XDS DocumentEntry
   */
  static async exportAmbulanzbefund(ambefundId, userId) {
    try {
      logger.info(`Starte Export für Ambulanzbefund ${ambefundId}`);
      
      // Lade zuerst ohne populate, um die IDs zu speichern
      const ambefundRaw = await Ambulanzbefund.findById(ambefundId).lean();

      if (!ambefundRaw) {
        throw new Error('Ambulanzbefund nicht gefunden');
      }

      // Speichere die ursprünglichen IDs (falls populate sie auf null setzt)
      const originalPatientId = ambefundRaw.patientId ? ambefundRaw.patientId.toString() : null;
      const originalLocationId = ambefundRaw.locationId ? ambefundRaw.locationId.toString() : null;
      const originalCreatedById = ambefundRaw.createdBy ? ambefundRaw.createdBy.toString() : null;
      const originalTemplateId = ambefundRaw.formTemplateId ? ambefundRaw.formTemplateId.toString() : null;
      
      // Stelle sicher, dass patientModel gesetzt ist (für alte Ambulanzbefunde)
      let originalPatientModel = ambefundRaw.patientModel || 'PatientExtended'; // Standard
      if (!ambefundRaw.patientModel && originalPatientId) {
        // Bestimme automatisch das Modell
        const PatientExtended = require('../models/PatientExtended');
        const patientInExtended = await PatientExtended.findById(originalPatientId).lean();
        originalPatientModel = patientInExtended ? 'PatientExtended' : 'Patient';
        
        // Aktualisiere den Ambulanzbefund für zukünftige Verwendung
        await Ambulanzbefund.findByIdAndUpdate(ambefundId, { patientModel: originalPatientModel }, { runValidators: false });
        logger.info(`patientModel für Ambulanzbefund ${ambefundId} automatisch auf ${originalPatientModel} gesetzt`);
      }

      logger.info(`Original IDs - patientId: ${originalPatientId}, locationId: ${originalLocationId}, createdBy: ${originalCreatedById}, templateId: ${originalTemplateId}, patientModel: ${originalPatientModel}`);
      
      // Validiere, dass alle IDs vorhanden sind
      if (!originalPatientId) {
        throw new Error(`Ambulanzbefund hat keinen Patient (patientId: null)`);
      }
      if (!originalLocationId) {
        throw new Error(`Ambulanzbefund hat keine Location (locationId: null)`);
      }
      if (!originalCreatedById) {
        throw new Error(`Ambulanzbefund hat keinen Autor (createdBy: null)`);
      }
      if (!originalTemplateId) {
        throw new Error(`Ambulanzbefund hat kein Template (formTemplateId: null)`);
      }
      
      // Lade jetzt mit populate (refPath funktioniert automatisch mit patientModel)
      const ambefund = await Ambulanzbefund.findById(ambefundId)
        .populate('patientId', 'firstName lastName dateOfBirth socialSecurityNumber')
        .populate('locationId')
        .populate('createdBy', 'firstName lastName email')
        .populate('formTemplateId');
      
      // Stelle sicher, dass patientModel gesetzt ist (für alte Ambulanzbefunde)
      if (!ambefund.patientModel) {
        logger.warn(`Ambulanzbefund ${ambefundId} hat kein patientModel, setze automatisch...`);
        const Patient = require('../models/Patient');
        const PatientExtended = require('../models/PatientExtended');
        const patientInExtended = await PatientExtended.findById(originalPatientId);
        ambefund.patientModel = patientInExtended ? 'PatientExtended' : 'Patient';
        if (!patientInExtended) {
          const patientInBasic = await Patient.findById(originalPatientId);
          if (!patientInBasic) {
            logger.error(`Patient ${originalPatientId} nicht gefunden für Ambulanzbefund ${ambefundId}`);
          }
        }
      }
      
      logger.info(`Nach populate - patientId: ${ambefund.patientId ? (typeof ambefund.patientId === 'object' ? ambefund.patientId._id : ambefund.patientId) : 'null'}, typeof: ${typeof ambefund.patientId}`);
      
      // Stelle sicher, dass alle Referenzen als Objekte geladen sind
      // Falls populate null zurückgibt (weil Dokument nicht existiert), verwende die ursprüngliche ID
      if (!ambefund.patientId || typeof ambefund.patientId !== 'object') {
        logger.warn(`Patient nicht als Object geladen (originalPatientId: ${originalPatientId}), lade manuell...`);
        // Versuche zuerst Patient, dann PatientExtended
        const Patient = require('../models/Patient');
        let patient = await Patient.findById(originalPatientId);
        if (!patient) {
          logger.warn(`Patient nicht in 'Patient' Collection gefunden, versuche 'PatientExtended'...`);
          const PatientExtended = require('../models/PatientExtended');
          patient = await PatientExtended.findById(originalPatientId);
        }
        if (!patient) {
          throw new Error(`Patient mit ID ${originalPatientId} nicht in der Datenbank gefunden (weder in 'Patient' noch in 'PatientExtended'). Bitte Datenintegrität prüfen.`);
        }
        ambefund.patientId = patient;
        logger.info(`Patient erfolgreich geladen aus ${patient.constructor.modelName || 'Patient/PatientExtended'}`);
      }
      
      if (!ambefund.locationId || typeof ambefund.locationId !== 'object') {
        logger.warn(`Location nicht als Object geladen (originalLocationId: ${originalLocationId}), lade manuell...`);
        const Location = require('../models/Location');
        const location = await Location.findById(originalLocationId);
        if (!location) {
          throw new Error(`Location mit ID ${originalLocationId} nicht in der Datenbank gefunden. Bitte Datenintegrität prüfen.`);
        }
        ambefund.locationId = location;
      }
      
      if (!ambefund.createdBy || typeof ambefund.createdBy !== 'object') {
        logger.warn(`Autor nicht als Object geladen (originalCreatedById: ${originalCreatedById}), lade manuell...`);
        const author = await User.findById(originalCreatedById);
        if (!author) {
          throw new Error(`Autor mit ID ${originalCreatedById} nicht in der Datenbank gefunden. Bitte Datenintegrität prüfen.`);
        }
        ambefund.createdBy = author;
      }
      
      if (!ambefund.formTemplateId || typeof ambefund.formTemplateId !== 'object') {
        logger.warn(`Template nicht als Object geladen (originalTemplateId: ${originalTemplateId}), lade manuell...`);
        const template = await AmbulanzbefundFormTemplate.findById(originalTemplateId);
        if (!template) {
          throw new Error(`Template mit ID ${originalTemplateId} nicht in der Datenbank gefunden. Bitte Datenintegrität prüfen.`);
        }
        ambefund.formTemplateId = template;
      }
      
      logger.info(`Alle Referenzen geladen - Patient: ${ambefund.patientId && ambefund.patientId._id ? ambefund.patientId._id : (ambefund.patientId || 'null')}, Location: ${ambefund.locationId && ambefund.locationId._id ? ambefund.locationId._id : (ambefund.locationId || 'null')}, Autor: ${ambefund.createdBy && ambefund.createdBy._id ? ambefund.createdBy._id : (ambefund.createdBy || 'null')}, Template: ${ambefund.formTemplateId && ambefund.formTemplateId._id ? ambefund.formTemplateId._id : (ambefund.formTemplateId || 'null')}`);
      
      // Prüfe ob bereits exportiert
      if (ambefund.cdaExport?.exported && ambefund.status === 'exported') {
        logger.info(`Ambulanzbefund ${ambefund.documentNumber} wurde bereits exportiert (XDS Entry: ${ambefund.cdaExport.xdsDocumentEntryId})`);
        return {
          ambefund,
          alreadyExported: true,
          xdsDocumentEntryId: ambefund.cdaExport.xdsDocumentEntryId
        };
      }
      
      // Prüfe ob finalisiert
      if (ambefund.status !== 'finalized' && ambefund.status !== 'exported') {
        throw new Error('Ambulanzbefund muss zuerst finalisiert sein');
      }

      const template = ambefund.formTemplateId;
      if (!template) {
        throw new Error('Template nicht gefunden');
      }

      // Prüfe ob Template CDA-Export-Felder hat
      const elgaRef = template.elgaIlReference;
      if (!elgaRef) {
        throw new Error(`Template ${template.code} hat keine ELGA IL Referenz`);
      }
      
      if (!elgaRef.formatCode || !elgaRef.classCode || !elgaRef.typeCode) {
        throw new Error(`Template ${template.code} hat unvollständige ELGA IL Referenz - fehlende Felder: formatCode=${!!elgaRef.formatCode}, classCode=${!!elgaRef.classCode}, typeCode=${!!elgaRef.typeCode}`);
      }

      // Prüfe ob Location XDS Registry aktiviert hat
      const location = typeof ambefund.locationId === 'object' 
        ? ambefund.locationId 
        : await require('../models/Location').findById(ambefund.locationId);
      
      if (!location) {
        throw new Error(`Location ${ambefund.locationId} nicht gefunden`);
      }
      
      if (!location.xdsRegistry || !location.xdsRegistry.enabled) {
        throw new Error(`XDS Registry für Location ${location._id || location.name || ambefund.locationId} nicht aktiviert`);
      }

      logger.info(`Starte manuellen Export für Ambulanzbefund ${ambefund.documentNumber}`);

      // Generiere CDA XML
      const cdaXml = await CdaGeneratorService.generateAmbulanzbefundCDA(ambefund, template);

      // Lade User für Export
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Benutzer nicht gefunden');
      }

      // Extrahiere Patient ID (kann Object oder String sein)
      const patientId = typeof ambefund.patientId === 'object'
        ? ambefund.patientId._id.toString()
        : ambefund.patientId.toString();

      // Extrahiere Location ID
      const locationId = typeof ambefund.locationId === 'object'
        ? ambefund.locationId._id.toString()
        : ambefund.locationId.toString();

      // Extrahiere CDA-Metadaten aus Template
      const formatCodeObj = typeof elgaRef.formatCode === 'object' 
        ? elgaRef.formatCode 
        : { code: elgaRef.formatCode, codingScheme: 'ELGA_Formatcode' };
      
      const classCodeObj = typeof elgaRef.classCode === 'object'
        ? elgaRef.classCode
        : { code: elgaRef.classCode, codingScheme: 'ELGA_Dokumentenklassen' };
      
      const typeCodeObj = typeof elgaRef.typeCode === 'object'
        ? elgaRef.typeCode
        : { code: elgaRef.typeCode, codingScheme: 'ELGA_Dokumentenklassen' };

      // Registriere im XDS Registry
      const documentEntry = await XdsRegistryService.registerDocument(
        locationId,
        Buffer.from(cdaXml, 'utf8'),
        {
          patientId: patientId,
          title: `Ambulanzbefund - ${typeof ambefund.patientId === 'object' ? `${ambefund.patientId.firstName} ${ambefund.patientId.lastName}` : patientId}`,
          mimeType: 'application/xml',
          classCode: classCodeObj,
          typeCode: [typeCodeObj],
          formatCode: formatCodeObj,
          comments: `Exportiert aus Ambulanzbefund ${ambefund.documentNumber} (${template.name})`,
          source: 'ambulanzbefund',
          serviceStartTime: ambefund.createdAt,
          serviceStopTime: ambefund.finalizedAt || ambefund.updatedAt
        },
        user
      );

      // Markiere als exportiert
      // templateId: Verwende elgaRef.templateId oder Template-ID als Fallback
      const cdaTemplateId = elgaRef.templateId || (template._id ? template._id.toString() : '1.2.40.0.34.11.1'); // Standard ELGA Template ID als letzter Fallback
      
      await ambefund.markAsExported(
        documentEntry._id,
        userId,
        {
          cdaVersion: elgaRef.specificIlVersion || '1.0',
          templateId: cdaTemplateId,
          formatCode: formatCodeObj.code || formatCodeObj,
          classCode: classCodeObj.code || classCodeObj,
          typeCode: typeCodeObj.code || typeCodeObj
        }
      );

      logger.info(`Ambulanzbefund ${ambefund.documentNumber} erfolgreich manuell als CDA exportiert (XDS Entry: ${documentEntry._id})`);
      logger.info(`XDS Document Details: title="${documentEntry.title}", source="${documentEntry.source}", availabilityStatus="${documentEntry.availabilityStatus}", locationId="${documentEntry.locationId}", patientId="${documentEntry.patientId}"`);
      
      return {
        ambefund,
        alreadyExported: false,
        xdsDocumentEntryId: documentEntry._id,
        documentEntry
      };
    } catch (error) {
      logger.error(`Fehler beim manuellen Export des Ambulanzbefunds ${ambefundId}: ${error.message}`);
      logger.error(`Export Error Stack: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * Lädt Arbeitsbefund mit allen Details
   */
  static async getAmbulanzbefund(ambefundId, populate = true) {
    try {
      let query = Ambulanzbefund.findById(ambefundId);
      
      if (populate) {
        query = query
          .populate('patientId', 'firstName lastName dateOfBirth socialSecurityNumber')
          .populate('locationId', 'name address_line1 postal_code city')
          .populate('createdBy', 'firstName lastName title')
          .populate('formTemplateId');
      }
      
      const ambefund = await query;
      
      if (!ambefund) {
        throw new Error('Ambulanzbefund nicht gefunden');
      }
      
      return ambefund;
    } catch (error) {
      logger.error(`Fehler beim Laden des Ambulanzbefunds: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Liste von Arbeitsbefunden
   */
  static async listAmbulanzbefunde(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = pagination;
      
      const query = Ambulanzbefund.find(filters)
        .populate('patientId', 'firstName lastName')
        .populate('locationId', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ [sortBy]: sortOrder })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const [ambefunde, total] = await Promise.all([
        query.exec(),
        Ambulanzbefund.countDocuments(filters)
      ]);
      
      return {
        data: ambefunde,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Fehler beim Laden der Ambulanzbefunde: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Hilfsfunktion: Hole verschachtelten Wert aus Objekt
   */
  static getNestedValue(obj, path) {
    if (!path) return obj;
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  }
  
  /**
   * Hilfsfunktion: Prüfe ob User Admin ist
   */
  static async isAdmin(userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      return user && (user.role === 'admin' || user.role === 'super_admin');
    } catch (error) {
      return false;
    }
  }
}

module.exports = AmbulanzbefundService;

