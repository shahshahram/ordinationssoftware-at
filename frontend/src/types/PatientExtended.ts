// Erweiterte Patient-Schnittstelle für österreichische Praxisstandards

export interface PatientAdmissionData {
  // Basis-Identifikation
  _id?: string;
  id?: string;
  
  // Stammdaten (Pflichtfelder nach österreichischem Standard)
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'm' | 'w' | 'd';
  socialSecurityNumber: string;
  insuranceProvider: string;
  
  // Adressdaten
  address: {
    street: string;
    zipCode: string;
    city: string;
    country: string;
  };
  
  // Kontaktdaten
  phone: string;
  email?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  
  // Medizinische Basisdaten
  primaryCarePhysician?: {
    name: string;
    location: string;
    phone?: string;
  };
  
  // Medikation
  currentMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate?: string;
    prescribedBy?: string;
  }> | string[];
  
  // Allergien
  allergies?: Array<{
    type: 'medication' | 'food' | 'environmental' | 'other';
    description: string;
    severity: 'mild' | 'moderate' | 'severe';
    reaction?: string;
  }> | string[];
  
  // Vorerkrankungen
  preExistingConditions?: string[];
  
  // Medizinische Vorgeschichte
  medicalHistory?: string[];
  
  // Operationen
  previousSurgeries?: Array<{
    year: string;
    procedure: string;
    hospital?: string;
    surgeon?: string;
  }>;
  
  // Weitere medizinische Daten
  bloodType?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  isPregnant?: boolean;
  pregnancyWeek?: number;
  isBreastfeeding?: boolean;
  hasPacemaker?: boolean;
  hasDefibrillator?: boolean;
  implants?: Array<{
    type: string;
    location?: string;
    date?: string;
    notes?: string;
  }>;
  smokingStatus?: 'non-smoker' | 'former-smoker' | 'current-smoker';
  cigarettesPerDay?: number;
  yearsOfSmoking?: number;
  quitSmokingDate?: string;
  
  // Administrative Daten
  referralSource?: 'self' | 'family_doctor' | 'specialist' | 'hospital' | 'emergency' | 'other';
  referralDoctor?: string;
  visitReason?: string;
  
  // Einverständniserklärungen
  dataProtectionConsent: boolean;
  dataProtectionConsentDate?: string;
  electronicCommunicationConsent?: boolean;
  electronicCommunicationConsentDate?: string;
  
  // Status und Metadaten (optional für Formulare)
  status?: 'aktiv' | 'wartend' | 'inaktiv' | 'entlassen';
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastVisit?: string;
  admissionDate?: string;
  
  // Hinweis-System
  hasHint?: boolean;
  hintText?: string;
  
  // Versicherungsdaten (erweitert)
  insuranceNumber?: string;
  exemptFromCopay?: boolean;
  copayExemptionReason?: 'chronically_ill' | 'low_income' | 'pensioner' | 'student' | 'other';
  
  // Zusatzversicherungen
  additionalInsurances?: {
    hospitalInsurance?: {
      hasInsurance: boolean;
      insuranceCompany?: string;
      policyNumber?: string;
      coverageType?: 'single_room' | 'double_room' | 'standard';
      reimbursementRate?: number;
      maxDailyRate?: number;
      validFrom?: string;
      validUntil?: string;
    };
    privateDoctorInsurance?: {
      hasInsurance: boolean;
      insuranceCompany?: string;
      policyNumber?: string;
      reimbursementRate?: number;
      maxReimbursementPerYear?: number;
      deductible?: number;
      validFrom?: string;
      validUntil?: string;
    };
    dentalInsurance?: {
      hasInsurance: boolean;
      insuranceCompany?: string;
      policyNumber?: string;
      reimbursementRate?: number;
      maxReimbursementPerYear?: number;
      validFrom?: string;
      validUntil?: string;
    };
    opticalInsurance?: {
      hasInsurance: boolean;
      insuranceCompany?: string;
      policyNumber?: string;
      reimbursementRate?: number;
      maxReimbursementPerYear?: number;
      validFrom?: string;
      validUntil?: string;
    };
    medicalAidsInsurance?: {
      hasInsurance: boolean;
      insuranceCompany?: string;
      policyNumber?: string;
      reimbursementRate?: number;
      maxReimbursementPerYear?: number;
      validFrom?: string;
      validUntil?: string;
    };
    travelInsurance?: {
      hasInsurance: boolean;
      insuranceCompany?: string;
      policyNumber?: string;
      validFrom?: string;
      validUntil?: string;
      coverageCountries?: string[];
    };
  };
  
  // e-card Informationen
  ecard?: {
    cardNumber?: string;
    validFrom?: string;
    validUntil?: string;
    lastValidated?: string;
    validationStatus?: 'valid' | 'invalid' | 'expired' | 'not_checked';
    elgaId?: string;
    elgaStatus?: 'active' | 'inactive' | 'not_registered';
  };
  
  // Zusätzliche Notizen
  notes?: string;
  specialInstructions?: string;
}

