/**
 * Chatbot Feature Discovery Service
 * Erkennt automatisch alle Features, Seiten und Routen der Anwendung
 */

const fs = require('fs');
const path = require('path');

class ChatbotFeatureDiscovery {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.frontendPagesDir = path.join(this.projectRoot, 'frontend/src/pages');
    this.backendRoutesDir = path.join(this.projectRoot, 'backend/routes');
    this.features = [];
  }

  /**
   * Entdeckt alle Features der Anwendung
   */
  async discoverAllFeatures() {
    const features = [];

    // 1. Backend-Routen analysieren
    const routeFeatures = await this.discoverBackendRoutes();
    features.push(...routeFeatures);

    // 2. Frontend-Seiten analysieren
    const pageFeatures = await this.discoverFrontendPages();
    features.push(...pageFeatures);

    // 3. Menüstruktur analysieren
    const menuFeatures = await this.discoverMenuStructure();
    features.push(...menuFeatures);

    // 4. Komponenten analysieren (für spezielle Features)
    const componentFeatures = await this.discoverComponents();
    features.push(...componentFeatures);

    // Duplikate entfernen
    const uniqueFeatures = this.removeDuplicates(features);

    return uniqueFeatures;
  }

  /**
   * Entdeckt Backend-Routen
   */
  async discoverBackendRoutes() {
    const features = [];

    try {
      if (fs.existsSync(this.backendRoutesDir)) {
        const routeFiles = fs.readdirSync(this.backendRoutesDir)
          .filter(file => file.endsWith('.js') && file !== 'chatbot.js')
          .map(file => file.replace('.js', ''));

        routeFiles.forEach(route => {
          const featureName = this.formatFeatureName(route);
          const keywords = this.generateKeywords(route);
          
          features.push({
            keywords: keywords,
            category: featureName,
            description: `${featureName} API-Endpunkt`,
            instructions: [
              `API-Endpunkt: /api/${route}`,
              `Zugriff über: ${featureName} im Hauptmenü`,
              `Weitere Informationen in den Hilfe-Dialogen (❓ Symbol)`
            ],
            type: 'backend-route',
            route: route
          });
        });
      }
    } catch (error) {
      console.error('Error discovering backend routes:', error);
    }

    return features;
  }

  /**
   * Entdeckt Frontend-Seiten
   */
  async discoverFrontendPages() {
    const features = [];

    try {
      if (fs.existsSync(this.frontendPagesDir)) {
        const pageFiles = fs.readdirSync(this.frontendPagesDir)
          .filter(file => file.endsWith('.tsx') && 
                 !file.includes('Login') && 
                 !file.includes('Unauthorized') &&
                 !file.includes('SuperAdminSetup'))
          .map(file => file.replace('.tsx', ''));

        pageFiles.forEach(page => {
          const featureName = this.formatFeatureName(page);
          const keywords = this.generateKeywords(page);
          
          // Versuche, mehr Informationen aus der Datei zu extrahieren
          const pagePath = path.join(this.frontendPagesDir, `${page}.tsx`);
          let description = `${featureName} Seite`;
          
          try {
            const content = fs.readFileSync(pagePath, 'utf8');
            // Suche nach Kommentaren oder Titel
            const titleMatch = content.match(/title[:\s]*['"]([^'"]+)['"]/i);
            if (titleMatch) {
              description = titleMatch[1];
            }
          } catch (e) {
            // Ignoriere Fehler
          }

          features.push({
            keywords: keywords,
            category: featureName,
            description: description,
            instructions: [
              `Zugriff über: ${featureName} im Hauptmenü`,
              `Route: /${this.toKebabCase(page)}`,
              `Weitere Informationen in den Hilfe-Dialogen (❓ Symbol)`
            ],
            type: 'frontend-page',
            page: page,
            route: `/${this.toKebabCase(page)}`
          });
        });
      }
    } catch (error) {
      console.error('Error discovering frontend pages:', error);
    }

    return features;
  }

  /**
   * Entdeckt Menüstruktur
   */
  async discoverMenuStructure() {
    const features = [];

    try {
      const menuItemsPath = path.join(this.projectRoot, 'frontend/src/data/menuItems.tsx');
      if (fs.existsSync(menuItemsPath)) {
        const content = fs.readFileSync(menuItemsPath, 'utf8');
        
        // Extrahiere Menüeinträge
        const menuItemRegex = /text:\s*['"]([^'"]+)['"]/g;
        const pathRegex = /path:\s*['"]([^'"]+)['"]/g;
        
        let match;
        const menuItems = [];
        while ((match = menuItemRegex.exec(content)) !== null) {
          menuItems.push({
            text: match[1],
            index: match.index
          });
        }

        const paths = [];
        while ((match = pathRegex.exec(content)) !== null) {
          paths.push({
            path: match[1],
            index: match.index
          });
        }

        // Kombiniere Text und Path
        menuItems.forEach((item, index) => {
          const closestPath = paths.find(p => p.index > item.index);
          if (closestPath) {
            const keywords = this.generateKeywords(item.text);
            features.push({
              keywords: keywords,
              category: item.text,
              description: `${item.text} Funktionalität`,
              instructions: [
                `Zugriff über: ${item.text} im Hauptmenü`,
                `Route: ${closestPath.path}`,
                `Weitere Informationen in den Hilfe-Dialogen (❓ Symbol)`
              ],
              type: 'menu-item',
              menuText: item.text,
              route: closestPath.path
            });
          }
        });
      }
    } catch (error) {
      console.error('Error discovering menu structure:', error);
    }

    return features;
  }

  /**
   * Entdeckt wichtige Komponenten
   */
  async discoverComponents() {
    const features = [];

    try {
      const componentsDir = path.join(this.projectRoot, 'frontend/src/components');
      if (fs.existsSync(componentsDir)) {
        const componentFiles = fs.readdirSync(componentsDir)
          .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
          .map(file => file.replace(/\.(tsx|ts)$/, ''));

        // Wichtige Komponenten identifizieren
        const importantComponents = [
          'DekursDialog', 'DekursQuickEntry', 'DekursHistory',
          'PatientTimeline', 'PatientSidebar', 'VitalSignsManager',
          'DiagnosisManager', 'MedicationManager', 'LaborResults',
          'DicomUpload', 'DicomStudiesList', 'ECardValidation',
          'OnlineBooking', 'Checkin', 'QRCodeGenerator'
        ];

        importantComponents.forEach(component => {
          if (componentFiles.includes(component)) {
            const featureName = this.formatFeatureName(component);
            const keywords = this.generateKeywords(component);
            
            features.push({
              keywords: keywords,
              category: featureName,
              description: `${featureName} Komponente`,
              instructions: [
                `Verfügbar in: Patient-Organizer oder entsprechender Seite`,
                `Weitere Informationen in den Hilfe-Dialogen (❓ Symbol)`
              ],
              type: 'component',
              component: component
            });
          }
        });
      }
    } catch (error) {
      console.error('Error discovering components:', error);
    }

    return features;
  }

  /**
   * Formatiert einen Namen zu einem Feature-Namen
   */
  formatFeatureName(name) {
    // Entferne Präfixe wie "Management", "Page", etc.
    let formatted = name
      .replace(/Management$/, '')
      .replace(/Page$/, '')
      .replace(/Admin$/, '')
      .replace(/Test$/, '')
      .replace(/Demo$/, '');

    // Konvertiere zu lesbarem Format
    formatted = formatted
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return formatted || name;
  }

  /**
   * Generiert Keywords für eine Feature
   */
  generateKeywords(name) {
    const keywords = [];
    
    // Originalname (lowercase)
    keywords.push(name.toLowerCase());
    
    // Ohne Bindestriche
    keywords.push(name.replace(/-/g, ' ').toLowerCase());
    
    // CamelCase zu Wörtern
    keywords.push(name.replace(/([A-Z])/g, ' $1').toLowerCase().trim());
    
    // Formatierter Name
    const formatted = this.formatFeatureName(name);
    keywords.push(formatted.toLowerCase());
    
    // Einzelne Wörter
    formatted.split(' ').forEach(word => {
      if (word.length > 2) {
        keywords.push(word.toLowerCase());
      }
    });

    // Entferne Duplikate
    return [...new Set(keywords)];
  }

  /**
   * Konvertiert zu Kebab-Case
   */
  toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Entfernt Duplikate basierend auf Category
   */
  removeDuplicates(features) {
    const seen = new Map();
    const unique = [];

    features.forEach(feature => {
      const key = feature.category.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push(feature);
      } else {
        // Wenn bereits vorhanden, merge Keywords
        const existing = unique.find(f => f.category.toLowerCase() === key);
        if (existing) {
          existing.keywords = [...new Set([...existing.keywords, ...feature.keywords])];
          // Merge Instructions
          existing.instructions = [...new Set([...existing.instructions, ...feature.instructions])];
        }
      }
    });

    return unique;
  }

  /**
   * Erstellt eine vollständige Feature-Liste mit Kategorien
   */
  categorizeFeatures(features) {
    const categories = {
      'Patientenverwaltung': [],
      'Terminplanung': [],
      'Dokumentenverwaltung': [],
      'Abrechnung': [],
      'Einstellungen': [],
      'Integrationen': [],
      'Verwaltung': [],
      'Berichte': [],
      'Sicherheit': [],
      'Sonstiges': []
    };

    features.forEach(feature => {
      const category = this.categorizeFeature(feature);
      if (categories[category]) {
        categories[category].push(feature);
      } else {
        categories['Sonstiges'].push(feature);
      }
    });

    return categories;
  }

  /**
   * Kategorisiert ein Feature
   */
  categorizeFeature(feature) {
    const lowerCategory = feature.category.toLowerCase();
    const lowerKeywords = feature.keywords.join(' ').toLowerCase();

    if (lowerCategory.includes('patient') || lowerKeywords.includes('patient')) {
      return 'Patientenverwaltung';
    }
    if (lowerCategory.includes('termin') || lowerCategory.includes('appointment') || lowerKeywords.includes('termin') || lowerKeywords.includes('appointment')) {
      return 'Terminplanung';
    }
    if (lowerCategory.includes('dokument') || lowerCategory.includes('document') || lowerKeywords.includes('dokument') || lowerKeywords.includes('document')) {
      return 'Dokumentenverwaltung';
    }
    if (lowerCategory.includes('abrechnung') || lowerCategory.includes('billing') || lowerKeywords.includes('abrechnung') || lowerKeywords.includes('billing')) {
      return 'Abrechnung';
    }
    if (lowerCategory.includes('einstellung') || lowerCategory.includes('setting') || lowerKeywords.includes('einstellung') || lowerKeywords.includes('setting')) {
      return 'Einstellungen';
    }
    if (lowerCategory.includes('integration') || lowerCategory.includes('elda') || lowerCategory.includes('elga') || lowerCategory.includes('dicom') || lowerCategory.includes('labor')) {
      return 'Integrationen';
    }
    if (lowerCategory.includes('verwaltung') || lowerCategory.includes('management') || lowerKeywords.includes('verwaltung') || lowerKeywords.includes('management')) {
      return 'Verwaltung';
    }
    if (lowerCategory.includes('bericht') || lowerCategory.includes('report') || lowerKeywords.includes('bericht') || lowerKeywords.includes('report')) {
      return 'Berichte';
    }
    if (lowerCategory.includes('sicherheit') || lowerCategory.includes('security') || lowerKeywords.includes('sicherheit') || lowerKeywords.includes('security')) {
      return 'Sicherheit';
    }

    return 'Sonstiges';
  }
}

module.exports = new ChatbotFeatureDiscovery();
