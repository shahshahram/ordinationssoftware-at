const XdsDocumentEntry = require('../models/XdsDocumentEntry');
const XdsSubmissionSet = require('../models/XdsSubmissionSet');
const XdsFolder = require('../models/XdsFolder');
const XdsAssociation = require('../models/XdsAssociation');
const Location = require('../models/Location');
const XdsFileRepository = require('./XdsFileRepository');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * XDS Registry Service
 * Implementiert die XDS-Registry-Funktionalität gemäß IHE ITI TF-3
 */
class XdsRegistryService {
  /**
   * Prüft Berechtigung für XDS-Operation
   * @param {Object} location - Location Objekt mit xdsRegistry
   * @param {String} operation - create, update, deprecate, delete, retrieve, query
   * @param {String} userRole - Benutzer-Rolle
   * @returns {Boolean}
   */
  static checkPermission(location, operation, userRole) {
    if (!location || !location.xdsRegistry || !location.xdsRegistry.enabled) {
      console.log(`[XDS Permission Check] Location oder XDS Registry nicht aktiviert`);
      return false;
    }
    
    // Default-Berechtigungen falls nicht konfiguriert
    const defaultPermissions = {
      create: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
      update: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
      deprecate: { roles: ['admin', 'super_admin'] },
      delete: { roles: ['admin', 'super_admin'] },
      retrieve: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] },
      query: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] }
    };
    
    const permissions = location.xdsRegistry.permissions || {};
    const operationPermissions = permissions[operation];
    
    // Verwende konfigurierte Berechtigungen oder Fallback auf Defaults
    const allowedRoles = operationPermissions?.roles || defaultPermissions[operation]?.roles || [];
    
    console.log(`[XDS Permission Check] Operation: ${operation}, UserRole: ${userRole}, AllowedRoles: ${JSON.stringify(allowedRoles)}`);
    
    const hasPermission = allowedRoles.includes(userRole);
    console.log(`[XDS Permission Check] Result: ${hasPermission}`);
    
    return hasPermission;
  }
  
  /**
   * Registriert ein neues Dokument in der Registry
   * @param {String} locationId - Standort ID
   * @param {Buffer} fileBuffer - Datei-Inhalt
   * @param {Object} documentMetadata - Dokument-Metadaten
   * @param {Object} user - Benutzer-Objekt
   * @returns {Promise<Object>} - DocumentEntry
   */
  static async registerDocument(locationId, fileBuffer, documentMetadata, user) {
    // Lade Standort
    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error('Standort nicht gefunden');
    }
    
    // Prüfe Berechtigung
    if (!this.checkPermission(location, 'create', user.role)) {
      throw new Error('Keine Berechtigung zum Erstellen von Dokumenten');
    }
    
    // Speichere Dokument im Repository
    // Verwende explizit angegebenen MIME-Type oder Content-Type, sonst Fallback
    const mimeType = documentMetadata.mimeType || documentMetadata.contentType || 'application/pdf';
    
    const fileInfo = await XdsFileRepository.storeDocument(locationId, fileBuffer, {
      mimeType: mimeType,
      originalName: documentMetadata.title || 'document.pdf',
      uploadedBy: user._id.toString()
    });
    
    // Erstelle DocumentEntry
    const documentEntry = new XdsDocumentEntry({
      uniqueId: uuidv4(),
      locationId: location._id,
      patientId: documentMetadata.patientId || '',
      title: documentMetadata.title || 'Dokument',
      comments: documentMetadata.comments || '',
      classCode: documentMetadata.classCode || {},
      typeCode: documentMetadata.typeCode || [],
      formatCode: documentMetadata.formatCode || { code: 'urn:ihe:iti:xds:2017:mimeTypeSufficient' },
      healthcareFacilityTypeCode: documentMetadata.healthcareFacilityTypeCode || {},
      practiceSettingCode: documentMetadata.practiceSettingCode || {},
      confidentialityCode: documentMetadata.confidentialityCode || [],
      author: documentMetadata.author || [],
      repositoryUniqueId: location.xdsRegistry.repositoryUniqueId || location._id.toString(),
      repositoryLocation: fileInfo.filePath,
      fileReference: fileInfo.fileReference,
      size: fileInfo.size,
      mimeType: mimeType, // Verwende den angegebenen MIME-Type statt den aus fileInfo
      hash: fileInfo.hash,
      languageCode: documentMetadata.languageCode || 'de-AT',
      source: documentMetadata.source || 'internal',
      availabilityStatus: 'Approved', // Explizit setzen für Sichtbarkeit
      submittedBy: {
        userId: user._id,
        userName: user.email || user.name,
        userRole: user.role
      },
      serviceStartTime: documentMetadata.serviceStartTime,
      serviceStopTime: documentMetadata.serviceStopTime,
      creationTime: documentMetadata.creationTime || new Date() // Explizit setzen
    });
    
    await documentEntry.save();
    
    logger.info(`XDS DocumentEntry erstellt: ${documentEntry._id}, title="${documentEntry.title}", source="${documentEntry.source}", availabilityStatus="${documentEntry.availabilityStatus}", locationId="${documentEntry.locationId}"`);
    
    return documentEntry;
  }
  
  /**
   * Abfrage von Dokumenten (Query)
   * @param {String} locationId - Standort ID
   * @param {Object} queryParams - Query-Parameter
   * @param {Object} user - Benutzer-Objekt
   * @returns {Promise<Array>} - Array von DocumentEntries
   */
  static async queryDocuments(locationId, queryParams, user) {
    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error('Standort nicht gefunden');
    }
    
    if (!this.checkPermission(location, 'query', user.role)) {
      throw new Error('Keine Berechtigung zum Abfragen von Dokumenten');
    }
    
    // Baue Query
    const query = {
      locationId: location._id,
      availabilityStatus: { $ne: 'Deprecated' }
    };
    
    if (queryParams.patientId) {
      query.patientId = queryParams.patientId;
    }
    
    if (queryParams.classCode) {
      query['classCode.code'] = queryParams.classCode;
    }
    
    if (queryParams.typeCode) {
      query['typeCode.code'] = queryParams.typeCode;
    }
    
    if (queryParams.formatCode) {
      query['formatCode.code'] = queryParams.formatCode;
    }
    
    if (queryParams.source) {
      query.source = queryParams.source;
    }
    
    if (queryParams.title) {
      query.title = { $regex: queryParams.title, $options: 'i' };
    }
    
    if (queryParams.dateFrom || queryParams.dateTo) {
      query.creationTime = {};
      if (queryParams.dateFrom) {
        query.creationTime.$gte = new Date(queryParams.dateFrom);
      }
      if (queryParams.dateTo) {
        query.creationTime.$lte = new Date(queryParams.dateTo);
      }
    }
    
    // Führe Query aus
    const documents = await XdsDocumentEntry.find(query)
      .sort({ creationTime: -1 })
      .limit(queryParams.limit || 100)
      .skip(queryParams.skip || 0)
      .lean();
    
    return documents;
  }
  
  /**
   * Ruft ein Dokument ab (Retrieve)
   * @param {String} locationId - Standort ID
   * @param {String} documentId - DocumentEntry ID oder entryUUID
   * @param {Object} user - Benutzer-Objekt
   * @returns {Promise<Object>} - { documentEntry, fileData }
   */
  static async retrieveDocument(locationId, documentId, user) {
    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error('Standort nicht gefunden');
    }
    
    if (!this.checkPermission(location, 'retrieve', user.role)) {
      throw new Error('Keine Berechtigung zum Abrufen von Dokumenten');
    }
    
    // Finde DocumentEntry
    const documentEntry = await XdsDocumentEntry.findOne({
      $or: [
        { _id: documentId },
        { entryUUID: documentId },
        { uniqueId: documentId }
      ],
      locationId: location._id
    });
    
    if (!documentEntry) {
      throw new Error('Dokument nicht gefunden');
    }
    
    if (documentEntry.availabilityStatus === 'Deprecated') {
      throw new Error('Dokument ist deprecated');
    }
    
    // Lade Datei aus Repository
    const fileData = await XdsFileRepository.retrieveDocument(
      locationId,
      documentEntry.fileReference
    );
    
    return {
      documentEntry,
      fileData
    };
  }
  
  /**
   * Aktualisiert ein Dokument
   * @param {String} locationId - Standort ID
   * @param {String} documentId - DocumentEntry ID
   * @param {Buffer} newFileBuffer - Neuer Datei-Inhalt
   * @param {Object} updateMetadata - Zu aktualisierende Metadaten
   * @param {Object} user - Benutzer-Objekt
   * @returns {Promise<Object>} - Neuer DocumentEntry
   */
  static async updateDocument(locationId, documentId, newFileBuffer, updateMetadata, user) {
    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error('Standort nicht gefunden');
    }
    
    if (!this.checkPermission(location, 'update', user.role)) {
      throw new Error('Keine Berechtigung zum Aktualisieren von Dokumenten');
    }
    
    // Finde altes Dokument
    const oldDocument = await XdsDocumentEntry.findOne({
      $or: [{ _id: documentId }, { entryUUID: documentId }],
      locationId: location._id
    });
    
    if (!oldDocument) {
      throw new Error('Dokument nicht gefunden');
    }
    
    // Speichere neue Version im Repository
    const newFileInfo = await XdsFileRepository.updateDocument(
      locationId,
      oldDocument.fileReference,
      newFileBuffer,
      {
        mimeType: updateMetadata.mimeType || oldDocument.mimeType,
        previousVersion: oldDocument.fileReference
      }
    );
    
    // Erstelle neue DocumentEntry (Version)
    const newDocument = new XdsDocumentEntry({
      uniqueId: uuidv4(),
      locationId: location._id,
      patientId: oldDocument.patientId,
      title: updateMetadata.title || oldDocument.title,
      comments: updateMetadata.comments || oldDocument.comments,
      classCode: updateMetadata.classCode || oldDocument.classCode,
      typeCode: updateMetadata.typeCode || oldDocument.typeCode,
      formatCode: updateMetadata.formatCode || oldDocument.formatCode,
      repositoryUniqueId: oldDocument.repositoryUniqueId,
      repositoryLocation: newFileInfo.filePath,
      fileReference: newFileInfo.fileReference,
      size: newFileInfo.size,
      mimeType: newFileInfo.mimeType,
      hash: newFileInfo.hash,
      source: oldDocument.source,
      submittedBy: {
        userId: user._id,
        userName: user.email || user.name,
        userRole: user.role
      },
      version: {
        majorVersion: oldDocument.version.majorVersion + 1,
        minorVersion: 0
      }
    });
    
    await newDocument.save();
    
    // Erstelle Association (RPLC - Replaces)
    const association = new XdsAssociation({
      associationType: 'RPLC',
      sourceObject: newDocument._id,
      sourceObjectType: 'XdsDocumentEntry',
      targetObject: oldDocument._id,
      targetObjectType: 'XdsDocumentEntry',
      locationId: location._id,
      createdBy: {
        userId: user._id,
        userName: user.email || user.name
      }
    });
    
    await association.save();
    
    // Deprecated altes Dokument
    await this.deprecateDocument(locationId, oldDocument._id.toString(), user, 'Ersetzt durch neue Version');
    
    return newDocument;
  }
  
  /**
   * Markiert ein Dokument als deprecated
   * @param {String} locationId - Standort ID
   * @param {String} documentId - DocumentEntry ID
   * @param {Object} user - Benutzer-Objekt
   * @param {String} reason - Grund für Deprecate
   * @returns {Promise<Object>} - Aktualisiertes DocumentEntry
   */
  static async deprecateDocument(locationId, documentId, user, reason = '') {
    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error('Standort nicht gefunden');
    }
    
    if (!this.checkPermission(location, 'deprecate', user.role)) {
      throw new Error('Keine Berechtigung zum Deprecaten von Dokumenten');
    }
    
    const document = await XdsDocumentEntry.findOne({
      $or: [{ _id: documentId }, { entryUUID: documentId }],
      locationId: location._id
    });
    
    if (!document) {
      throw new Error('Dokument nicht gefunden');
    }
    
    document.availabilityStatus = 'Deprecated';
    document.deprecatedAt = new Date();
    document.deprecatedBy = {
      userId: user._id,
      userName: user.email || user.name
    };
    document.deprecatedReason = reason;
    
    await document.save();
    
    // Deprecated auch im Repository
    await XdsFileRepository.deprecateDocument(locationId, document.fileReference);
    
    return document;
  }
  
  /**
   * Löscht ein Dokument (physisch)
   * @param {String} locationId - Standort ID
   * @param {String} documentId - DocumentEntry ID
   * @param {Object} user - Benutzer-Objekt
   * @param {Boolean} force - Erzwingt Löschung
   * @returns {Promise<void>}
   */
  static async deleteDocument(locationId, documentId, user, force = false) {
    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error('Standort nicht gefunden');
    }
    
    if (!this.checkPermission(location, 'delete', user.role)) {
      throw new Error('Keine Berechtigung zum Löschen von Dokumenten');
    }
    
    const document = await XdsDocumentEntry.findOne({
      $or: [{ _id: documentId }, { entryUUID: documentId }],
      locationId: location._id
    });
    
    if (!document) {
      throw new Error('Dokument nicht gefunden');
    }
    
    // Lösche aus Repository
    await XdsFileRepository.deleteDocument(locationId, document.fileReference, force);
    
    // Lösche DocumentEntry
    await XdsDocumentEntry.findByIdAndDelete(document._id);
    
    // Lösche zugehörige Associations
    await XdsAssociation.deleteMany({
      $or: [
        { sourceObject: document._id },
        { targetObject: document._id }
      ]
    });
  }
}

module.exports = XdsRegistryService;

