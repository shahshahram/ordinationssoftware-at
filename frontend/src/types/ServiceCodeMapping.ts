/**
 * TypeScript-Interfaces für Service-Code-Mapping
 */

export interface ServiceCodeMappingProviderMapping {
  insuranceProvider: 'oegk' | 'bvaeb' | 'svs' | 'kfa' | 'pva' | 'vaeb' | 'auva';
  code: string;
  name?: string;
  price?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export interface ServiceCodeMapping {
  _id?: string;
  baseCode: string;
  baseName: string;
  mappings: ServiceCodeMappingProviderMapping[];
  specialty?: string;
  category?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateServiceCodeMappingData {
  baseCode: string;
  baseName: string;
  mappings: Omit<ServiceCodeMappingProviderMapping, 'isActive'>[];
  specialty?: string;
  category?: string;
}

export interface UpdateServiceCodeMappingData {
  baseName?: string;
  mappings?: ServiceCodeMappingProviderMapping[];
  specialty?: string;
  category?: string;
  isActive?: boolean;
}
