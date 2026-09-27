export const COLLABORATOR_CERTIFICATION_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'APPLIED',
  'FAILED',
  'VALID',
  'EXPIRING',
  'EXPIRED',
  'RECERTIFICATION_PENDING',
  'NOT_APPLICABLE',
] as const;
export type CollaboratorCertificationStatus = (typeof COLLABORATOR_CERTIFICATION_STATUSES)[number];

export const CERTIFICATION_ATTEMPT_RESULTS = ['PENDING', 'APPROVED', 'FAILED'] as const;
export type CertificationAttemptResult = (typeof CERTIFICATION_ATTEMPT_RESULTS)[number];

export interface CollaboratorCertificationRecord {
  id: string;
  collaboratorId: string;
  personId: string;
  certificationId: string;
  certificationName: string;
  certificationType: string;
  provider: string | null;
  technologyName: string | null;
  mandatory: boolean;
  applicable: boolean;
  source: 'AUTO' | 'MANUAL';
  initialDueDate: string | null;
  importedCertificationStatus: string | null;
  importedExamStatus: string | null;
  lastScore10: number | null;
  importedAttemptNumber: number | null;
  lastDataSource: 'MANUAL' | 'IMPORT' | 'AUTO' | null;
  lastImportFingerprint: string | null;
  lastImportedAt: string | null;
  currentCycle: number;
  baseStatus: 'PENDING' | 'SCHEDULED' | 'APPLIED' | 'FAILED' | 'APPROVED' | 'NOT_APPLICABLE';
  status: CollaboratorCertificationStatus;
  attemptCount: number;
  applicationDate: string | null;
  approvedDate: string | null;
  expirationDate: string | null;
  validityMonths: number | null;
  expiringSoonDays: number | null;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorCertificationSummary {
  total: number;
  applicable: number;
  valid: number;
  expiring: number;
  expired: number;
  pending: number;
  failed: number;
  recertificationPending: number;
  coveragePercent: number;
}

export interface CollaboratorCertificationAttemptRecord {
  id: string;
  certificationRecordId: string;
  cycleNumber: number;
  attemptNumber: number;
  applicationDate: string | null;
  result: CertificationAttemptResult;
  resultDate: string | null;
  costAmount: number | null;
  costCurrency: string | null;
  notes: string | null;
  score10: number | null;
  source: 'MANUAL' | 'IMPORT';
  importFingerprint: string | null;
  createdAt: string;
  createdByEmail: string;
}

export interface CertificationHistoryRecord {
  id: string;
  certificationRecordId: string;
  eventType: string;
  description: string;
  source: 'MANUAL' | 'IMPORT' | 'AUTO';
  createdAt: string;
  createdByEmail: string;
}

export interface CollaboratorCertificationDetail {
  item: CollaboratorCertificationRecord;
  attempts: CollaboratorCertificationAttemptRecord[];
  history: CertificationHistoryRecord[];
}

export interface CollaboratorCertificationListResult {
  items: CollaboratorCertificationRecord[];
  summary: CollaboratorCertificationSummary;
}

export interface CertificationAttemptInput {
  applicationDate: string | null;
  result: CertificationAttemptResult;
  resultDate: string | null;
  notes: string | null;
}

export interface CertificationUpdateInput {
  applicationDate: string | null;
  notes: string | null;
  mandatory: boolean;
}
