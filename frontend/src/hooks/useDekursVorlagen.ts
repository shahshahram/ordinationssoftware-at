import { useState, useCallback } from 'react';
import api from '../utils/api';

export interface LinkedMedication {
  medicationId?: string;
  name: string;
  dosage?: string;
  dosageUnit?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  quantity?: number;
  quantityUnit?: string;
  route?: 'oral' | 'topical' | 'injection' | 'inhalation' | 'rectal' | 'vaginal' | 'sublingual' | 'intravenous' | 'intramuscular' | 'subcutaneous' | 'other';
  changeType?: 'added' | 'modified' | 'discontinued' | 'unchanged';
  notes?: string;
}

export interface DekursVorlage {
  _id: string;
  code: string;
  title: string;
  icd10?: string;
  icd10Title?: string;
  specialty?: string;
  specialties?: string[];
  locationIds?: string[];
  template: {
    visitReason?: string;
    clinicalObservations?: string;
    findings?: string;
    progressChecks?: string;
    treatmentDetails?: string;
    notes?: string;
    psychosocialFactors?: string;
    medicationChanges?: string;
    imagingFindings?: string;
    laboratoryFindings?: string;
  };
  linkedMedications?: LinkedMedication[];
  elga_structured?: any;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  tags?: string[];
  version: number;
  createdBy?: any;
  lastModifiedBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface SearchParams {
  icd10?: string;
  specialty?: string;
  locationId?: string;
  query?: string;
}

export const useDekursVorlagen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTemplates = useCallback(async (params: SearchParams): Promise<DekursVorlage[]> => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.icd10) queryParams.append('icd10', params.icd10);
      if (params.specialty) queryParams.append('specialty', params.specialty);
      if (params.locationId) queryParams.append('locationId', params.locationId);
      if (params.query) queryParams.append('query', params.query);

      const response: any = await api.get(`/dekurs-vorlagen/search?${queryParams.toString()}`);
      if (response.data?.success) {
        return response.data.data || [];
      }
      return [];
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Laden der Vorlagen');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplate = useCallback(async (id: string): Promise<DekursVorlage | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await api.get(`/dekurs-vorlagen/${id}`);
      if (response.data?.success) {
        return response.data.data;
      }
      return null;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Laden der Vorlage');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const insertTemplate = useCallback((template: DekursVorlage, patientName?: string, patientAge?: number, doctorName?: string): any => {
    const templateData = template.template || {};
    
    // Platzhalter ersetzen
    const replacePlaceholders = (text: string | undefined): string => {
      if (!text) return '';
      return text
        .replace(/\{\{patientName\}\}/g, patientName || 'Patient')
        .replace(/\{\{patientAge\}\}/g, patientAge?.toString() || '')
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('de-DE'))
        .replace(/\{\{doctorName\}\}/g, doctorName || '');
    };

    // Medikamente aus Vorlage übernehmen
    const linkedMedications = (template.linkedMedications || []).map((med: any) => {
      let startDate: Date | undefined = undefined;
      let endDate: Date | undefined = undefined;
      
      if (med.startDate) {
        if (typeof med.startDate === 'string') {
          startDate = new Date(med.startDate);
        } else if (med.startDate instanceof Date) {
          startDate = med.startDate;
        } else if (med.startDate.toISOString) {
          startDate = new Date(med.startDate.toISOString());
        }
      }
      
      if (med.endDate) {
        if (typeof med.endDate === 'string') {
          endDate = new Date(med.endDate);
        } else if (med.endDate instanceof Date) {
          endDate = med.endDate;
        } else if (med.endDate.toISOString) {
          endDate = new Date(med.endDate.toISOString());
        }
      }
      
      return {
        medicationId: med.medicationId ? (typeof med.medicationId === 'string' ? med.medicationId : med.medicationId.toString()) : undefined,
        name: med.name || '',
        dosage: med.dosage || '',
        dosageUnit: med.dosageUnit || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || '',
        startDate: startDate,
        endDate: endDate,
        quantity: med.quantity !== undefined && med.quantity !== null ? med.quantity : undefined,
        quantityUnit: med.quantityUnit || '',
        route: med.route || 'oral',
        changeType: med.changeType || 'added',
        notes: med.notes || ''
      };
    });

    return {
      visitReason: replacePlaceholders(templateData.visitReason),
      clinicalObservations: replacePlaceholders(templateData.clinicalObservations),
      findings: replacePlaceholders(templateData.findings),
      progressChecks: replacePlaceholders(templateData.progressChecks),
      treatmentDetails: replacePlaceholders(templateData.treatmentDetails),
      notes: replacePlaceholders(templateData.notes),
      psychosocialFactors: replacePlaceholders(templateData.psychosocialFactors),
      medicationChanges: replacePlaceholders(templateData.medicationChanges),
      imagingFindings: replacePlaceholders(templateData.imagingFindings),
      laboratoryFindings: replacePlaceholders(templateData.laboratoryFindings),
      linkedMedications: linkedMedications,
      templateId: template._id,
      templateName: template.title,
      templateUsed: {
        templateId: template._id,
        templateName: template.title,
        templateVersion: template.version || 1,
        insertedAt: new Date().toISOString(),
        modified: false,
        originalFields: {
          visitReason: templateData.visitReason || '',
          clinicalObservations: templateData.clinicalObservations || '',
          findings: templateData.findings || '',
          progressChecks: templateData.progressChecks || '',
          treatmentDetails: templateData.treatmentDetails || '',
          notes: templateData.notes || '',
          psychosocialFactors: templateData.psychosocialFactors || '',
          medicationChanges: templateData.medicationChanges || '',
          imagingFindings: templateData.imagingFindings || '',
          laboratoryFindings: templateData.laboratoryFindings || ''
        }
      }
    };
  }, []);

  return {
    searchTemplates,
    getTemplate,
    insertTemplate,
    loading,
    error
  };
};

