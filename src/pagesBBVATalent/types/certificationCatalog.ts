export const CERTIFICATION_TYPES = ['TECHNOLOGICAL', 'METHODOLOGICAL', 'DEVELOPMENT_SECURITY', 'NORMATIVE_TESTING', 'COMPLIANCE'] as const;
export type CertificationType = (typeof CERTIFICATION_TYPES)[number];
export const CERTIFICATION_LEVELS = ['JR', 'STD', 'SR', 'GENERIC'] as const;
export type CertificationLevel = (typeof CERTIFICATION_LEVELS)[number];
export type CertificationCatalogStatus = 'ACTIVE' | 'INACTIVE';

export const CERTIFICATION_TYPE_LABELS: Record<CertificationType, string> = {
  TECHNOLOGICAL: 'Tecnológica',
  METHODOLOGICAL: 'Metodológica',
  DEVELOPMENT_SECURITY: 'Desarrollo Seguro',
  NORMATIVE_TESTING: 'Normativa & Testing',
  COMPLIANCE: 'Cumplimiento',
};

export const CERTIFICATION_LEVEL_LABELS: Record<CertificationLevel, string> = {
  JR: 'Junior', STD: 'Standard', SR: 'Senior', GENERIC: 'Genérico',
};

export interface CertificationProfileRule {
  profileId: string;
  profileName: string;
  profileSeniority: string | null;
  mandatory: boolean;
}

export interface CertificationProfileRulePayload {
  profileId: string;
  mandatory: boolean;
}

export interface CertificationCatalogRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  certificationType: CertificationType;
  provider: string | null;
  technologyId: string | null;
  technologyName: string | null;
  validityMonths: number | null;
  initialCompletionMonths: number | null;
  expiringSoonDays: number | null;
  firstAttemptCost: number | null;
  subsequentAttemptCost: number | null;
  costCurrency: string | null;
  includesTraining: boolean;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  defaultMandatory: boolean;
  requirementGroup: string | null;
  requirementGroupMinimum: number | null;
  status: CertificationCatalogStatus;
  allowedLevels: CertificationLevel[];
  profileRules: CertificationProfileRule[];
  profileCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export interface CertificationCatalogPayload {
  code: string;
  name: string;
  description: string;
  certificationType: CertificationType;
  provider: string;
  technologyId: string;
  validityMonths: number | null;
  initialCompletionMonths: number | null;
  expiringSoonDays: number | null;
  firstAttemptCost: number | null;
  subsequentAttemptCost: number | null;
  costCurrency: string;
  includesTraining: boolean;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  defaultMandatory: boolean;
  requirementGroup: string;
  requirementGroupMinimum: number | null;
  allowedLevels: CertificationLevel[];
  profileRules: CertificationProfileRulePayload[];
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
  code: string;
  name: string;
  certificationType: CertificationType;
  technologyId: string | null;
  technologyName: string | null;
  validityMonths: number | null;
  initialCompletionMonths: number | null;
  expiringSoonDays: number | null;
  recertificationEnabled: boolean;
  defaultMandatory: boolean;
}
