import { bbvaBusinessDate } from '../../lib/bbvaBusinessDate';
import type { CertificationTrackingItem } from '../types/collaboratorCertification';

export interface TrackingSummary {
  total: number;
  expired: number;
  recertificationPending: number;
  expiring: number;
  failed: number;
  scheduled: number;
  pending: number;
  applied: number;
  limitReached: number;
  criticalExit: number;
}

const dateEpoch = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const epoch = Date.UTC(year, month - 1, day);
  return Number.isNaN(epoch) ? null : epoch;
};

export const calendarDaysFromToday = (value?: string | null, now = new Date()) => {
  const target = dateEpoch(value);
  const today = dateEpoch(bbvaBusinessDate(now));
  if (target === null || today === null) return null;
  return Math.round((target - today) / 86_400_000);
};

export const requiresCriticalExitReview = (item: CertificationTrackingItem) => item.criticalActionRequired === true;

export const hasOpenCriticalResolution = (item: CertificationTrackingItem) =>
  requiresCriticalExitReview(item) || item.criticalResolutionStatus === 'LOW_REQUESTED';

export const trackingPriority = (item: CertificationTrackingItem) => {
  if (hasOpenCriticalResolution(item)) return 0;
  if (item.status === 'EXPIRED') return 1;
  if (item.status === 'RECERTIFICATION_PENDING') return 2;
  if (item.status === 'EXPIRING') return 3;
  if (item.status === 'FAILED') return 4;
  if (item.status === 'SCHEDULED') return 5;
  if (item.status === 'PENDING') return 6;
  if (item.status === 'APPLIED') return 7;
  return 8;
};

export const expirationContext = (item: CertificationTrackingItem, now = new Date()) => {
  const days = calendarDaysFromToday(item.expirationDate, now);
  if (days === null) return item.status === 'RECERTIFICATION_PENDING' ? 'Recertificación pendiente' : 'Sin fecha de vencimiento';
  if (days < 0) {
    const elapsed = Math.abs(days);
    return elapsed === 1 ? 'Venció hace 1 día' : `Venció hace ${elapsed} días`;
  }
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
};

export const scheduledContext = (value?: string | null, now = new Date()) => {
  const days = calendarDaysFromToday(value, now);
  if (days === null) return null;
  if (days < 0) return `Programada hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`;
  if (days === 0) return 'Programada para hoy';
  if (days === 1) return 'Programada para mañana';
  return `Programada en ${days} días`;
};

export const hasAttemptLimitReached = (item: CertificationTrackingItem) => item.requiresAttempts
  && item.maxAttempts !== null
  && item.attemptCount >= item.maxAttempts
  && ['FAILED', 'PENDING', 'SCHEDULED', 'APPLIED'].includes(item.status);

export const remainingAttempts = (item: CertificationTrackingItem) => {
  if (!item.requiresAttempts || item.maxAttempts === null) return null;
  return Math.max(0, item.maxAttempts - item.attemptCount);
};

export const attemptContext = (item: CertificationTrackingItem) => {
  if (!item.requiresAttempts) return 'Sin control de intentos';
  if (item.latestAttemptResult === 'APPROVED' && ['EXPIRING', 'EXPIRED', 'RECERTIFICATION_PENDING'].includes(item.status)) {
    return `${item.attemptCount} ${item.attemptCount === 1 ? 'intento en ciclo aprobado' : 'intentos en ciclo aprobado'}`;
  }
  if (item.maxAttempts === null) return `${item.attemptCount} ${item.attemptCount === 1 ? 'intento registrado' : 'intentos registrados'}`;
  const remaining = remainingAttempts(item) ?? 0;
  if (remaining === 0) return 'Límite de intentos alcanzado';
  if (remaining === 1) return 'Último intento disponible';
  return `${remaining} intentos disponibles`;
};

export const buildTrackingSummary = (items: CertificationTrackingItem[]): TrackingSummary => ({
  total: items.length,
  expired: items.filter((item) => item.status === 'EXPIRED').length,
  recertificationPending: items.filter((item) => item.status === 'RECERTIFICATION_PENDING').length,
  expiring: items.filter((item) => item.status === 'EXPIRING').length,
  failed: items.filter((item) => item.status === 'FAILED').length,
  scheduled: items.filter((item) => item.status === 'SCHEDULED' || Boolean(item.scheduledDate)).length,
  pending: items.filter((item) => item.status === 'PENDING').length,
  applied: items.filter((item) => item.status === 'APPLIED').length,
  limitReached: items.filter(hasAttemptLimitReached).length,
  criticalExit: items.filter(hasOpenCriticalResolution).length,
});
