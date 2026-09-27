export const CERTIFICATION_TYPES = ['TECHNOLOGICAL', 'METHODOLOGICAL', 'DEVELOPMENT_SECURITY', 'NORMATIVE_TESTING', 'COMPLIANCE'] as const;
export type CertificationType = (typeof CERTIFICATION_TYPES)[number];
export const CERTIFICATION_LEVELS = ['JR', 'STD', 'SR', 'GENERIC'] as const;
export type CertificationLevel = (typeof CERTIFICATION_LEVELS)[number];
export type CertificationCatalogStatus = 'ACTIVE' | 'INACTIVE';

export const CERTIFICATION_TYPE_LABELS: Record<CertificationType, string> = {
  TECHNOLOGICAL: 'Tecnológica',
  METHODOLOGICAL: 'Metodológica',
  DEVELOPMENT_SECURITY: 'Desarrollo seguro',
  NORMATIVE_TESTING: 'Normativa y pruebas',
  COMPLIANCE: 'Cumplimiento',
};

export const CERTIFICATION_LEVEL_LABELS: Record<CertificationLevel, string> = {
  JR: 'Junior', STD: 'Estándar', SR: 'Senior', GENERIC: 'Genérico',
};

export interface CertificationCatalogRecord {
  id: string;
  name: string;
  description: string | null;
  certificationType: CertificationType;
  provider: string | null;
  technologyId: string | null;
  technologyName: string | null;
  validityMonths: number | null;
  initialCompletionDays: number | null;
  expiringSoonDays: number | null;
  maxAttempts: number | null;
  includesTraining: boolean;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  defaultMandatory: boolean;
  requirementGroup: string | null;
  requirementGroupMinimum: number | null;
  status: CertificationCatalogStatus;
  allowedLevels: CertificationLevel[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface CertificationCatalogPayload {
  name: string;
  description: string;
  certificationType: CertificationType;
  provider: string;
  technologyId: string;
  validityMonths: number | null;
  initialCompletionDays: number | null;
  expiringSoonDays: number | null;
  maxAttempts: number | null;
  includesTraining: boolean;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  defaultMandatory: boolean;
  requirementGroup: string;
  requirementGroupMinimum: number | null;
  allowedLevels: CertificationLevel[];
}

export interface CertificationCatalogPageResponse {
  items: CertificationCatalogRecord[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  storage: string;
}

export interface CertificationCatalogOption {
  id: string;
  name: string;
  certificationType: CertificationType;
  technologyId: string | null;
  technologyName: string | null;
  validityMonths: number | null;
  initialCompletionDays: number | null;
  expiringSoonDays: number | null;
  recertificationEnabled: boolean;
  defaultMandatory: boolean;
}
