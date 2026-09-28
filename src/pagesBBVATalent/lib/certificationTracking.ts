import type { CertificationTrackingItem, CollaboratorCertificationStatus } from '../types/collaboratorCertification';

export type TrackingOperationalStatus = Extract<CollaboratorCertificationStatus, 'EXPIRED' | 'RECERTIFICATION_PENDING' | 'EXPIRING' | 'FAILED' | 'SCHEDULED' | 'PENDING' | 'APPLIED'>;
export type TrackingInsightTone = 'rose' | 'orange' | 'amber' | 'blue' | 'emerald' | 'slate';

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
}

export interface TrackingInsight {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: TrackingInsightTone;
  status?: TrackingOperationalStatus;
  actionLabel?: string;
}

const parseDate = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calendarDaysFromToday = (value?: string | null, now = new Date()) => {
  const target = parseDate(value);
  if (!target) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

export const trackingPriority = (item: CertificationTrackingItem) => {
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
});

const certificationConcentration = (items: CertificationTrackingItem[]) => {
  if (!items.length) return null;
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.certificationName, (counts.get(item.certificationName) ?? 0) + 1);
  const [label, value] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es-MX'))[0];
  return { label, value, total: items.length };
};

const concentrationDescription = (items: CertificationTrackingItem[]) => {
  const concentration = certificationConcentration(items);
  if (!concentration || concentration.total < 2 || concentration.value < 2) return null;
  if (concentration.value === concentration.total) return `Todos los casos corresponden a ${concentration.label}.`;
  const percentage = (concentration.value / concentration.total) * 100;
  return `${concentration.label} concentra ${concentration.value} de ${concentration.total} casos (${percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%).`;
};

const nearestExpiration = (items: CertificationTrackingItem[], now = new Date()) => {
  return items
    .map((item) => ({ item, days: calendarDaysFromToday(item.expirationDate, now) }))
    .filter((entry): entry is { item: CertificationTrackingItem; days: number } => entry.days !== null && entry.days >= 0)
    .sort((a, b) => a.days - b.days || a.item.certificationName.localeCompare(b.item.certificationName, 'es-MX'))[0] ?? null;
};

export const buildTrackingInsights = (items: CertificationTrackingItem[], now = new Date()): TrackingInsight[] => {
  const insights: TrackingInsight[] = [];
  const expired = items.filter((item) => item.status === 'EXPIRED');
  const recertification = items.filter((item) => item.status === 'RECERTIFICATION_PENDING');
  const expiring = items.filter((item) => item.status === 'EXPIRING');
  const failed = items.filter((item) => item.status === 'FAILED');
  const limitReached = items.filter(hasAttemptLimitReached);

  if (expired.length) {
    insights.push({
      id: 'expired',
      eyebrow: 'Atención inmediata',
      title: `${expired.length} ${expired.length === 1 ? 'certificación está vencida' : 'certificaciones están vencidas'}.`,
      description: concentrationDescription(expired) ?? 'Revisa la vigencia y la acción disponible para cada colaborador.',
      tone: 'rose',
      status: 'EXPIRED',
      actionLabel: 'Ver vencidas',
    });
  }

  if (recertification.length) {
    insights.push({
      id: 'recertification',
      eyebrow: 'Recertificación',
      title: `${recertification.length} ${recertification.length === 1 ? 'certificación requiere' : 'certificaciones requieren'} un nuevo ciclo.`,
      description: concentrationDescription(recertification) ?? 'El estado proviene de las reglas vigentes de recertificación.',
      tone: 'orange',
      status: 'RECERTIFICATION_PENDING',
      actionLabel: 'Ver recertificación',
    });
  }

  if (expiring.length) {
    const nearest = nearestExpiration(expiring, now);
    insights.push({
      id: 'expiring',
      eyebrow: 'Prevención',
      title: `${expiring.length} ${expiring.length === 1 ? 'certificación está' : 'certificaciones están'} próximas a vencer.`,
      description: nearest ? `${nearest.item.certificationName} de ${nearest.item.collaboratorName}: ${expirationContext(nearest.item, now).toLocaleLowerCase('es-MX')}.` : (concentrationDescription(expiring) ?? 'Revisa las fechas de vencimiento para anticipar la recertificación.'),
      tone: 'amber',
      status: 'EXPIRING',
      actionLabel: 'Ver próximas',
    });
  }

  if (limitReached.length) {
    insights.push({
      id: 'attempt-limit',
      eyebrow: 'Intentos',
      title: `${limitReached.length} ${limitReached.length === 1 ? 'registro alcanzó' : 'registros alcanzaron'} el máximo configurado de intentos.`,
      description: 'El límite mostrado corresponde a la configuración real de cada certificación; no se calcula un máximo global.',
      tone: 'slate',
      status: failed.length ? 'FAILED' : undefined,
      actionLabel: failed.length ? 'Revisar reprobadas' : undefined,
    });
  } else if (failed.length) {
    insights.push({
      id: 'failed',
      eyebrow: 'Intentos',
      title: `${failed.length} ${failed.length === 1 ? 'certificación tiene' : 'certificaciones tienen'} un resultado no aprobado en el ciclo actual.`,
      description: 'Consulta los intentos disponibles antes de registrar el siguiente resultado.',
      tone: 'blue',
      status: 'FAILED',
      actionLabel: 'Ver reprobadas',
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'clear',
      eyebrow: 'Seguimiento',
      title: 'No hay elementos prioritarios en el contexto actual.',
      description: 'El resultado corresponde únicamente a los registros que requieren seguimiento y a los filtros activos.',
      tone: 'emerald',
    });
  }

  return insights.slice(0, 4);
};
