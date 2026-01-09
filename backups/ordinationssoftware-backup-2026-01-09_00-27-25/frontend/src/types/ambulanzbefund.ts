/**
 * TypeScript Types für Ambulanzbefund System
 */

export type Specialization = 
  | 'allgemein'
  | 'hno'
  | 'interne'
  | 'chirurgie'
  | 'dermatologie'
  | 'gyn'
  | 'pädiatrie'
  | 'neurologie'
  | 'orthopädie'
  | 'ophthalmologie'
  | 'urologie'
  | 'psychiatrie'
  | 'radiologie'
  | 'pathologie';

export type AmbulanzbefundStatus = 
  | 'draft'
  | 'validated'
  | 'finalized'
  | 'archived'
  | 'exported';

export interface FormFieldDefinition {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect' | 'autocomplete';
  label: string;
  dataSource?: string;
  sectionId?: string;
  required?: boolean;
  visible?: boolean;
  position?: {
    row: number;
    column: number;
    width?: number;
    order: number;
  };
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  formatting?: {
    prefix?: string;
    suffix?: string;
    dateFormat?: string;
    numberFormat?: string;
  };
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helperText?: string;
  defaultValue?: any;
}

export interface FormSectionDefinition {
  id: string;
  label: string;
  description?: string;
  position?: {
    row: number;
    column: number;
    order: number;
  };
  fields: string[]; // Field IDs
  required?: boolean;
  category?: 'basic' | 'specialized' | 'optional';
}

export interface AvailableSection {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  category: 'basic' | 'specialized' | 'optional';
  applicableSpecializations?: string[];
}

export interface FormLayoutDefinition {
  sections?: FormSectionDefinition[];
  fields: FormFieldDefinition[];
  autoSections?: any[];
}

export interface FormDefinition {
  schema: any; // JSON Schema
  layout: FormLayoutDefinition;
  cdaMapping?: Record<string, string>;
}

export interface ELGAIlReference {
  generalIlVersion: string;
  specificIlVersion: string;
  templateId?: string;
  formatCode?: {
    code: string;
    codingScheme: string;
    displayName: string;
  };
  classCode?: {
    code: string;
    codingScheme: string;
    displayName: string;
  };
  typeCode?: {
    code: string;
    codingScheme: string;
    displayName: string;
  };
}

export interface AmbulanzbefundFormTemplate {
  _id: string;
  name: string;
  code: string;
  version: string;
  description?: string;
  elgaIlReference: ELGAIlReference;
  specialization: Specialization;
  formDefinition: FormDefinition;
  availableSections?: AvailableSection[];
  isActive: boolean;
  isDefault: boolean;
  locationId?: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  tags?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  validatedBy?: string;
  validatedAt?: string;
  validationErrors: ValidationError[];
}

export interface CDAExportInfo {
  exported: boolean;
  exportedAt?: string;
  exportedBy?: string;
  xdsDocumentEntryId?: string;
  cdaVersion?: string;
  templateId?: string;
  formatCode?: string;
  classCode?: string;
  typeCode?: string;
}

export interface Ambulanzbefund {
  _id: string;
  documentNumber: string;
  version: number;
  patientId: string | {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
  };
  locationId: string | {
    _id: string;
    name: string;
  };
  createdBy: string | {
    _id: string;
    firstName: string;
    lastName: string;
  };
  specialization: Specialization;
  formTemplateId: string | AmbulanzbefundFormTemplate;
  selectedSections?: string[];
  formData: Record<string, any>;
  anamnesis?: {
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    pastMedicalHistory?: string;
    familyHistory?: string;
    socialHistory?: string;
    reviewOfSystems?: any;
  };
  examination?: {
    general?: any;
    specialized?: any;
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      weight?: number;
      height?: number;
      bmi?: number;
    };
  };
  assessment?: {
    primaryDiagnosis?: {
      code: string;
      display: string;
      codingScheme: string;
    };
    secondaryDiagnoses?: Array<{
      code: string;
      display: string;
      codingScheme: string;
      date?: string;
    }>;
    clinicalImpression?: string;
  };
  plan?: {
    therapy?: string;
    medications?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
    followUp?: {
      date?: string;
      reason?: string;
    };
    referrals?: Array<{
      specialist?: string;
      specialization?: string;
      reason?: string;
      urgency?: 'normal' | 'dringend' | 'notfall';
    }>;
  };
  status: AmbulanzbefundStatus;
  validation: ValidationResult;
  cdaExport: CDAExportInfo;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  notes?: string;
  tags?: string[];
}



