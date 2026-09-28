export const CERTIFICATION_COMMUNICATION_CONTEXTS = [
  'APPROVED', 'FIRST_FAILED', 'INTERMEDIATE_FAILED', 'LAST_FAILED', 'LOW', 'DEFAULT',
] as const;
export type CertificationCommunicationContext = (typeof CERTIFICATION_COMMUNICATION_CONTEXTS)[number];
export type CertificationCommunicationEmailStatus = 'NOT_PREPARED' | 'PREPARED' | 'SENT' | 'FAILED';

export interface CertificationCommunicationSource {
  collaboratorId: string;
  certificationRecordId: string;
  certificationId: string;
  certificationName: string;
  certificationType: string;
  technologyName: string | null;
  fullName: string;
  firstName: string;
  recipientEmail: string | null;
  currentCycle: number;
  maxAttempts: number | null;
  baseStatus: string;
  attemptId: string;
  attemptNumber: number;
  attemptDate: string | null;
  result: 'PENDING' | 'APPROVED' | 'FAILED';
  score10: number | null;
}

export interface CertificationPostcardTemplateRecord {
  id: string;
  certificationId: string | null;
  context: CertificationCommunicationContext;
  version: number;
  name: string;
  eyebrowTemplate: string | null;
  titleTemplate: string;
  messageTemplate: string;
  accent: string | null;
}

export interface CertificationEmailTemplateRecord {
  id: string;
  certificationId: string | null;
  context: CertificationCommunicationContext;
  version: number;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface CertificationCommunicationRecord {
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

export interface CommunicationVariables {
  fullName: string;
  firstName: string;
  certificationName: string;
  score: string;
  result: string;
  attemptNumber: string;
  maxAttempts: string;
  remainingAttempts: string;
  attemptDate: string;
}

export const CRITICAL_EXIT_CERTIFICATION_TYPES = new Set(['DEVELOPMENT_SECURITY', 'TECHNOLOGICAL', 'NORMATIVE_TESTING']);

export function isCriticalTwoAttemptFailure(source: Pick<CertificationCommunicationSource, 'certificationType' | 'result' | 'attemptNumber' | 'maxAttempts'>): boolean {
  return source.result === 'FAILED'
    && CRITICAL_EXIT_CERTIFICATION_TYPES.has(source.certificationType)
    && source.maxAttempts === 2
    && source.attemptNumber >= 2;
}

export function resolveCommunicationContext(source: CertificationCommunicationSource): CertificationCommunicationContext {
  if (source.result === 'APPROVED') return 'APPROVED';
  if (source.result === 'FAILED') {
    if (isCriticalTwoAttemptFailure(source)) return 'LOW';
    if (source.attemptNumber === 1) return 'FIRST_FAILED';
    if (source.maxAttempts !== null && source.attemptNumber >= source.maxAttempts) return 'LAST_FAILED';
    return 'INTERMEDIATE_FAILED';
  }
  return 'DEFAULT';
}

export function communicationVariables(source: CertificationCommunicationSource): CommunicationVariables {
  const remaining = source.maxAttempts === null ? '' : String(Math.max(0, source.maxAttempts - source.attemptNumber));
  return {
    fullName: source.fullName,
    firstName: source.firstName || source.fullName.split(/\s+/)[0] || source.fullName,
    certificationName: source.certificationName,
    score: source.score10 === null ? '' : String(source.score10),
    result: source.result === 'APPROVED' ? 'Aprobado' : source.result === 'FAILED' ? 'No aprobado' : 'Pendiente',
    attemptNumber: String(source.attemptNumber),
    maxAttempts: source.maxAttempts === null ? '' : String(source.maxAttempts),
    remainingAttempts: remaining,
    attemptDate: source.attemptDate ?? 'Sin fecha',
  };
}

export function renderCommunicationTemplate(template: string | null | undefined, variables: CommunicationVariables): string {
  return String(template ?? '').replace(/\{\{([a-zA-Z]+)\}\}/g, (_match, key: keyof CommunicationVariables) => variables[key] ?? '');
}
