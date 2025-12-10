const PatientExtended = require('../models/PatientExtended');
const Patient = require('../models/Patient');
const DicomStudy = require('../models/DicomStudy');

/**
 * Radiology Report Parser Service
 * Parst Befunde in verschiedenen Formaten (FHIR, CDA, DICOM SR, PDF/Text)
 */
class RadiologyReportParserService {
  /**
   * Parst FHIR DiagnosticReport
   * @param {Object} fhirReport - FHIR DiagnosticReport Resource
   * @param {String} providerId - ID des Providers
   * @returns {Promise<Object>} Transformiertes Report-Objekt
   */
  async parseFHIR(fhirReport, providerId) {
    try {
      // Extrahiere Patientendaten
      const patientRef = fhirReport.subject?.reference || fhirReport.subject?.id;
      const patientId = patientRef?.replace('Patient/', '');
      
      // Extrahiere Datum
      const reportDate = fhirReport.effectiveDateTime || fhirReport.issued || new Date();
      const issuedDate = fhirReport.issued || new Date();
      
      // Extrahiere Befund-Informationen
      const conclusion = fhirReport.conclusion || fhirReport.conclusionCode?.[0]?.text || '';
      const interpretation = fhirReport.conclusion || '';
      
      // Extrahiere Modality/Code
      const code = fhirReport.code?.coding?.[0] || {};
      const modality = code.code || '';
      const modalityDisplay = code.display || '';
      
      // Extrahiere Study-Referenzen (DICOM)
      const studyInstanceUID = this.extractStudyInstanceUID(fhirReport);
      
      // Extrahiere Befunder
      const performer = fhirReport.performer?.[0] || {};
      const performerName = performer.display || 
                           (performer.reference ? performer.reference.replace('Practitioner/', '') : '');
      
      // Extrahiere Zuweisender Arzt
      const referringPhysician = fhirReport.requester?.display || '';
      
      return {
        providerId: providerId,
        externalId: fhirReport.id,
        reportNumber: fhirReport.identifier?.[0]?.value || fhirReport.id,
        patientId: patientId, // Wird später durch Matching gefunden
        patientData: {
          externalId: patientId,
          // Weitere Patientendaten aus FHIR falls vorhanden
        },
        reportDate: new Date(reportDate),
        issuedDate: new Date(issuedDate),
        modality: modality,
        modalityDisplay: modalityDisplay,
        studyInstanceUID: studyInstanceUID,
        conclusion: conclusion,
        interpretation: interpretation,
        findings: conclusion,
        recommendations: fhirReport.conclusionCode?.[0]?.text || '',
        performer: {
          name: performerName,
          reference: performer.reference
        },
        referringPhysician: referringPhysician,
        status: this.mapFHIRStatus(fhirReport.status),
        rawData: fhirReport,
        format: 'fhir'
      };
    } catch (error) {
      console.error('Error parsing FHIR report:', error);
      throw error;
    }
  }

