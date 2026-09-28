export type CollaboratorCertificationStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'APPLIED'
  | 'FAILED'
  | 'VALID'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'RECERTIFICATION_PENDING'
  | 'NOT_APPLICABLE';

export type CertificationAttemptResult = 'PENDING' | 'APPROVED' | 'FAILED';
export type CertificationCriticalResolutionStatus = 'PENDING_REVIEW' | 'LOW_REQUESTED' | 'INTERN' | 'LOW_CONFIRMED';

export interface CertificationCriticalResolutionPayload {
  resolution: 'LOW_REQUESTED' | 'INTERN';
  notes?: string;
}

export const COLLABORATOR_CERTIFICATION_STATUS_LABELS: Record<CollaboratorCertificationStatus, string> = {
  PENDING: 'Pendiente',
  SCHEDULED: 'Programada',
  APPLIED: 'Aplicada',
  FAILED: 'Reprobada',
  VALID: 'Vigente',
  EXPIRING: 'Próxima a vencer',
  EXPIRED: 'Vencida',
  RECERTIFICATION_PENDING: 'Recertificación pendiente',
  NOT_APPLICABLE: 'No aplica',
};

export interface CollaboratorCertification {
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
  lastScore10: number | null;
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

export interface CertificationAttempt {
  id: string;
  certificationRecordId: string;
  cycleNumber: number;
  attemptNumber: number;
  applicationDate: string | null;
  result: CertificationAttemptResult;
  notes: string | null;
  createdAt: string;
  createdByEmail: string;
}

export interface CertificationHistoryItem {
  id: string;
  certificationRecordId: string;
  eventType: string;
  description: string;
  createdAt: string;
  createdByEmail: string;
}

export interface CollaboratorCertificationDetail {
  item: CollaboratorCertification;
  attempts: CertificationAttempt[];
  history: CertificationHistoryItem[];
}


export interface CertificationTrackingItem {
  collaboratorId: string;
  personId: string;
  collaboratorName: string;
  profile: string | null;
  technology: string | null;
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
  criticalActionRequired: boolean;
  criticalResolutionStatus: CertificationCriticalResolutionStatus | null;
  criticalResolutionNotes: string | null;
  criticalResolutionAt: string | null;
}

export type CertificationCommunicationContext = 'APPROVED' | 'FIRST_FAILED' | 'INTERMEDIATE_FAILED' | 'LAST_FAILED' | 'LOW' | 'DEFAULT';
export type CertificationCommunicationEmailStatus = 'NOT_PREPARED' | 'PREPARED' | 'SENT' | 'FAILED';

export interface CertificationCommunication {
  id: string;
  certificationRecordId: string;
  attemptId: string | null;
  cycleNumber: number;
  context: CertificationCommunicationContext;
  postcardTemplateId: string;
  postcardTemplateVersion: number;
  pngBase64: string;
  recipientEmail: string | null;
  ccEmails: string[];
  emailStatus: CertificationCommunicationEmailStatus;
  emailTemplateId: string | null;
  emailTemplateVersion: number | null;
  emailSubject: string | null;
  emailBody: string | null;
  generatedAt: string;
  providerConfigured: boolean;
  providerMessage: string;
}
