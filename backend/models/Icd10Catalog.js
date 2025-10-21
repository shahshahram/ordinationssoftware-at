const mongoose = require('mongoose');

const Icd10CatalogSchema = new mongoose.Schema({
  // Grunddaten
  code: { 
    type: String, 
    required: true, 
    trim: true,
    index: true
  },
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  longTitle: { 
    type: String, 
    trim: true 
  },
  chapter: { 
    type: String, 
    trim: true 
  },
  synonyms: [{ 
    type: String, 
    trim: true 
  }],
  
  // Versionierung
  language: { 
    type: String, 
    default: 'de-AT' 
  },
  validFrom: { 
    type: Date, 
    required: true 
  },
  validTo: { 
    type: Date 
  },
  releaseYear: { 
    type: Number, 
    required: true,
    index: true
  },
  
  // Klassifikation
  isBillable: { 
    type: Boolean, 
    default: true 
  },
  parentCode: { 
    type: String, 
    trim: true 
  },
  
  // Suchtext für Volltextsuche
  searchText: { 
    type: String 
  },
  
  // Metadaten
  isActive: { 
    type: Boolean, 
    default: true 
  },
  sortOrder: { 
    type: Number, 
    default: 0 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Text-Index für Volltextsuche
Icd10CatalogSchema.index({
  code: 'text',
  title: 'text',
  longTitle: 'text',
  synonyms: 'text'
});

// Compound Index für effiziente Abfragen
Icd10CatalogSchema.index({ 
  releaseYear: 1, 
  isActive: 1, 
  isBillable: 1 
});

Icd10CatalogSchema.index({ 
  code: 1, 
  releaseYear: 1 
}, { unique: true });

// Zusätzliche Performance-Indizes
Icd10CatalogSchema.index({ 
  releaseYear: 1, 
  isActive: 1, 
  code: 1 
});

Icd10CatalogSchema.index({ 
  releaseYear: 1, 
  isActive: 1, 
  chapter: 1 
});

Icd10CatalogSchema.index({ 
  releaseYear: 1, 
  isActive: 1, 
  isBillable: 1, 
  code: 1 
});

// Virtual für vollständigen Suchtext
Icd10CatalogSchema.pre('save', function(next) {
  const searchParts = [
    this.code,
    this.title,
    this.longTitle,
    ...(this.synonyms || [])
  ].filter(Boolean);
  
  this.searchText = searchParts.join(' ');
  next();
});

// Virtual für Hierarchie-Level
Icd10CatalogSchema.virtual('level').get(function() {
  if (!this.code) return 0;
  const parts = this.code.split('.');
  return parts.length;
});

// Virtual für Kapitel-Name
Icd10CatalogSchema.virtual('chapterName').get(function() {
  const chapterMap = {
    'A': 'Bestimmte infektiöse und parasitäre Krankheiten',
    'B': 'Neubildungen',
    'C': 'Krankheiten des Blutes und der blutbildenden Organe',
    'D': 'Endokrine, Ernährungs- und Stoffwechselkrankheiten',
    'E': 'Psychische und Verhaltensstörungen',
    'F': 'Krankheiten des Nervensystems',
    'G': 'Krankheiten des Auges und der Augenanhangsgebilde',
    'H': 'Krankheiten des Ohres und des Warzenfortsatzes',
    'I': 'Krankheiten des Kreislaufsystems',
    'J': 'Krankheiten des Atmungssystems',
    'K': 'Krankheiten des Verdauungssystems',
    'L': 'Krankheiten der Haut und der Unterhaut',
    'M': 'Krankheiten des Muskel-Skelett-Systems und des Bindegewebes',
    'N': 'Krankheiten des Urogenitalsystems',
    'O': 'Schwangerschaft, Geburt und Wochenbett',
    'P': 'Bestimmte Zustände, die ihren Ursprung in der Perinatalperiode haben',
    'Q': 'Angeborene Fehlbildungen, Deformitäten und Chromosomenanomalien',
    'R': 'Symptome und abnorme klinische und Laborbefunde',
    'S': 'Verletzungen, Vergiftungen und bestimmte andere Folgen äußerer Ursachen',
    'T': 'Äußere Ursachen von Morbidität und Mortalität',
    'U': 'Codes für besondere Zwecke',
    'V': 'Kontakt mit Gesundheitsdiensten',
    'W': 'Faktoren, die den Gesundheitszustand beeinflussen und zur Inanspruchnahme des Gesundheitswesens führen',
    'X': 'Kodes für besondere Zwecke',
    'Y': 'Äußere Ursachen von Morbidität und Mortalität',
    'Z': 'Faktoren, die den Gesundheitszustand beeinflussen und zur Inanspruchnahme des Gesundheitswesens führen'
  };
  
  if (this.chapter && chapterMap[this.chapter]) {
    return chapterMap[this.chapter];
  }
  
  const firstChar = this.code ? this.code.charAt(0) : '';
  return chapterMap[firstChar] || 'Unbekannt';
});

// Statische Methoden
Icd10CatalogSchema.statics.findByCode = function(code, year = new Date().getFullYear()) {
  return this.findOne({ 
    code: code, 
    releaseYear: year, 
    isActive: true 
  });
};

Icd10CatalogSchema.statics.search = function(query, options = {}) {
  const {
    year = new Date().getFullYear(),
    billableOnly = false,
    chapters = [],
    limit = 20,
    offset = 0
  } = options;
  
  let searchQuery = {
    releaseYear: year,
    isActive: true
  };
  
  if (billableOnly) {
    searchQuery.isBillable = true;
  }
  
  if (query && query.length >= 3) {
    // Optimierte Regex-Suche mit Case-Insensitive Index
    const regexQuery = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    searchQuery.$or = [
      { code: regexQuery },
      { title: regexQuery },
      { longTitle: regexQuery },
      { synonyms: { $in: [regexQuery] } }
    ];
    
    // Füge Kapitel-Filter hinzu falls vorhanden
    if (chapters.length > 0) {
      const chapterConditions = chapters.map(chapter => ({
        code: new RegExp(`^${chapter}`, 'i')
      }));
      
      searchQuery.$and = [
        { $or: chapterConditions },
        { $or: searchQuery.$or }
      ];
      delete searchQuery.$or;
    }
  } else if (chapters.length > 0) {
    searchQuery.$or = chapters.map(chapter => ({
      code: new RegExp(`^${chapter}`, 'i')
    }));
  }
  
  // Verwende lean() für bessere Performance bei großen Datensätzen
  return this.find(searchQuery)
    .lean()
    .sort({ code: 1 })
    .limit(limit)
    .skip(offset);
};

Icd10CatalogSchema.statics.getTopCodes = function(scope, scopeId, year = new Date().getFullYear(), limit = 10) {
  // Diese Methode wird später mit Usage-Statistics implementiert
  return this.find({
    releaseYear: year,
    isActive: true
  })
  .lean()
  .sort({ sortOrder: 1, code: 1 })
  .limit(limit);
};

// Erweiterte Validierung
Icd10CatalogSchema.statics.validateCode = function(code, options = {}) {
  const {
    year = new Date().getFullYear(),
    strictMode = false,
    allowPartial = true,
    suggestCorrections = true,
    context = 'medical'
  } = options;

  const result = {
    isValid: false,
    error: null,
    warning: null,
    suggestions: [],
    correctedCode: null,
    confidence: 0,
    alternatives: []
  };

  if (!code || code.trim().length === 0) {
    result.error = 'ICD-10 Code ist erforderlich';
    result.confidence = 0;
    return result;
  }

  const cleanCode = code.trim().toUpperCase();
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,3})?$/;
  const partialPattern = /^[A-Z](\d{1,2})?(\.\d{1,3})?$/;

  // Check if it's a perfect match
  if (icd10Pattern.test(cleanCode)) {
    const chapter = cleanCode.charAt(0);
    const validChapters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    if (!validChapters.includes(chapter)) {
      result.error = `Ungültiges Kapitel: ${chapter}`;
      result.suggestions = [`Gültige Kapitel: ${validChapters.split('').join(', ')}`];
      result.confidence = 0.3;
      return result;
    }

    // Number validation
    const numberPart = cleanCode.substring(1);
    const [mainNumber, subNumber] = numberPart.split('.');
    
    if (parseInt(mainNumber) < 0 || parseInt(mainNumber) > 99) {
      result.error = 'Hauptnummer muss zwischen 00 und 99 liegen';
      result.confidence = 0.3;
      return result;
    }

    if (subNumber && (parseInt(subNumber) < 0 || parseInt(subNumber) > 999)) {
      result.error = 'Unternummer muss zwischen 0 und 999 liegen';
      result.confidence = 0.3;
      return result;
    }

    result.isValid = true;
    result.correctedCode = cleanCode;
    result.confidence = 1.0;
    return result;
  }

  // Check partial pattern if allowed
  if (allowPartial && partialPattern.test(cleanCode)) {
    result.error = 'Unvollständiger ICD-10 Code';
    result.suggestions = this.generateSuggestions(cleanCode);
    result.confidence = 0.6;
    return result;
  }

  // Try to find similar codes
  if (suggestCorrections) {
    const corrections = this.findSimilarCodes(cleanCode);
    if (corrections.length > 0) {
      result.error = 'Ungültiges ICD-10 Code-Format';
      result.suggestions = corrections.slice(0, 5);
      result.alternatives = corrections;
      result.confidence = 0.4;
      return result;
    }
  }

  result.error = 'Ungültiges ICD-10 Code-Format';
  result.suggestions = [
    'Format: Buchstabe + 2 Ziffern (z.B. I10)',
    'Mit Unterkategorien: Buchstabe + 2 Ziffern + Punkt + 1-3 Ziffern (z.B. I25.1)'
  ];
  result.confidence = 0.1;
  return result;
};

// Helper method for generating suggestions
Icd10CatalogSchema.statics.generateSuggestions = function(input) {
  const suggestions = [];
  const cleanInput = input.replace(/[^A-Z0-9.]/g, '');
  
  if (cleanInput.length >= 1) {
    const firstChar = cleanInput.charAt(0);
    if (/[A-Z]/.test(firstChar)) {
      // Generate suggestions based on first character
      for (let i = 0; i < 10; i++) {
        suggestions.push(`${firstChar}${i.toString().padStart(2, '0')}`);
      }
    }
  }
  
  return suggestions.slice(0, 5);
};

// Helper method for finding similar codes
Icd10CatalogSchema.statics.findSimilarCodes = function(input) {
  const suggestions = [];
  const cleanInput = input.replace(/[^A-Z0-9.]/g, '');
  
  // Common typos and corrections
  const commonTypos = {
    '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'P',
    'o': '0', 'i': '1', 'z': '2', 'e': '3', 'a': '4', 's': '5', 'g': '6', 't': '7', 'b': '8', 'p': '9'
  };
  
  // Try common typo corrections
  for (const [wrong, correct] of Object.entries(commonTypos)) {
    if (cleanInput.includes(wrong)) {
      const corrected = cleanInput.replace(new RegExp(wrong, 'g'), correct);
      if (/^[A-Z]\d{2}(\.\d{1,3})?$/.test(corrected)) {
        suggestions.push(corrected);
      }
    }
  }
  
  // Try adding missing digits
  if (cleanInput.length === 1 && /[A-Z]/.test(cleanInput)) {
    for (let i = 0; i < 10; i++) {
      suggestions.push(`${cleanInput}${i.toString().padStart(2, '0')}`);
    }
  }
  
  // Try adding missing decimal part
  if (cleanInput.length === 3 && /^[A-Z]\d{2}$/.test(cleanInput)) {
    for (let i = 1; i <= 3; i++) {
      suggestions.push(`${cleanInput}.${i}`);
    }
  }
  
  return [...new Set(suggestions)].slice(0, 10);
};

// Neue Methode für schnelle Code-Suche (nur Code und Titel)
Icd10CatalogSchema.statics.searchCodes = function(query, year = new Date().getFullYear(), limit = 10) {
  if (!query || query.length < 2) {
    return this.find({
      releaseYear: year,
      isActive: true
    })
    .lean()
    .select('code title isBillable')
    .sort({ code: 1 })
    .limit(limit);
  }
  
  const regexQuery = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  
  return this.find({
    releaseYear: year,
    isActive: true,
    $or: [
      { code: regexQuery },
      { title: regexQuery }
    ]
  })
  .lean()
  .select('code title isBillable')
  .sort({ code: 1 })
  .limit(limit);
};

// Hierarchie-Methoden
Icd10CatalogSchema.statics.getHierarchy = async function(year = new Date().getFullYear()) {
  try {
    // Einfache Gruppierung nach Kapitel
    const chapters = await this.distinct('chapter', { 
      releaseYear: year, 
      isActive: true 
    });
    
    const hierarchy = [];
    
    for (const chapter of chapters.sort()) {
      const codes = await this.find({
        releaseYear: year,
        isActive: true,
        chapter: chapter
      })
      .lean()
      .sort({ code: 1 })
      .limit(100); // Begrenze auf 100 Codes pro Kapitel für Performance
      
      hierarchy.push({
        _id: chapter,
        codes: codes.map(code => ({
          _id: code._id,
          code: code.code,
          title: code.title,
          longTitle: code.longTitle,
          isBillable: code.isBillable,
          parentCode: code.parentCode,
          synonyms: code.synonyms,
          level: code.code.split('.').length - 1
        }))
      });
    }
    
    return hierarchy;
  } catch (error) {
    console.error('Error in getHierarchy:', error);
    throw error;
  }
};

Icd10CatalogSchema.statics.getChildren = function(parentCode, year = new Date().getFullYear()) {
  return this.find({
    releaseYear: year,
    isActive: true,
    parentCode: parentCode
  })
  .lean()
  .sort({ code: 1 });
};

Icd10CatalogSchema.statics.getParent = function(code, year = new Date().getFullYear()) {
  // Finde den Parent-Code basierend auf der Code-Struktur
  const parts = code.split('.');
  if (parts.length <= 1) return null;
  
  const parentCode = parts[0];
  return this.findOne({
    releaseYear: year,
    isActive: true,
    code: parentCode
  })
  .lean();
};

Icd10CatalogSchema.statics.getSiblings = function(code, year = new Date().getFullYear()) {
  const parts = code.split('.');
  if (parts.length <= 1) return [];
  
  const parentCode = parts[0];
  return this.find({
    releaseYear: year,
    isActive: true,
    parentCode: parentCode,
    code: { $ne: code }
  })
  .lean()
  .sort({ code: 1 });
};

Icd10CatalogSchema.statics.getRelatedCodes = function(code, year = new Date().getFullYear(), limit = 10) {
  const parts = code.split('.');
  const chapter = parts[0];
  
  return this.find({
    releaseYear: year,
    isActive: true,
    chapter: chapter,
    code: { $ne: code }
  })
  .lean()
  .sort({ code: 1 })
  .limit(limit);
};

Icd10CatalogSchema.statics.getBreadcrumb = function(code, year = new Date().getFullYear()) {
  const breadcrumb = [];
  const parts = code.split('.');
  
  // Kapitel-Level
  breadcrumb.push({
    code: parts[0],
    title: `Kapitel ${parts[0]}`,
    level: 0
  });
  
  // Parent-Code falls vorhanden
  if (parts.length > 1) {
    const parentCode = parts[0];
    const parent = this.findOne({
      releaseYear: year,
      isActive: true,
      code: parentCode
    }).lean();
    
    if (parent) {
      breadcrumb.push({
        code: parentCode,
        title: parent.title,
        level: 1
      });
    }
  }
  
  return breadcrumb;
};

module.exports = mongoose.model('Icd10Catalog', Icd10CatalogSchema);