  /**
   * Parst HL7 CDA Dokument (ELGA-Standard für Bildgebende Diagnostik)
   * @param {String|Object} cdaDocument - CDA XML als String oder geparstes Objekt
   * @param {String} providerId - ID des Providers
   * @returns {Promise<Object>} Transformiertes Report-Objekt
   */
  async parseHL7CDA(cdaDocument, providerId) {
    try {
      // Für CDA benötigen wir einen XML-Parser
      // Hier eine vereinfachte Implementierung
      let cdaXml;
      if (typeof cdaDocument === 'string') {
        cdaXml = cdaDocument;
      } else {
        cdaXml = cdaDocument.xml || JSON.stringify(cdaDocument);
      }

      // Extrahiere grundlegende Informationen aus CDA
      // In Produktion sollte hier ein CDA-Parser verwendet werden
      const patientNameMatch = cdaXml.match(/<patientRole>[\s\S]*?<name>[\s\S]*?<given>(.*?)<\/given>[\s\S]*?<family>(.*?)<\/family>/i);
      const patientIdMatch = cdaXml.match(/<id[^>]*root="([^"]*)"[^>]*extension="([^"]*)"/i);
      const reportDateMatch = cdaXml.match(/<effectiveTime[^>]*value="([^"]*)"/i);
      const conclusionMatch = cdaXml.match(/<text>([\s\S]*?)<\/text>/i);
      
      const reportDate = reportDateMatch ? new Date(reportDateMatch[1]) : new Date();
      const conclusion = conclusionMatch ? conclusionMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      // Extrahiere StudyInstanceUID falls vorhanden
      const studyInstanceUID = this.extractStudyInstanceUIDFromCDA(cdaXml);

      return {
        providerId: providerId,
        externalId: patientIdMatch ? patientIdMatch[2] : null,
        reportNumber: patientIdMatch ? patientIdMatch[2] : null,
        patientData: {
          firstName: patientNameMatch ? patientNameMatch[1] : null,
          lastName: patientNameMatch ? patientNameMatch[2] : null,
          externalId: patientIdMatch ? patientIdMatch[2] : null
        },
        reportDate: reportDate,
        issuedDate: reportDate,
        studyInstanceUID: studyInstanceUID,
        conclusion: conclusion,
        interpretation: conclusion,
        findings: conclusion,
        recommendations: '',
        status: 'final',
        rawData: cdaXml,
        format: 'hl7-cda'
      };
    } catch (error) {
      console.error('Error parsing HL7 CDA:', error);
      throw error;
    }
  }

  /**
   * Parst DICOM SR (Structured Report)
   * @param {Buffer|Object} dicomSr - DICOM SR Datei oder geparstes Objekt
   * @param {String} providerId - ID des Providers
   * @returns {Promise<Object>} Transformiertes Report-Objekt
   */
  async parseDicomSR(dicomSr, providerId) {
    try {
      // Für DICOM SR benötigen wir einen DICOM-Parser
      const dicomParser = require('dicom-parser');
      let dataSet;
      
      if (Buffer.isBuffer(dicomSr)) {
        dataSet = dicomParser.parseDicom(dicomSr);
      } else {
        throw new Error('DICOM SR muss als Buffer übergeben werden');
      }

      // Extrahiere DICOM-Tags
      const getTag = (tag) => {
        try {
          const element = dataSet.elements[tag];
          if (!element) return null;
          return dicomParser.explicitElementToString(dataSet.byteArray, element);
        } catch (error) {
          return null;
        }
      };

      const studyInstanceUID = getTag('0020000D');
      const patientName = getTag('00100010');
      const patientId = getTag('00100020');
      const patientBirthDate = getTag('00100030');
      const reportDate = getTag('00080020');
      const reportTime = getTag('00080030');
      const modality = getTag('00080060');
      
      // DICOM SR spezifische Tags
      const contentSequence = dataSet.elements['0040A730']; // Content Sequence
      const conclusion = this.extractConclusionFromDicomSR(dataSet);

      // Parse Patient Name
      const nameParts = patientName ? patientName.split('^') : [];
      const lastName = nameParts[0] || '';
      const firstName = nameParts[1] || '';

      // Parse Datum
      let reportDateTime = new Date();
      if (reportDate && reportTime) {
        const dateStr = `${reportDate.substring(0, 4)}-${reportDate.substring(4, 6)}-${reportDate.substring(6, 8)}`;
        const timeStr = `${reportTime.substring(0, 2)}:${reportTime.substring(2, 4)}:${reportTime.substring(4, 6)}`;
        reportDateTime = new Date(`${dateStr}T${timeStr}`);
      } else if (reportDate) {
        reportDateTime = new Date(
          reportDate.substring(0, 4),
          parseInt(reportDate.substring(4, 6)) - 1,
          reportDate.substring(6, 8)
        );
      }

      return {
        providerId: providerId,
        externalId: studyInstanceUID,
        reportNumber: studyInstanceUID,
        patientData: {
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: patientBirthDate,
          externalId: patientId
        },
        reportDate: reportDateTime,
        issuedDate: reportDateTime,
        studyInstanceUID: studyInstanceUID,
        modality: modality,
        conclusion: conclusion,
        interpretation: conclusion,
        findings: conclusion,
        recommendations: '',
        status: 'final',
        rawData: {
          studyInstanceUID: studyInstanceUID,
          patientName: patientName,
          patientId: patientId
        },
        format: 'dicom-sr'
      };
    } catch (error) {
      console.error('Error parsing DICOM SR:', error);
      throw error;
    }
  }

  /**
   * Parst PDF oder Text-Befund
   * @param {Buffer|String} content - PDF oder Text-Inhalt
   * @param {Object} metadata - Metadaten (Patient, Datum, etc.)
   * @param {String} providerId - ID des Providers
   * @returns {Promise<Object>} Transformiertes Report-Objekt
   */
  async parsePDFOrText(content, metadata, providerId) {
    try {
      // Für PDF benötigen wir einen PDF-Parser (z.B. pdf-parse)
      let textContent = '';
      
      if (Buffer.isBuffer(content)) {
        // Prüfe ob es PDF ist
        if (content.toString('utf8', 0, 4) === '%PDF') {
          // PDF parsen
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(content);
          textContent = pdfData.text;
        } else {
          // Text
          textContent = content.toString('utf8');
        }
      } else {
        textContent = content;
      }

      return {
        providerId: providerId,
        externalId: metadata.externalId || null,
        reportNumber: metadata.reportNumber || metadata.externalId || null,
        patientData: {
          firstName: metadata.firstName || null,
          lastName: metadata.lastName || null,
          dateOfBirth: metadata.dateOfBirth || null,
          externalId: metadata.patientId || metadata.externalId || null
        },
        reportDate: metadata.reportDate ? new Date(metadata.reportDate) : new Date(),
        issuedDate: metadata.issuedDate ? new Date(metadata.issuedDate) : new Date(),
        studyInstanceUID: metadata.studyInstanceUID || null,
        modality: metadata.modality || null,
        conclusion: textContent.substring(0, 1000), // Erste 1000 Zeichen
        interpretation: textContent,
        findings: textContent,
        recommendations: '',
        status: 'final',
        rawData: {
          content: textContent.substring(0, 5000), // Erste 5000 Zeichen für Speicherung
          mimeType: metadata.mimeType || 'text/plain'
        },
        format: metadata.format || 'text'
      };
    } catch (error) {
      console.error('Error parsing PDF/Text:', error);
      throw error;
    }
  }

  /**
   * Findet Patient basierend auf Matching-Strategie
   * @param {Object} patientData - Patientendaten
   * @param {String} matchingStrategy - Matching-Strategie
   * @returns {Promise<Object|null>} Patient oder null
   */
  async findPatient(patientData, matchingStrategy = 'name-dob') {
    try {
      const { firstName, lastName, dateOfBirth, externalId, insuranceNumber, socialSecurityNumber } = patientData;

      switch (matchingStrategy) {
        case 'name-dob':
          if (firstName && lastName && dateOfBirth) {
            const birthDate = dateOfBirth instanceof Date 
              ? dateOfBirth 
              : new Date(dateOfBirth);
            
            let patient = await PatientExtended.findOne({
              firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
              dateOfBirth: birthDate
            });
            
            if (!patient) {
              patient = await Patient.findOne({
                firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
                lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
                dateOfBirth: birthDate
              });
            }
            
            return patient;
          }
          break;

        case 'patient-id':
          if (externalId || insuranceNumber || socialSecurityNumber) {
            let patient = await PatientExtended.findOne({
              $or: [
                { insuranceNumber: externalId || insuranceNumber },
                { socialSecurityNumber: socialSecurityNumber || externalId },
                { 'metadata.externalId': externalId }
              ]
            });
            
            if (!patient) {
              patient = await Patient.findOne({
                $or: [
                  { insuranceNumber: externalId || insuranceNumber },
                  { socialSecurityNumber: socialSecurityNumber || externalId }
                ]
              });
            }
            
            return patient;
          }
          break;

        case 'multiple':
          // Versuche mehrere Strategien
          if (firstName && lastName && dateOfBirth) {
            const patient = await this.findPatient(patientData, 'name-dob');
            if (patient) return patient;
          }
          
          if (externalId || insuranceNumber || socialSecurityNumber) {
            const patient = await this.findPatient(patientData, 'patient-id');
            if (patient) return patient;
          }
          break;
      }

      return null;
    } catch (error) {
      console.error('Error finding patient:', error);
      throw error;
    }
  }

  /**
   * Findet DICOM-Studie basierend auf StudyInstanceUID
   * @param {String} studyInstanceUID - Study Instance UID
   * @returns {Promise<Object|null>} DicomStudy oder null
   */
  async findDicomStudy(studyInstanceUID) {
    try {
      if (!studyInstanceUID) return null;
      
      return await DicomStudy.findOne({ studyInstanceUID });
    } catch (error) {
      console.error('Error finding DICOM study:', error);
      return null;
    }
  }

  // Hilfsmethoden
  extractStudyInstanceUID(fhirReport) {
    // Suche nach StudyInstanceUID in verschiedenen FHIR-Feldern
    if (fhirReport.imagingStudy) {
      const studyRef = Array.isArray(fhirReport.imagingStudy) 
        ? fhirReport.imagingStudy[0] 
        : fhirReport.imagingStudy;
      return studyRef?.reference?.replace('ImagingStudy/', '') || 
             studyRef?.identifier?.value;
    }
    
    // Suche in Identifier
    if (fhirReport.identifier) {
      const studyId = fhirReport.identifier.find(id => 
        id.system?.includes('dicom') || 
        id.type?.coding?.[0]?.code === 'DICOM'
      );
      return studyId?.value;
    }
    
    return null;
  }

  extractStudyInstanceUIDFromCDA(cdaXml) {
    // Suche nach StudyInstanceUID in CDA XML
    const match = cdaXml.match(/<id[^>]*root="([^"]*)"[^>]*extension="([^"]*)"[^>]*assigningAuthorityName="DICOM"/i);
    return match ? match[2] : null;
  }

  extractConclusionFromDicomSR(dataSet) {
    // Vereinfachte Extraktion aus DICOM SR
    // In Produktion sollte hier ein vollständiger SR-Parser verwendet werden
    try {
      // Suche nach Text-Content in SR
      const textValue = this.getDicomTagValue(dataSet, '0040A160'); // Text Value
      return textValue || 'Befund aus DICOM SR';
    } catch (error) {
      return 'Befund aus DICOM SR';
    }
  }

  getDicomTagValue(dataSet, tag) {
    try {
      const dicomParser = require('dicom-parser');
      const element = dataSet.elements[tag];
      if (!element) return null;
      return dicomParser.explicitElementToString(dataSet.byteArray, element);
    } catch (error) {
      return null;
    }
  }

  mapFHIRStatus(status) {
    const statusMap = {
      'registered': 'draft',
      'preliminary': 'under_review',
      'final': 'ready',
      'amended': 'ready',
      'corrected': 'ready',
      'cancelled': 'withdrawn',
      'entered-in-error': 'withdrawn',
      'unknown': 'draft'
    };
    return statusMap[status?.toLowerCase()] || 'draft';
  }
}

module.exports = new RadiologyReportParserService();












