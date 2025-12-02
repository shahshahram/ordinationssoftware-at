import { useState, useCallback } from 'react';
import api from '../utils/api';

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

