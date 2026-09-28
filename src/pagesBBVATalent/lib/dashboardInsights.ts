import type { DashboardResponse } from '../types/dashboard';

export type DashboardInsightTone = 'rose' | 'orange' | 'amber' | 'blue' | 'emerald' | 'slate';
export type DashboardOperationalStatus = 'EXPIRED' | 'RECERTIFICATION_PENDING' | 'EXPIRING' | 'PENDING';

type AttentionRow = DashboardResponse['attention'][number];
type AttentionMetric = 'expired' | 'recertificationPending' | 'expiring' | 'pending';

export interface DashboardOperationalPriority {
  key: DashboardOperationalStatus;
  label: string;
  value: number;
  peopleAffected: number;
  context: string;
  tone: DashboardInsightTone;
}

export interface DashboardInsight {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: DashboardInsightTone;
  actionStatus?: DashboardOperationalStatus;
  actionLabel?: string;
}

interface Concentration {
  label: string;
  value: number;
  total: number;
}

const peopleWith = (rows: AttentionRow[], metric: AttentionMetric) => rows.filter((row) => row[metric] > 0).length;

const concentrationByTechnology = (rows: AttentionRow[], metric: AttentionMetric): Concentration | null => {
  const totals = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const value = row[metric];
    if (value <= 0) continue;
    total += value;
    const label = row.technology?.trim() || 'Sin tecnología';
    totals.set(label, (totals.get(label) ?? 0) + value);
  }
  if (!total || !totals.size) return null;
  const [label, value] = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es-MX'))[0];
  return { label, value, total };
};

const concentrationSentence = (concentration: Concentration | null) => {
  if (!concentration) return '';
  const { label, value, total } = concentration;
  if (label === 'Sin tecnología') return '';
  const percentage = total ? (value / total) * 100 : 0;
  if (value === total) return `Las ${total} se concentran en ${label}.`;
  return `${label} concentra ${value} de ${total} (${percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%).`;
};

export const buildDashboardOperationalPriorities = (data: DashboardResponse): DashboardOperationalPriority[] => {
  const rows = data.attention;
  return [
    {
      key: 'EXPIRED',
      label: 'Vencidas',
      value: data.cards.expired,
      peopleAffected: peopleWith(rows, 'expired'),
      context: 'Fuera de vigencia actual.',
      tone: 'rose',
    },
    {
      key: 'RECERTIFICATION_PENDING',
      label: 'Recertificación pendiente',
      value: data.cards.recertificationPending,
      peopleAffected: peopleWith(rows, 'recertificationPending'),
      context: 'Requieren completar el ciclo de recertificación.',
      tone: 'orange',
    },
    {
      key: 'EXPIRING',
      label: 'Próximas a vencer',
      value: data.cards.expiring,
      peopleAffected: peopleWith(rows, 'expiring'),
      context: 'Dentro del periodo de alerta configurado.',
      tone: 'amber',
    },
    {
      key: 'PENDING',
      label: 'Pendientes',
      value: data.cards.pending,
      peopleAffected: peopleWith(rows, 'pending'),
      context: 'Sin cobertura vigente en el estado actual.',
      tone: 'blue',
    },
  ];
};

export const buildDashboardInsights = (data: DashboardResponse): DashboardInsight[] => {
  const rows = data.attention;
  const insights: DashboardInsight[] = [];

  if (data.cards.expired > 0) {
    const people = peopleWith(rows, 'expired');
    const concentration = concentrationSentence(concentrationByTechnology(rows, 'expired'));
    insights.push({
      id: 'expired',
      eyebrow: 'Atención inmediata',
      title: `${data.cards.expired} certificaciones vencidas afectan a ${people} ${people === 1 ? 'persona' : 'personas'}.`,
      description: concentration || 'Revisa el detalle para identificar las certificaciones fuera de vigencia.',
      tone: 'rose',
      actionStatus: 'EXPIRED',
      actionLabel: 'Revisar vencidas',
    });
  }

  if (data.cards.recertificationPending > 0) {
    const people = peopleWith(rows, 'recertificationPending');
    const concentration = concentrationSentence(concentrationByTechnology(rows, 'recertificationPending'));
    insights.push({
      id: 'recertification',
      eyebrow: 'Recertificación',
      title: `${data.cards.recertificationPending} certificaciones requieren recertificación en ${people} ${people === 1 ? 'persona' : 'personas'}.`,
      description: concentration || 'Consulta el seguimiento para revisar el estado de cada ciclo.',
      tone: 'orange',
      actionStatus: 'RECERTIFICATION_PENDING',
      actionLabel: 'Ver recertificación',
    });
  }

  if (data.cards.expiring > 0) {
    const people = peopleWith(rows, 'expiring');
    const concentration = concentrationSentence(concentrationByTechnology(rows, 'expiring'));
    insights.push({
      id: 'expiring',
      eyebrow: 'Prevención',
      title: `${data.cards.expiring} certificaciones próximas a vencer corresponden a ${people} ${people === 1 ? 'persona' : 'personas'}.`,
      description: concentration || 'Están dentro del periodo de alerta configurado y pueden revisarse antes de su vencimiento.',
      tone: 'amber',
      actionStatus: 'EXPIRING',
      actionLabel: 'Revisar próximas',
    });
  }

  if (data.cards.pending > 0) {
    const people = peopleWith(rows, 'pending');
    const concentration = concentrationSentence(concentrationByTechnology(rows, 'pending'));
    insights.push({
      id: 'pending',
      eyebrow: 'Pendientes',
      title: `${data.cards.pending} certificaciones pendientes se distribuyen en ${people} ${people === 1 ? 'persona' : 'personas'}.`,
      description: concentration || 'Consulta el seguimiento para identificar qué certificaciones siguen sin cobertura vigente.',
      tone: 'blue',
      actionStatus: 'PENDING',
      actionLabel: 'Ver pendientes',
    });
  }

  if (data.cards.dataQualityPending > 0) {
    insights.push({
      id: 'data-quality',
      eyebrow: 'Calidad de datos',
      title: `${data.cards.dataQualityPending} ${data.cards.dataQualityPending === 1 ? 'colaborador requiere' : 'colaboradores requieren'} completar información de seguimiento.`,
      description: 'El indicador utiliza exclusivamente los campos requeridos por la regla actual de calidad de datos.',
      tone: 'slate',
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'clear',
      eyebrow: 'Estado actual',
      title: 'No hay certificaciones vencidas, próximas, pendientes o en recertificación en este contexto.',
      description: 'El resultado corresponde a los filtros actualmente aplicados al panel.',
      tone: 'emerald',
    });
  }

  return insights.slice(0, 5);
};
