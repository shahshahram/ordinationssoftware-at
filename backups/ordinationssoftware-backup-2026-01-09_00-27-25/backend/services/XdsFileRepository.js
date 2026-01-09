const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Location = require('../models/Location');

/**
 * XDS File Repository Service
 * Verwaltet die physische Speicherung von Dokumenten
 */
class XdsFileRepository {
  /**
   * Initialisiert das Repository für einen Standort
   * @param {String} locationId - Standort ID
   * @returns {Promise<String>} - Repository Base Path
   */
  static async initializeRepository(locationId) {
    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error('Standort nicht gefunden');
    }
    
    if (!location.xdsRegistry || !location.xdsRegistry.enabled) {
      throw new Error('XDS Registry für diesen Standort nicht aktiviert');
    }
    
    const repoLocation = location.xdsRegistry.repositoryLocation || 
      path.join(process.cwd(), 'xds-repository', locationId.toString());
    
    // Erstelle Repository-Verzeichnis falls nicht vorhanden
    try {
      await fs.mkdir(repoLocation, { recursive: true });
      
      // Erstelle Unterverzeichnisse
      await fs.mkdir(path.join(repoLocation, 'documents'), { recursive: true });
      await fs.mkdir(path.join(repoLocation, 'metadata'), { recursive: true });
      await fs.mkdir(path.join(repoLocation, 'temp'), { recursive: true });
      
      // Aktualisiere Location mit vollständigem Pfad
      if (!location.xdsRegistry.repositoryLocation) {
        location.xdsRegistry.repositoryLocation = repoLocation;
        await location.save();
      }
      
      return repoLocation;
    } catch (error) {
      throw new Error(`Fehler beim Initialisieren des Repository: ${error.message}`);
    }
  }
  
  /**
   * Speichert ein Dokument im Repository
   * @param {String} locationId - Standort ID
   * @param {Buffer} fileBuffer - Datei-Inhalt
   * @param {Object} metadata - Metadaten (mimeType, originalName, etc.)
   * @returns {Promise<Object>} - { fileReference, filePath, hash, size }
   */
  static async storeDocument(locationId, fileBuffer, metadata = {}) {
    const repoPath = await this.initializeRepository(locationId);
    const documentsPath = path.join(repoPath, 'documents');
    
    // Generiere eindeutigen Dateinamen
    const fileId = uuidv4();
    const extension = this.getExtensionFromMimeType(metadata.mimeType || 'application/pdf');
    const fileName = `${fileId}${extension}`;
    const filePath = path.join(documentsPath, fileName);
    
    // Speichere Datei
    await fs.writeFile(filePath, fileBuffer);
    
    // Berechne Hash
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Speichere Metadaten
    const metadataPath = path.join(repoPath, 'metadata', `${fileId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify({
      fileId,
      fileName,
      originalName: metadata.originalName || fileName,
      mimeType: metadata.mimeType || 'application/pdf',
      size: fileBuffer.length,
      hash,
      createdAt: new Date().toISOString(),
      uploadedBy: metadata.uploadedBy || null
    }, null, 2));
    
    return {
      fileReference: fileId,
      filePath,
      relativePath: `documents/${fileName}`,
      hash,
      size: fileBuffer.length,
      mimeType: metadata.mimeType || 'application/pdf'
    };
  }
  
  /**
   * Lädt ein Dokument aus dem Repository
   * @param {String} locationId - Standort ID
   * @param {String} fileReference - File Reference (fileId)
   * @returns {Promise<Buffer>} - Datei-Inhalt
   */
  static async retrieveDocument(locationId, fileReference) {
    const location = await Location.findById(locationId);
    if (!location || !location.xdsRegistry || !location.xdsRegistry.enabled) {
      throw new Error('XDS Repository nicht verfügbar');
    }
    
    const repoPath = location.xdsRegistry.repositoryLocation || 
      path.join(process.cwd(), 'xds-repository', locationId.toString());
    
    const metadataPath = path.join(repoPath, 'metadata', `${fileReference}.json`);
    
    // Lade Metadaten
    let metadata;
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      throw new Error('Dokument-Metadaten nicht gefunden');
    }
    
    // Lade Dokument
    const filePath = path.join(repoPath, 'documents', metadata.fileName);
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      // Verifiziere Hash (optional, kann deaktiviert werden für Performance)
      const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      if (calculatedHash !== metadata.hash) {
        throw new Error('Dokument-Integrität verletzt: Hash stimmt nicht überein');
      }
      
      return {
        buffer: fileBuffer,
        metadata
      };
    } catch (error) {
      throw new Error(`Fehler beim Laden des Dokuments: ${error.message}`);
    }
  }
  
  /**
   * Aktualisiert ein Dokument (deprecated = markiert als veraltet, aber behält alte Version)
   * @param {String} locationId - Standort ID
   * @param {String} fileReference - File Reference
   * @param {Buffer} newFileBuffer - Neuer Datei-Inhalt
   * @param {Object} metadata - Metadaten
   * @returns {Promise<Object>} - Neue File Reference Info
   */
  static async updateDocument(locationId, fileReference, newFileBuffer, metadata = {}) {
    // Für Update: Neue Version erstellen, alte Version behalten
    return await this.storeDocument(locationId, newFileBuffer, {
      ...metadata,
      previousVersion: fileReference
    });
  }
  
  /**
   * Markiert ein Dokument als deprecated (löscht nicht, markiert nur)
   * @param {String} locationId - Standort ID
   * @param {String} fileReference - File Reference
   * @returns {Promise<void>}
   */
  static async deprecateDocument(locationId, fileReference) {
    const location = await Location.findById(locationId);
    if (!location || !location.xdsRegistry || !location.xdsRegistry.enabled) {
      throw new Error('XDS Repository nicht verfügbar');
    }
    
    const repoPath = location.xdsRegistry.repositoryLocation || 
      path.join(process.cwd(), 'xds-repository', locationId.toString());
    
    const metadataPath = path.join(repoPath, 'metadata', `${fileReference}.json`);
    
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      metadata.deprecated = true;
      metadata.deprecatedAt = new Date().toISOString();
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      throw new Error(`Fehler beim Deprecate: ${error.message}`);
    }
  }
  
  /**
   * Löscht ein Dokument physisch (nur wenn wirklich nötig)
   * @param {String} locationId - Standort ID
   * @param {String} fileReference - File Reference
   * @param {Boolean} force - Erzwingt Löschung auch wenn deprecated
   * @returns {Promise<void>}
   */
  static async deleteDocument(locationId, fileReference, force = false) {
    const location = await Location.findById(locationId);
    if (!location || !location.xdsRegistry || !location.xdsRegistry.enabled) {
      throw new Error('XDS Repository nicht verfügbar');
    }
    
    const repoPath = location.xdsRegistry.repositoryLocation || 
      path.join(process.cwd(), 'xds-repository', locationId.toString());
    
    const metadataPath = path.join(repoPath, 'metadata', `${fileReference}.json`);
    
    try {
      // Lade Metadaten
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      if (metadata.deprecated && !force) {
        throw new Error('Deprecated Dokumente können nur mit force=true gelöscht werden');
      }
      
      // Lösche Datei
      const filePath = path.join(repoPath, 'documents', metadata.fileName);
      await fs.unlink(filePath);
      
      // Lösche Metadaten
      await fs.unlink(metadataPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Datei bereits gelöscht oder nicht vorhanden
        return;
      }
      throw new Error(`Fehler beim Löschen: ${error.message}`);
    }
  }
  
  /**
   * Hilfsfunktion: Extension aus MIME Type
   */
  static getExtensionFromMimeType(mimeType) {
    const mimeMap = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/tiff': '.tiff',
      'text/xml': '.xml',
      'application/xml': '.xml',
      'text/html': '.html'
    };
    return mimeMap[mimeType] || '.bin';
  }
  
  /**
   * Bereinigt temporäre Dateien
   * @param {String} locationId - Standort ID
   * @param {Number} maxAgeHours - Maximale Alter in Stunden für temporäre Dateien
   */
  static async cleanupTempFiles(locationId, maxAgeHours = 24) {
    const location = await Location.findById(locationId);
    if (!location || !location.xdsRegistry || !location.xdsRegistry.enabled) {
      return;
    }
    
    const repoPath = location.xdsRegistry.repositoryLocation || 
      path.join(process.cwd(), 'xds-repository', locationId.toString());
    
    const tempPath = path.join(repoPath, 'temp');
    
    try {
      const files = await fs.readdir(tempPath);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      
      for (const file of files) {
        const filePath = path.join(tempPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      // Ignoriere Fehler bei Cleanup
      console.error('Fehler beim Cleanup temporärer Dateien:', error);
    }
  }
}

module.exports = XdsFileRepository;



