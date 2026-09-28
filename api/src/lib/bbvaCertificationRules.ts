export const CRITICAL_TWO_ATTEMPT_TYPES = new Set([
  'DEVELOPMENT_SECURITY',
  'TECHNOLOGICAL',
  'NORMATIVE_TESTING',
]);

export interface CriticalAttemptState {
  certificationType: string;
  maxAttempts: number | null;
  attemptCount: number;
  latestAttemptResult: string | null;
}

export function isCriticalTwoAttemptExhausted(state: CriticalAttemptState): boolean {
  return CRITICAL_TWO_ATTEMPT_TYPES.has(String(state.certificationType ?? '').toUpperCase())
    && state.maxAttempts === 2
    && state.attemptCount >= 2
    && String(state.latestAttemptResult ?? '').toUpperCase() === 'FAILED';
}

export function isCertificationCovered(status: string | null | undefined): boolean {
  return status === 'VALID' || status === 'EXPIRING';
}

export function isCertificationReadyForTarget(
  status: string | null | undefined,
  expirationDate: string | null | undefined,
  targetStartDate: string | null | undefined,
): boolean {
  if (!isCertificationCovered(status)) return false;
  if (!targetStartDate || !expirationDate) return true;
  return expirationDate >= targetStartDate;
}

export function isCriticalResolutionOpen(status: string | null | undefined): boolean {
  const normalized = String(status ?? 'PENDING_REVIEW').toUpperCase();
  return normalized === 'PENDING_REVIEW' || normalized === 'LOW_REQUESTED';
}
