export const CERTIFICATION_TYPES = [
  'TECHNOLOGICAL',
  'METHODOLOGICAL',
  'DEVELOPMENT_SECURITY',
  'NORMATIVE_TESTING',
  'COMPLIANCE',
] as const;
export type CertificationType = (typeof CERTIFICATION_TYPES)[number];

export const CERTIFICATION_LEVELS = ['JR', 'STD', 'SR', 'GENERIC'] as const;
export type CertificationLevel = (typeof CERTIFICATION_LEVELS)[number];
export type CertificationCatalogStatus = 'ACTIVE' | 'INACTIVE';

export interface CertificationCatalogInput {
  name: string;
  description: string | null;
  certificationType: CertificationType;
  provider: string | null;
  technologyId: string | null;
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
  allowedLevels: CertificationLevel[];
}

export interface CertificationCatalogRecord {
  id: string;
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
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

export type CertificationCatalogListItem = CertificationCatalogRecord;

export interface CertificationCatalogListParams {
  search?: string;
  status?: CertificationCatalogStatus | 'ALL';
  certificationType?: CertificationType | 'ALL';
  page?: number;
  size?: number;
  sort?: 'name' | 'certificationType' | 'provider' | 'validityMonths' | 'updatedAt' | 'status';
  direction?: 'asc' | 'desc';
}

export interface CertificationCatalogPage {
  items: CertificationCatalogListItem[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface CertificationCatalogOption {
  id: string;
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
