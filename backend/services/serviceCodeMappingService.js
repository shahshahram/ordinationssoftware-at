const ServiceCodeMapping = require('../models/ServiceCodeMapping');
const ServiceCatalog = require('../models/ServiceCatalog');

/**
 * Service für Service-Code-Mapping zwischen verschiedenen Versicherungsträgern
 * Konvertiert interne Service-Codes zu versicherungsträger-spezifischen Codes
 */
class ServiceCodeMappingService {
  /**
   * Findet den passenden Code für einen Versicherungsträger
   * @param {String} baseCode - Interner Service-Code
   * @param {String} insuranceProvider - Versicherungsträger (oegk, svs, etc.)
   * @returns {Promise<Object|null>} Mapping-Objekt oder null
   */
  async findMapping(baseCode, insuranceProvider) {
    try {
      if (!baseCode || !insuranceProvider) {
        return null;
      }

      const mapping = await ServiceCodeMapping.findOne({
        baseCode: baseCode,
        'mappings.insuranceProvider': insuranceProvider,
        'mappings.isActive': true,
        isActive: true
      });

      if (!mapping) {
        return null;
      }

      // Finde spezifisches Mapping
      const providerMapping = mapping.mappings.find(
        m => m.insuranceProvider === insuranceProvider && 
             m.isActive &&
             (!m.validFrom || m.validFrom <= new Date()) &&
             (!m.validUntil || m.validUntil >= new Date())
      );

      if (!providerMapping) {
        return null;
      }

      return {
        baseCode: mapping.baseCode,
        baseName: mapping.baseName,
        providerCode: providerMapping.code,
        providerName: providerMapping.name || mapping.baseName,
        providerPrice: providerMapping.price,
        insuranceProvider: insuranceProvider
      };
    } catch (error) {
      console.error('[ServiceCodeMapping] Fehler beim Finden des Mappings:', error);
      return null;
    }
  }

  /**
   * Konvertiert einen Service-Code für einen Versicherungsträger
   * @param {String} baseCode - Interner Service-Code
   * @param {String} insuranceProvider - Versicherungsträger
   * @returns {Promise<String|null>} Provider-spezifischer Code oder null
   */
  async convertCode(baseCode, insuranceProvider) {
    const mapping = await this.findMapping(baseCode, insuranceProvider);
    return mapping ? mapping.providerCode : null;
  }

  /**
   * Konvertiert mehrere Service-Codes für einen Versicherungsträger
   * @param {Array} services - Array von Service-Objekten
   * @param {String} insuranceProvider - Versicherungsträger
   * @returns {Promise<Array>} Array von konvertierten Services
   */
  async convertServices(services, insuranceProvider) {
    if (!services || !Array.isArray(services) || services.length === 0) {
      return services || [];
    }

    const convertedServices = [];

    for (const service of services) {
      if (!service.serviceCode) {
        // Kein Service-Code vorhanden, verwende Original
        convertedServices.push(service);
        continue;
      }

      const mapping = await this.findMapping(service.serviceCode, insuranceProvider);

      if (mapping) {
        convertedServices.push({
          ...service,
          serviceCode: mapping.providerCode,
          serviceName: mapping.providerName,
          // Verwende Provider-Preis, falls vorhanden, sonst Original-Preis
          unitPrice: mapping.providerPrice !== undefined ? mapping.providerPrice : service.unitPrice,
          // Berechne totalPrice neu, falls unitPrice geändert wurde
          totalPrice: mapping.providerPrice !== undefined 
            ? (mapping.providerPrice * (service.quantity || 1))
            : service.totalPrice,
          // Metadaten für Tracking
          _mappingApplied: true,
          _originalCode: service.serviceCode,
          _insuranceProvider: insuranceProvider
        });
      } else {
        // Kein Mapping gefunden, verwende Original-Code
        convertedServices.push({
          ...service,
          _mappingApplied: false,
          _insuranceProvider: insuranceProvider
        });
      }
    }

    return convertedServices;
  }

  /**
   * Erstellt automatisch Mapping aus ServiceCatalog
   * @param {String} baseCode - Interner Service-Code
   * @returns {Promise<Object>} Erstelltes Mapping
   */
  async createMappingFromServiceCatalog(baseCode) {
    try {
      const service = await ServiceCatalog.findOne({ code: baseCode });

      if (!service) {
        throw new Error(`Service ${baseCode} nicht gefunden`);
      }

      // Prüfe ob Mapping bereits existiert
      let mapping = await ServiceCodeMapping.findOne({ baseCode: baseCode });

      if (mapping) {
        // Mapping existiert bereits, aktualisiere baseName
        mapping.baseName = service.name;
        mapping.specialty = service.specialty;
        mapping.category = service.category;
      } else {
        // Erstelle neues Mapping
        mapping = new ServiceCodeMapping({
          baseCode: baseCode,
          baseName: service.name,
          specialty: service.specialty,
          category: service.category,
          mappings: []
        });
      }

      // Füge Mappings für alle Versicherungsträger hinzu, die im ServiceCatalog definiert sind
      if (service.ogk) {
        const insuranceProvider = service.ogk.insuranceProvider;
        
        if (insuranceProvider && insuranceProvider !== 'all') {
          // Prüfe ob Mapping für diesen Provider bereits existiert
          const existingMapping = mapping.mappings.find(
            m => m.insuranceProvider === insuranceProvider
          );

          const mappingData = {
            insuranceProvider: insuranceProvider,
            code: service.ogk.khoCode || service.ogk.ebmCode || baseCode,
            name: service.name,
            price: service.ogk.khoPrice || service.ogk.ebmPrice || service.price,
            isActive: true
          };

          if (existingMapping) {
            // Aktualisiere bestehendes Mapping
            Object.assign(existingMapping, mappingData);
          } else {
            // Füge neues Mapping hinzu
            mapping.mappings.push(mappingData);
          }
        }
      }

      await mapping.save();
      return mapping;
    } catch (error) {
      console.error('[ServiceCodeMapping] Fehler beim Erstellen des Mappings:', error);
      throw error;
    }
  }

