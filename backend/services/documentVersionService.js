const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const { incrementMinorVersion, calculateChanges, calculateDocumentHash } = require('../utils/documentHelpers');

/**
 * Service für Dokument-Versionierung
 */
class DocumentVersionService {
  /**
   * Erstellt eine neue Version eines freigegebenen Dokuments
   * @param {string} documentId - ID des Dokuments
   * @param {object} updates - Zu aktualisierende Felder
   * @param {object} user - Benutzer der die Änderung vornimmt
   * @param {object} options - Zusätzliche Optionen (changeReason, ipAddress, userAgent)
   * @returns {Promise<Document>} Aktualisiertes Dokument
   */
  async createNewVersion(documentId, updates, user, options = {}) {
    const oldDocument = await Document.findById(documentId);
    
    if (!oldDocument) {
      throw new Error('Dokument nicht gefunden');
    }

    // Prüfe ob eine neue Version erforderlich ist
    if (!oldDocument.requiresNewVersion()) {
      // Dokument kann direkt bearbeitet werden
      return this.updateDocument(documentId, updates, user, options);
    }

    // Alte Version als Snapshot speichern (wenn bereits eine Version existiert)
    let oldVersion = null;
    if (oldDocument.currentVersion && oldDocument.currentVersion.versionId) {
      // Bestehende Version aktualisieren (Status auf released setzen falls nötig)
      oldVersion = await DocumentVersion.findById(oldDocument.currentVersion.versionId);
      if (oldVersion && oldVersion.versionStatus !== 'released' && oldDocument.status === 'released') {
        oldVersion.versionStatus = 'released';
        oldVersion.releasedAt = oldDocument.currentVersion.releasedAt;
        oldVersion.releasedBy = oldDocument.currentVersion.releasedBy;
        await oldVersion.save();
      }
    } else {
      // Erstelle erste Version-Snapshot
      oldVersion = await DocumentVersion.createFromDocument(oldDocument, {
        versionNumber: oldDocument.currentVersion.versionNumber,
        versionStatus: oldDocument.status === 'released' ? 'released' : oldDocument.status,
        createdBy: oldDocument.createdBy,
        changeReason: 'Version archiviert vor Erstellung neuer Version'
      });
      await oldVersion.save();
    }

    // Neue Version-Nummer bestimmen (minor increment)
    const newVersionNumber = incrementMinorVersion(oldDocument.currentVersion.versionNumber);

    // Änderungen berechnen
    const changes = calculateChanges(oldDocument.toObject(), { ...oldDocument.toObject(), ...updates });

    // Hauptdokument aktualisieren
    Object.assign(oldDocument, updates);
    
    oldDocument.currentVersion = {
      versionNumber: newVersionNumber,
      versionId: null, // Wird nach Version-Erstellung gesetzt
      releasedAt: null,
      releasedBy: null
    };
    
    oldDocument.status = 'draft'; // Zurück zu DRAFT
    oldDocument.isReleased = false;
    oldDocument.releasedVersion = null;
    oldDocument.lastModifiedBy = user._id;

    // Neue Version-Snapshot erstellen
    const newVersion = await DocumentVersion.createFromDocument(oldDocument, {
      versionNumber: newVersionNumber,
      versionStatus: 'draft',
      changeReason: options.changeReason || 'Neue Version nach Freigabe',
      changesFromPreviousVersion: {
        summary: `Neue Version ${newVersionNumber} erstellt`,
        fieldsChanged: changes.modified.map(c => c.field),
        diffData: changes
      },
      createdBy: user._id,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    await newVersion.save();

    // Version-ID im Dokument speichern
    oldDocument.currentVersion.versionId = newVersion._id;

    // Versions-Historie aktualisieren (nur wenn oldVersion existiert)
    if (oldVersion) {
      oldDocument.versionHistory.push({
        versionNumber: oldVersion.versionNumber,
        versionId: oldVersion._id,
        status: oldVersion.versionStatus,
        createdAt: oldVersion.createdAt,
        createdBy: oldVersion.createdBy
      });
    }

    await oldDocument.save();

    // Audit Trail
    oldDocument.addAuditEntry('version_created', user._id, {
      oldVersion: oldVersion?.versionNumber || 'N/A',
      newVersion: newVersionNumber,
      reason: options.changeReason
    }, `Neue Version ${newVersionNumber} erstellt`);

    await oldDocument.save();

    return oldDocument;
  }

  /**
   * Aktualisiert ein DRAFT-Dokument (ohne neue Version)
   * @param {string} documentId - ID des Dokuments
   * @param {object} updates - Zu aktualisierende Felder
   * @param {object} user - Benutzer
   * @param {object} options - Zusätzliche Optionen (expectedVersion für Optimistic Locking)
   * @returns {Promise<Document>} Aktualisiertes Dokument
   */
  async updateDocument(documentId, updates, user, options = {}) {
    const document = await Document.findById(documentId);
    
    if (!document) {
      throw new Error('Dokument nicht gefunden');
    }

    if (!document.canBeEdited()) {
      throw new Error('Dokument kann nicht bearbeitet werden. Status: ' + document.status);
    }

    // Optimistic Locking: Prüfe Version wenn erwartete Version übergeben wurde
    if (options.expectedVersion !== undefined) {
      if (!document.isVersionValid(options.expectedVersion)) {
        const error = new Error('Dokument wurde von einem anderen Benutzer geändert. Bitte laden Sie die Seite neu.');
        error.code = 'OPTIMISTIC_LOCK_CONFLICT';
        error.currentVersion = document.getLockVersion();
        error.lastModifiedBy = document.lastModifiedBy;
        error.lastModifiedAt = document.lastModifiedAt;
        throw error;
      }
    }

    // Für medizinische Dokumente: Optional Version-Snapshot für DRAFT
    if (document.documentClass === 'static_medical' && document.status === 'draft') {
      // Optional: Version-Snapshot für Nachvollziehbarkeit
      // Kann später aktiviert werden wenn gewünscht
    }

    // Dokument aktualisieren
    Object.assign(document, updates);
    document.lastModifiedBy = user._id;

    // Aktuelle Version aktualisieren (falls vorhanden)
    if (document.currentVersion && document.currentVersion.versionId) {
      const currentVersion = await DocumentVersion.findById(document.currentVersion.versionId);
      if (currentVersion && currentVersion.versionStatus === 'draft') {
        // Version-Snapshot aktualisieren
        const updatedVersion = await DocumentVersion.createFromDocument(document, {
          versionNumber: document.currentVersion.versionNumber,
          versionStatus: 'draft',
          createdBy: currentVersion.createdBy,
          changeReason: 'Draft aktualisiert'
        });
        
        // Alte Version löschen (nur bei DRAFT)
        await DocumentVersion.findByIdAndDelete(currentVersion._id);
        
        // Neue Version speichern
        await updatedVersion.save();
        document.currentVersion.versionId = updatedVersion._id;
      }
    }

    await document.save();

    // Audit Trail
    document.addAuditEntry('document_updated', user._id, updates, options.reason || 'Dokument aktualisiert');

    await document.save();

    return document;
  }

  /**
   * Gibt ein Dokument frei (RELEASED)
   * @param {string} documentId - ID des Dokuments
   * @param {object} user - Benutzer der freigibt
   * @param {string} comment - Freigabe-Kommentar
   * @returns {Promise<Document>} Freigegebenes Dokument
   */
  async releaseDocument(documentId, user, comment = '') {
    const document = await Document.findById(documentId);
    
    if (!document) {
      throw new Error('Dokument nicht gefunden');
    }

    if (document.status !== 'under_review' && document.status !== 'draft') {
      throw new Error(`Dokument muss in Status 'under_review' oder 'draft' sein. Aktuell: ${document.status}`);
    }

    // Aktuelle Version als RELEASED markieren
    let currentVersion = null;
    if (document.currentVersion && document.currentVersion.versionId) {
      currentVersion = await DocumentVersion.findById(document.currentVersion.versionId);
      
      if (currentVersion) {
        currentVersion.versionStatus = 'released';
        currentVersion.releasedAt = new Date();
        currentVersion.releasedBy = user._id;
        currentVersion.releaseComment = comment;
        await currentVersion.save();
      }
    } else {
      // Erstelle erste Version wenn noch keine existiert
      currentVersion = await DocumentVersion.createFromDocument(document, {
        versionNumber: document.currentVersion?.versionNumber || '1.0.0',
        versionStatus: 'released',
        createdBy: document.createdBy,
        changeReason: 'Erste Version freigegeben'
      });
      
      currentVersion.releasedAt = new Date();
      currentVersion.releasedBy = user._id;
      currentVersion.releaseComment = comment;
      await currentVersion.save();
      
      document.currentVersion.versionId = currentVersion._id;
    }

    // Hauptdokument aktualisieren
    document.status = 'released';
    document.isReleased = true;
    document.releasedVersion = document.currentVersion.versionNumber;
    document.currentVersion.releasedAt = new Date();
    document.currentVersion.releasedBy = user._id;

    // Versions-Historie aktualisieren
    document.versionHistory.push({
      versionNumber: document.currentVersion.versionNumber,
      versionId: currentVersion._id,
      status: 'released',
      createdAt: new Date(),
      createdBy: user._id
    });

    await document.save();

    // Audit Trail
    document.addAuditEntry('document_released', user._id, {
      version: document.currentVersion.versionNumber,
      comment
    }, `Dokument Version ${document.currentVersion.versionNumber} freigegeben`);

    await document.save();

    return document;
  }

  /**
   * Reicht ein Dokument zur Prüfung ein (DRAFT → UNDER_REVIEW)
   * @param {string} documentId - ID des Dokuments
   * @param {object} user - Benutzer
   * @returns {Promise<Document>} Dokument
   */
  async submitForReview(documentId, user) {
    const document = await Document.findById(documentId);
    
    if (!document) {
      throw new Error('Dokument nicht gefunden');
    }

    if (document.status !== 'draft') {
      throw new Error(`Dokument muss in Status 'draft' sein. Aktuell: ${document.status}`);
    }

    // Erstelle Version-Snapshot wenn noch keine existiert
    if (!document.currentVersion || !document.currentVersion.versionId) {
      const version = await DocumentVersion.createFromDocument(document, {
        versionNumber: document.currentVersion?.versionNumber || '1.0.0',
        versionStatus: 'under_review',
        createdBy: document.createdBy,
        changeReason: 'Zur Prüfung eingereicht'
      });
      
      await version.save();
      document.currentVersion.versionId = version._id;
    } else {
      // Aktualisiere Version-Status
      const version = await DocumentVersion.findById(document.currentVersion.versionId);
      if (version) {
        version.versionStatus = 'under_review';
        await version.save();
      }
    }

    document.status = 'under_review';
    await document.save();

    // Audit Trail
    document.addAuditEntry('submitted_for_review', user._id, {}, 'Dokument zur Prüfung eingereicht');
    await document.save();

    return document;
  }

  /**
   * Zieht ein Dokument zurück (WITHDRAWN)
   * @param {string} documentId - ID des Dokuments
   * @param {object} user - Benutzer
   * @param {string} reason - Rückzugs-Grund (Pflicht)
   * @returns {Promise<Document>} Dokument
   */
  async withdrawDocument(documentId, user, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rückzugs-Grund ist erforderlich');
    }

    const document = await Document.findById(documentId);
    
    if (!document) {
      throw new Error('Dokument nicht gefunden');
    }

    if (document.status === 'withdrawn') {
      throw new Error('Dokument ist bereits zurückgezogen');
    }

    // Aktuelle Version als WITHDRAWN markieren
    if (document.currentVersion && document.currentVersion.versionId) {
      const version = await DocumentVersion.findById(document.currentVersion.versionId);
      if (version) {
        version.versionStatus = 'withdrawn';
        version.withdrawnAt = new Date();
        version.withdrawnBy = user._id;
        version.withdrawalReason = reason;
        await version.save();
      }
    }

    document.status = 'withdrawn';
    await document.save();

    // Audit Trail
    document.addAuditEntry('document_withdrawn', user._id, { reason }, `Dokument zurückgezogen: ${reason}`);
    await document.save();

    return document;
  }

  /**
   * Holt alle Versionen eines Dokuments
   * @param {string} documentId - ID des Dokuments
   * @param {object} options - Optionen (limit, sort)
   * @returns {Promise<Array>} Liste der Versionen
   */
  async getDocumentVersions(documentId, options = {}) {
    return DocumentVersion.findByDocumentId(documentId, options);
  }

  /**
   * Holt eine spezifische Version
   * @param {string} documentId - ID des Dokuments
   * @param {string} versionNumber - Versionsnummer (z.B. "1.0.0")
   * @returns {Promise<DocumentVersion>} Version
   */
  async getDocumentVersion(documentId, versionNumber) {
    return DocumentVersion.findByVersionNumber(documentId, versionNumber);
  }

  /**
   * Vergleicht zwei Versionen
   * @param {string} documentId - ID des Dokuments
   * @param {string} version1 - Erste Versionsnummer
   * @param {string} version2 - Zweite Versionsnummer
   * @returns {Promise<object>} Vergleichs-Ergebnis
   */
  async compareVersions(documentId, version1, version2) {
    const v1 = await DocumentVersion.findByVersionNumber(documentId, version1);
    const v2 = await DocumentVersion.findByVersionNumber(documentId, version2);

    if (!v1 || !v2) {
      throw new Error('Eine oder beide Versionen nicht gefunden');
    }

    const changes = calculateChanges(v1.documentSnapshot, v2.documentSnapshot);

    return {
      version1: {
        versionNumber: v1.versionNumber,
        createdAt: v1.createdAt,
        createdBy: v1.createdBy,
        status: v1.versionStatus
      },
      version2: {
        versionNumber: v2.versionNumber,
        createdAt: v2.createdAt,
        createdBy: v2.createdBy,
        status: v2.versionStatus
      },
      changes
    };
  }
}

module.exports = new DocumentVersionService();

