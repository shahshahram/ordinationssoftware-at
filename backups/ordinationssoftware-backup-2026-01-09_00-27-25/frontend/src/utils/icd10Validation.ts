// ICD-10 Code Validation Utilities

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestions?: string[];
  correctedCode?: string;
  confidence?: number;
  alternatives?: string[];
}

export interface ValidationOptions {
  strictMode?: boolean;
  allowPartial?: boolean;
  suggestCorrections?: boolean;
  checkBillability?: boolean;
  context?: 'medical' | 'billing' | 'clinical';
}

// Common typos and corrections
const COMMON_TYPOS: { [key: string]: string } = {
  '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'P',
  'o': '0', 'i': '1', 'z': '2', 'e': '3', 'a': '4', 's': '5', 'g': '6', 't': '7', 'b': '8', 'p': '9'
};

export const validateIcd10Code = (code: string, options: ValidationOptions = {}): ValidationResult => {
  const {
    strictMode = false,
    allowPartial = true,
    suggestCorrections = true,
    checkBillability = false,
    context = 'medical'
  } = options;

  if (!code || code.trim() === '') {
    return {
      isValid: false,
      error: 'ICD-10 Code ist erforderlich',
      confidence: 0
    };
  }

  const trimmedCode = code.trim().toUpperCase();
  let confidence = 1.0;
  
  // Basic format validation: Letter followed by 2 digits, optionally followed by decimal and 1-3 digits
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,3})?$/;
  const partialPattern = /^[A-Z](\d{1,2})?(\.\d{1,3})?$/;
  
  // Check if it's a perfect match
  if (icd10Pattern.test(trimmedCode)) {
    // Chapter validation
    const chapter = trimmedCode.charAt(0);
    const validChapters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    if (!validChapters.includes(chapter)) {
      return {
        isValid: false,
        error: `Ungültiges Kapitel: ${chapter}`,
        suggestions: [`Gültige Kapitel: ${validChapters.split('').join(', ')}`],
        confidence: 0.3
      };
    }

    // Number validation
    const numberPart = trimmedCode.substring(1);
    const [mainNumber, subNumber] = numberPart.split('.');
    
    if (parseInt(mainNumber) < 0 || parseInt(mainNumber) > 99) {
      return {
        isValid: false,
        error: 'Hauptnummer muss zwischen 00 und 99 liegen',
        confidence: 0.3
      };
    }

    if (subNumber && (parseInt(subNumber) < 0 || parseInt(subNumber) > 999)) {
      return {
        isValid: false,
        error: 'Unternummer muss zwischen 0 und 999 liegen',
        confidence: 0.3
      };
    }

    // Specific chapter warnings
    const chapterWarnings = getChapterWarnings(chapter, mainNumber);
    const isCommon = isCommonCode(trimmedCode);
    
    return {
      isValid: true,
      warning: chapterWarnings,
      suggestions: getCodeSuggestions(chapter, mainNumber),
      correctedCode: trimmedCode,
      confidence: isCommon ? 1.0 : 0.8
    };
  }

  // Check partial pattern if allowed
  if (allowPartial && partialPattern.test(trimmedCode)) {
    const suggestions = generateSuggestions(trimmedCode);
    return {
      isValid: false,
      error: 'Unvollständiger ICD-10 Code',
      suggestions: suggestions,
      confidence: 0.6
    };
  }

  // Try to find similar codes
  if (suggestCorrections) {
    const corrections = findSimilarCodes(trimmedCode);
    if (corrections.length > 0) {
      return {
        isValid: false,
        error: 'Ungültiges ICD-10 Code-Format',
        suggestions: corrections.slice(0, 5),
        alternatives: corrections,
        confidence: 0.4
      };
    }
  }

  return {
    isValid: false,
    error: 'Ungültiges ICD-10 Code-Format',
    suggestions: [
      'Format: Buchstabe + 2 Ziffern (z.B. I10)',
      'Mit Unterkategorien: Buchstabe + 2 Ziffern + Punkt + 1-3 Ziffern (z.B. I25.1)'
    ],
    confidence: 0.1
  };
};

const getChapterWarnings = (chapter: string, mainNumber: string): string | undefined => {
  const warnings: { [key: string]: { [key: string]: string } } = {
    'A': {
      '00': 'A00-A09: Bestimmte infektiöse und parasitäre Krankheiten',
      '10': 'A10-A19: Tuberkulose'
    },
    'I': {
      '10': 'I10-I16: Krankheiten des Kreislaufsystems - Hypertonie',
      '20': 'I20-I25: Ischämische Herzkrankheiten'
    },
    'Z': {
      '00': 'Z00-Z13: Personen, die das Gesundheitswesen zur Untersuchung und Behandlung aufsuchen'
    }
  };

  return warnings[chapter]?.[mainNumber];
};