  /**
   * Mappt Versicherungsträger-String zu Code
   * @param {String} insuranceProvider - Versicherungsträger-String (z.B. "ÖGK (Österreichische Gesundheitskasse)")
   * @returns {String|null} Code (z.B. "oegk") oder null
   */
  mapInsuranceProviderToCode(insuranceProvider) {
    if (!insuranceProvider) {
      return null;
    }

    const mapping = {
      'ÖGK (Österreichische Gesundheitskasse)': 'oegk',
      'SVS (Sozialversicherung der Selbständigen)': 'svs',
      'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)': 'bvaeb',
      'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)': 'kfa',
      'PVA (Pensionsversicherungsanstalt)': 'pva',
      'VAEB (Versicherungsanstalt öffentlich Bediensteter)': 'vaeb',
      'AUVA (Allgemeine Unfallversicherungsanstalt)': 'auva',
      // Fallback: Direkte Codes
      'oegk': 'oegk',
      'svs': 'svs',
      'bvaeb': 'bvaeb',
      'kfa': 'kfa',
      'pva': 'pva',
      'vaeb': 'vaeb',
      'auva': 'auva'
    };

    // Prüfe exakte Übereinstimmung
    if (mapping[insuranceProvider]) {
      return mapping[insuranceProvider];
    }

    // Prüfe Teilübereinstimmung (z.B. "ÖGK" in "ÖGK (Österreichische Gesundheitskasse)")
    const upperProvider = insuranceProvider.toUpperCase();
    for (const [key, value] of Object.entries(mapping)) {
      if (upperProvider.includes(key.split(' ')[0].toUpperCase())) {
        return value;
      }
    }

    return null;
  }

  /**
   * Findet alle Mappings für einen Service-Code
   * @param {String} baseCode - Interner Service-Code
   * @returns {Promise<Object|null>} Mapping-Objekt mit allen Provider-Mappings
   */
  async findAllMappings(baseCode) {
    try {
      const mapping = await ServiceCodeMapping.findOne({
        baseCode: baseCode,
        isActive: true
      });

      return mapping;
    } catch (error) {
      console.error('[ServiceCodeMapping] Fehler beim Finden aller Mappings:', error);
      return null;
    }
  }

  /**
   * Erstellt oder aktualisiert ein Mapping
   * @param {String} baseCode - Interner Service-Code
   * @param {String} insuranceProvider - Versicherungsträger
   * @param {Object} mappingData - Mapping-Daten { code, name?, price?, validFrom?, validUntil? }
   * @returns {Promise<Object>} Aktualisiertes Mapping
   */
  async upsertMapping(baseCode, insuranceProvider, mappingData) {
    try {
      let mapping = await ServiceCodeMapping.findOne({ baseCode: baseCode });

      if (!mapping) {
        // Erstelle neues Mapping
        const service = await ServiceCatalog.findOne({ code: baseCode });
        if (!service) {
          throw new Error(`Service ${baseCode} nicht gefunden`);
        }

        mapping = new ServiceCodeMapping({
          baseCode: baseCode,
          baseName: service.name,
          specialty: service.specialty,
          category: service.category,
          mappings: []
        });
      }

      // Prüfe ob Mapping für diesen Provider bereits existiert
      const existingMappingIndex = mapping.mappings.findIndex(
        m => m.insuranceProvider === insuranceProvider
      );

      const newMapping = {
        insuranceProvider: insuranceProvider,
        code: mappingData.code,
        name: mappingData.name || mapping.baseName,
        price: mappingData.price,
        validFrom: mappingData.validFrom ? new Date(mappingData.validFrom) : undefined,
        validUntil: mappingData.validUntil ? new Date(mappingData.validUntil) : undefined,
        isActive: mappingData.isActive !== undefined ? mappingData.isActive : true
      };

      if (existingMappingIndex >= 0) {
        // Aktualisiere bestehendes Mapping
        mapping.mappings[existingMappingIndex] = newMapping;
      } else {
        // Füge neues Mapping hinzu
        mapping.mappings.push(newMapping);
      }

      await mapping.save();
      return mapping;
    } catch (error) {
      console.error('[ServiceCodeMapping] Fehler beim Upsert des Mappings:', error);
      throw error;
    }
  }
}

module.exports = new ServiceCodeMappingService();
