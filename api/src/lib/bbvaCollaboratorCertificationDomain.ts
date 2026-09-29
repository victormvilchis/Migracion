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

export const CERTIFICATION_CRITICAL_RESOLUTION_STATUSES = ['PENDING_REVIEW', 'LOW_REQUESTED', 'INTERN', 'LOW_CONFIRMED'] as const;
export type CertificationCriticalResolutionStatus = (typeof CERTIFICATION_CRITICAL_RESOLUTION_STATUSES)[number];

export interface CollaboratorCertificationRecord {
  id: string;
  collaboratorId: string;
  personId: string;
  certificationId: string;
  certificationName: string;
  certificationType: string;
  provider: string | null;
  technologyName: string | null;
  certificationLevel: 'JR' | 'STD' | 'SR' | 'GENERIC' | null;
  mandatory: boolean;
  applicable: boolean;
  source: 'AUTO' | 'MANUAL';
  initialDueDate: string | null;
  bbvaStartDate: string | null;
  initialCompletionDays: number | null;
  firstAttemptDueDate: string | null;
  initialSchedulePhase: 'FIRST_ATTEMPT' | 'SECOND_ATTEMPT' | null;
  initialScheduleDueDate: string | null;
  daysToInitialSchedule: number | null;
  initialScheduleTiming: 'ON_TIME' | 'DUE_TODAY' | 'OVERDUE' | null;
  importedCertificationStatus: string | null;
  importedExamStatus: string | null;
  lastScore10: number | null;
  tracksScore: boolean;
  importedAttemptNumber: number | null;
  lastDataSource: 'MANUAL' | 'IMPORT' | 'AUTO' | null;
  lastImportFingerprint: string | null;
  lastImportedAt: string | null;
  softtekManagement: string | null;
  currentCycle: number;
  baseStatus: 'PENDING' | 'SCHEDULED' | 'APPLIED' | 'FAILED' | 'APPROVED' | 'NOT_APPLICABLE';
  status: CollaboratorCertificationStatus;
  attemptCount: number;
  applicationDate: string | null;
  scheduledDate: string | null;
  approvedDate: string | null;
  expirationDate: string | null;
  validityMonths: number | null;
  expiringSoonDays: number | null;
  maxAttempts: number | null;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  criticalActionRequired: boolean;
  criticalResolutionStatus: CertificationCriticalResolutionStatus | null;
  criticalResolutionNotes: string | null;
  criticalResolutionAt: string | null;
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
  notes: string | null;
  score10: number | null;
  source: 'MANUAL' | 'IMPORT';
  importFingerprint: string | null;
  createdAt: string;
  createdByEmail: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
}

export interface CertificationHistoryRecord {
  id: string;
  certificationRecordId: string;
  eventType: string;
  description: string;
  source: 'MANUAL' | 'IMPORT' | 'AUTO';
  createdAt: string;
  createdByEmail: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
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


export interface CertificationTrackingRecord {
  collaboratorId: string;
  personId: string;
  collaboratorName: string;
  profile: string | null;
  technology: string | null;
  bbvaStructureLevel2: string | null;
  bbvaStructureLevel3: string | null;
  bbvaStartDate: string | null;
  initialCompletionDays: number | null;
  initialDueDate: string | null;
  firstAttemptDueDate: string | null;
  initialSchedulePhase: 'FIRST_ATTEMPT' | 'SECOND_ATTEMPT' | null;
  initialScheduleDueDate: string | null;
  daysToInitialSchedule: number | null;
  initialScheduleTiming: 'ON_TIME' | 'DUE_TODAY' | 'OVERDUE' | null;
  quarterCode: string | null;
  certificationRecordId: string;
  certificationId: string;
  certificationName: string;
  certificationType: string;
  technologyName: string | null;
  status: CollaboratorCertificationStatus;
  currentCycle: number;
  attemptCount: number;
  nextAttemptNumber: number;
  maxAttempts: number | null;
  scheduledDate: string | null;
  lastApplicationDate: string | null;
  approvedDate: string | null;
  expirationDate: string | null;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  latestAttemptId: string | null;
  latestAttemptResult: CertificationAttemptResult | null;
  tracksScore: boolean;
  criticalActionRequired: boolean;
  criticalResolutionStatus: CertificationCriticalResolutionStatus | null;
  criticalResolutionNotes: string | null;
  criticalResolutionAt: string | null;
}

export interface CertificationCriticalResolutionInput {
  resolution: 'LOW_REQUESTED' | 'INTERN';
  notes: string | null;
}

export interface CertificationAttemptInput {
  applicationDate: string | null;
  result: CertificationAttemptResult;
  score10: number | null;
  notes: string | null;
}

export interface CertificationAttemptUpdateInput extends CertificationAttemptInput {
  attemptNumber: number;
}

export interface CertificationUpdateInput {
  scheduledDate: string | null;
  notes: string | null;
  mandatory: boolean;
}