const getCodeSuggestions = (chapter: string, mainNumber: string): string[] => {
  const suggestions: { [key: string]: { [key: string]: string[] } } = {
    'I': {
      '10': ['I10 - Essentielle Hypertonie', 'I11 - Hypertonische Herzkrankheit'],
      '20': ['I20 - Angina pectoris', 'I21 - ST-Hebungsinfarkt', 'I25 - Chronische ischämische Herzkrankheit']
    },
    'E': {
      '10': ['E10 - Diabetes mellitus, Typ 1', 'E11 - Diabetes mellitus, Typ 2'],
      '78': ['E78 - Störungen des Lipoproteinstoffwechsels']
    },
    'M': {
      '25': ['M25 - Sonstige Gelenkkrankheiten'],
      '79': ['M79 - Weichteilkrankheiten, anderenorts nicht klassifiziert']
    }
  };

  return suggestions[chapter]?.[mainNumber] || [];
};

export const formatIcd10Code = (code: string): string => {
  if (!code) return '';
  
  const trimmed = code.trim().toUpperCase();
  const match = trimmed.match(/^([A-Z])(\d{1,2})(?:\.(\d{1,3}))?$/);
  
  if (!match) return trimmed;
  
  const [, letter, mainNumber, subNumber] = match;
  const paddedMain = mainNumber.padStart(2, '0');
  
  if (subNumber) {
    return `${letter}${paddedMain}.${subNumber}`;
  }
  
  return `${letter}${paddedMain}`;
};

export const getChapterName = (code: string): string => {
  if (!code) return '';
  
  const chapter = code.charAt(0).toUpperCase();
  const chapterNames: { [key: string]: string } = {
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
    'W': 'Faktoren, die den Gesundheitszustand beeinflussen',
    'X': 'Kodes für besondere Zwecke',
    'Y': 'Äußere Ursachen von Morbidität und Mortalität',
    'Z': 'Faktoren, die den Gesundheitszustand beeinflussen'
  };
  
  return chapterNames[chapter] || 'Unbekanntes Kapitel';
};

export const isCommonCode = (code: string): boolean => {
  const commonCodes = [
    'I10', 'I25.1', 'E11', 'E78.5', 'M25.5', 'M79.3',
    'F32', 'F41', 'G47.0', 'H52.1', 'K21', 'L30',
    'N18', 'O26', 'P07', 'Q21', 'R06', 'S72', 'T78',
    'U07', 'V43', 'W19', 'X59', 'Y93', 'Z00'
  ];
  
  return commonCodes.includes(code.toUpperCase());
};

// Helper functions for enhanced validation
function generateSuggestions(input: string): string[] {
  const suggestions: string[] = [];
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
}

function findSimilarCodes(input: string): string[] {
  const suggestions: string[] = [];
  const cleanInput = input.replace(/[^A-Z0-9.]/g, '');
  
  // Try common typo corrections
  for (const [wrong, correct] of Object.entries(COMMON_TYPOS)) {
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
  
  const unique = Array.from(new Set(suggestions));
  return unique.slice(0, 10);
}

export function autoCorrectCode(code: string): string {
  const validation = validateIcd10Code(code, { suggestCorrections: true });
  
  if (validation.isValid) {
    return validation.correctedCode || code;
  }
  
  if (validation.suggestions && validation.suggestions.length > 0) {
    return validation.suggestions[0];
  }
  
  return code;
}

export function getCodeLevel(code: string): number {
  return code.split('.').length - 1;
}

export function validateCodeInContext(code: string, context: 'medical' | 'billing' | 'clinical'): ValidationResult {
  const baseValidation = validateIcd10Code(code);
  
  if (!baseValidation.isValid) {
    return baseValidation;
  }
  
  // Context-specific validation
  switch (context) {
    case 'billing':
      // For billing, we might want to ensure the code is billable
      return {
        ...baseValidation,
        warning: baseValidation.warning || 'Stellen Sie sicher, dass der Code abrechenbar ist'
      };
    
    case 'clinical':
      // For clinical use, we might want to ensure the code is specific enough
      const level = getCodeLevel(code);
      if (level < 1) {
        return {
          ...baseValidation,
          warning: 'Für klinische Dokumentation sollten spezifischere Codes verwendet werden'
        };
      }
      break;
    
    case 'medical':
    default:
      // No additional validation for medical context
      break;
  }
  
  return baseValidation;
}