// Alias für Rückwärtskompatibilität
export type PatientExtended = PatientAdmissionData;

// Hilfsfunktionen für Validierung
export const validatePatientData = (patient: Partial<any>): string[] => {
  const errors: string[] = [];
  
  // Pflichtfelder prüfen
  if (!patient.firstName?.trim()) errors.push('Vorname ist erforderlich');
  if (!patient.lastName?.trim()) errors.push('Nachname ist erforderlich');
  if (!patient.dateOfBirth) errors.push('Geburtsdatum ist erforderlich');
  if (!patient.gender) errors.push('Geschlecht ist erforderlich');
  if (!patient.socialSecurityNumber?.trim()) errors.push('Sozialversicherungsnummer ist erforderlich');
  if (!patient.insuranceProvider?.trim()) errors.push('Versicherungsanstalt ist erforderlich');
  if (!patient.phone?.trim()) errors.push('Telefonnummer ist erforderlich');
  if (!patient.address?.street?.trim()) errors.push('Straße ist erforderlich');
  if (!patient.address?.zipCode?.trim()) errors.push('PLZ ist erforderlich');
  if (!patient.address?.city?.trim()) errors.push('Ort ist erforderlich');
  if (!patient.dataProtectionConsent) errors.push('Datenschutz-Einverständnis ist erforderlich');
  
  // Format-Validierung
  if (patient.socialSecurityNumber && !/^\d{10}$/.test(patient.socialSecurityNumber)) {
    errors.push('Sozialversicherungsnummer muss 10 Ziffern haben');
  }
  
  if (patient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email)) {
    errors.push('E-Mail-Adresse ist ungültig');
  }
  
  if (patient.phone && !/^[\+]?[\d\s\-\(\)]{7,}$/.test(patient.phone)) {
    errors.push('Telefonnummer ist ungültig');
  }
  
  if (patient.address?.zipCode && !/^\d{4,5}$/.test(patient.address.zipCode)) {
    errors.push('PLZ muss 4-5 Ziffern haben');
  }
  
  return errors;
};

// Österreichische Versicherungsanstalten
export const INSURANCE_PROVIDERS = [
  'ÖGK (Österreichische Gesundheitskasse)',
  'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
  'SVS (Sozialversicherung der Selbständigen)',
  'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)',
  'PVA (Pensionsversicherungsanstalt)',
  'Privatversicherung',
  'Selbstzahler',
] as const;

// Blutgruppen
export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'Unbekannt'
] as const;

// Häufige Vorerkrankungen
export const COMMON_CONDITIONS = [
  'Diabetes mellitus',
  'Hypertonie (Bluthochdruck)',
  'Herzerkrankungen',
  'Asthma/COPD',
  'Rheumatische Erkrankungen',
  'Schilddrüsenerkrankungen',
  'Depression/Angststörungen',
  'Epilepsie',
  'Migräne',
  'Allergien',
  'Krebserkrankungen',
  'Nierenerkrankungen',
  'Lebererkrankungen',
  'Neurologische Erkrankungen',
  'Psychische Erkrankungen',
  'Andere',
] as const;

// Zuweisungsquellen
export const REFERRAL_SOURCES = [
  { value: 'self', label: 'Selbstzuweiser' },
  { value: 'physician', label: 'Hausarzt' },
  { value: 'hospital', label: 'Krankenhaus' },
  { value: 'specialist', label: 'Facharzt' },
  { value: 'other', label: 'Andere' },
] as const;

// Allergie-Typen
export const ALLERGY_TYPES = [
  { value: 'medication', label: 'Medikamente' },
  { value: 'food', label: 'Nahrungsmittel' },
  { value: 'environmental', label: 'Umwelt' },
  { value: 'other', label: 'Andere' },
] as const;

// Schweregrade
export const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Mittel' },
  { value: 'severe', label: 'Schwer' },
] as const;
