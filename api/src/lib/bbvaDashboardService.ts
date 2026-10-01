import type {
  BbvaDashboardResponse,
  DashboardFilters,
  DashboardHistory,
  DashboardHistoricalMetricKey,
  DashboardMetricCards,
  DashboardMetricComparison,
  DashboardMetricSnapshotPoint,
  DashboardRecommendation,
  DashboardSlice,
} from './bbvaDashboardDomain.js';
import { BbvaDashboardRepository, type DashboardCertificationRow } from './bbvaDashboardRepository.js';
import { isCertificationReadyForTarget, isCriticalResolutionOpen, isCriticalTwoAttemptExhausted } from './bbvaCertificationRules.js';
import { vendorQuarterContext, type VendorQuarterDefinition } from './bbvaVendorCalendar.js';
import { BbvaOperationalQuarterRepository } from './bbvaOperationalQuarterRepository.js';
import { addBusinessDays, bbvaBusinessDate } from './bbvaBusinessTime.js';
import { metricActiveCertificationIds } from './bbvaCertificationCoverage.js';

const repository = new BbvaDashboardRepository();
const operationalQuarterRepository = new BbvaOperationalQuarterRepository();

const HISTORICAL_METRICS: DashboardHistoricalMetricKey[] = [
  'collaboratorsActive',
  'talentBankActive',
  'certificationsApplicable',
  'coveragePercent',
  'expiring',
  'expired',
  'recertificationPending',
  'pending',
  'dataQualityPending',
  'vendorReadyPercent',
  'vendorPending',
  'vendorExitRequired',
];

interface DashboardGetOptions {
  includeHistory?: boolean;
  captureSnapshot?: boolean;
  historyDays?: number;
  comparisonDays?: number;
  activityDays?: number;
  activityLimit?: number;
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

function normalizeDate(value: string | null | undefined): string | null {
  const candidate = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function filterValues(value: string | null | undefined): Set<string> {
  return new Set(String(value ?? '').split('~').map((item) => item.trim()).filter(Boolean));
}

function certificationStatus(row: DashboardCertificationRow, todayIso: string): string {
  if (!row.applicable || row.baseStatus === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (row.baseStatus !== 'APPROVED') return row.baseStatus === 'FAILED' ? 'FAILED' : row.baseStatus;
  if (!row.expirationDate) return 'VALID';
  if (row.expirationDate < todayIso) return row.recertificationEnabled ? 'RECERTIFICATION_PENDING' : 'EXPIRED';
  if (row.expiringSoonDays != null && row.expirationDate <= addBusinessDays(todayIso, row.expiringSoonDays)) return 'EXPIRING';
  return 'VALID';
}

function matchesDate(value: string | null, fromDate: string | null, toDate: string | null): boolean {
  if (!fromDate && !toDate) return true;
  if (!value) return false;
  if (fromDate && value < fromDate) return false;
  if (toDate && value > toDate) return false;
  return true;
}

function sortSlices(values: Map<string, number>): DashboardSlice[] {
  return [...values.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es-MX'));
}

function isGlobalContext(filters: DashboardFilters): boolean {
  return !Object.entries(filters).some(([key, value]) => key !== 'quarterCode' && String(value ?? '').trim());
}


function subtractDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function buildHistory(cards: DashboardMetricCards, points: DashboardMetricSnapshotPoint[], todayIso: string, comparisonDays: number, historyDays: number): DashboardHistory {
  const comparisonTargetDate = subtractDays(todayIso, comparisonDays);
  const previous = [...points].reverse().find((point) => point.snapshotDate <= comparisonTargetDate) ?? null;
  const comparisons: Partial<Record<DashboardHistoricalMetricKey, DashboardMetricComparison>> = {};
  if (previous) {
    for (const metric of HISTORICAL_METRICS) {
      const current = Number(cards[metric] ?? 0);
      const previousValue = Number(previous[metric] ?? 0);
      comparisons[metric] = {
        metric,
        current,
        previous: previousValue,
        delta: Math.round((current - previousValue) * 100) / 100,
        unit: metric === 'coveragePercent' || metric === 'vendorReadyPercent' ? 'PERCENTAGE_POINTS' : 'COUNT',
        previousSnapshotDate: previous.snapshotDate,
      };
    }
  }
  return {
    available: Boolean(previous),
    previousSnapshotDate: previous?.snapshotDate ?? null,
    comparisonDays,
    comparisonTargetDate,
    historyDays,
    points,
    comparisons,
  };
}

function peopleWith(rows: BbvaDashboardResponse['attention'], metric: 'expired' | 'recertificationPending' | 'expiring' | 'pending' | 'critical'): number {
  return rows.filter((row) => row[metric] > 0).length;
}

function concentrationByTechnology(rows: BbvaDashboardResponse['attention'], metric: 'expired' | 'recertificationPending' | 'expiring' | 'pending' | 'critical'): string {
  const totals = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const value = row[metric];
    if (value <= 0) continue;
    total += value;
    const label = row.technology?.trim() || 'Sin tecnología';
    totals.set(label, (totals.get(label) ?? 0) + value);
  }
  if (!total || !totals.size) return '';
  const [label, value] = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es-MX'))[0];
  if (label === 'Sin tecnología') return '';
  if (value === total) return `Los ${total} casos se concentran en ${label}.`;
  const percentage = Math.round((value / total) * 1000) / 10;
  return `${label} concentra ${value} de ${total} casos (${percentage}%).`;
}

function recommendationSlug(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
}

function technologyConcentrations(
  rows: BbvaDashboardResponse['attention'],
  metric: 'expired' | 'recertificationPending' | 'expiring' | 'pending' | 'critical',
): Array<{ technology: string; cases: number; people: number }> {
  const map = new Map<string, { cases: number; people: Set<string> }>();
  for (const row of rows) {
    const cases = row[metric];
    const technology = row.technology?.trim();
    if (!technology || technology === 'Sin tecnología' || cases <= 0) continue;
    const current = map.get(technology) ?? { cases: 0, people: new Set<string>() };
    current.cases += cases;
    current.people.add(row.collaboratorId);
    map.set(technology, current);
  }
  return [...map.entries()]
    .map(([technology, value]) => ({ technology, cases: value.cases, people: value.people.size }))
    .sort((a, b) => b.cases - a.cases || b.people - a.people || a.technology.localeCompare(b.technology, 'es-MX'));
}

function appendTechnologyRecommendations(
  target: DashboardRecommendation[],
  rows: BbvaDashboardResponse['attention'],
  metric: 'expired' | 'recertificationPending' | 'expiring' | 'pending' | 'critical',
  options: { priority: DashboardRecommendation['priority']; eyebrow: string; certificationStatus: string | null; actionLabel: string; singular: string; plural: string },
): void {
  const concentrations = technologyConcentrations(rows, metric);
  if (concentrations.length < 2) return;
  for (const item of concentrations.slice(0, 3)) {
    target.push({
      id: `technology-${metric}-${recommendationSlug(item.technology)}`,
      priority: options.priority,
      eyebrow: `${options.eyebrow} · ${item.technology}`,
      title: `${item.technology} concentra ${item.cases} ${item.cases === 1 ? options.singular : options.plural}.`,
      description: `${item.people} ${item.people === 1 ? 'colaborador requiere' : 'colaboradores requieren'} seguimiento en este foco. La recomendación se recalcula con la data vigente del contexto.`,
      target: 'TRACKING',
      certificationStatus: options.certificationStatus,
      technology: item.technology,
      actionLabel: options.actionLabel,
    });
  }
}

export function buildRecommendations(
  cards: DashboardMetricCards,
  attention: BbvaDashboardResponse['attention'],
  vendorQuarter: BbvaDashboardResponse['vendorQuarter'],
  history: DashboardHistory,
): DashboardRecommendation[] {
  const recommendations: DashboardRecommendation[] = [];

  if (cards.vendorExitRequired > 0) {
    const people = peopleWith(attention, 'critical');
    recommendations.push({
      id: 'critical-two-attempts',
      priority: 'CRITICAL',
      eyebrow: 'Resolución crítica',
      title: `${cards.vendorExitRequired} ${cards.vendorExitRequired === 1 ? 'persona tiene' : 'personas tienen'} intentos 2/2 agotados.`,
      description: `${people || cards.vendorExitRequired} ${people === 1 ? 'caso requiere' : 'casos requieren'} cerrar la resolución de baja o becario antes de continuar. ${concentrationByTechnology(attention, 'critical')}`.trim(),
      target: 'TRACKING',
      certificationStatus: 'FAILED',
      actionLabel: 'Resolver casos',
    });
  }

  if (cards.expired > 0) {
    const people = peopleWith(attention, 'expired');
    recommendations.push({
      id: 'expired',
      priority: 'CRITICAL',
      eyebrow: 'Vigencia',
      title: `${cards.expired} certificaciones vencidas afectan a ${people} ${people === 1 ? 'persona' : 'personas'}.`,
      description: concentrationByTechnology(attention, 'expired') || 'Revisa primero los registros que ya están fuera de vigencia.',
      target: 'TRACKING',
      certificationStatus: 'EXPIRED',
      actionLabel: 'Revisar vencidas',
    });
  }

  if (cards.recertificationPending > 0) {
    const people = peopleWith(attention, 'recertificationPending');
    recommendations.push({
      id: 'recertification',
      priority: 'ATTENTION',
      eyebrow: 'Recertificación',
      title: `${cards.recertificationPending} certificaciones requieren un nuevo ciclo.`,
      description: `${people} ${people === 1 ? 'persona está' : 'personas están'} involucradas. ${concentrationByTechnology(attention, 'recertificationPending')}`.trim(),
      target: 'TRACKING',
      certificationStatus: 'RECERTIFICATION_PENDING',
      actionLabel: 'Ver recertificaciones',
    });
  }

  if (cards.expiring > 0) {
    const people = peopleWith(attention, 'expiring');
    recommendations.push({
      id: 'expiring',
      priority: 'PREVENTIVE',
      eyebrow: 'Prevención',
      title: `${cards.expiring} certificaciones están dentro de su periodo de alerta.`,
      description: `${people} ${people === 1 ? 'persona puede' : 'personas pueden'} revisarse antes del vencimiento. ${concentrationByTechnology(attention, 'expiring')}`.trim(),
      target: 'TRACKING',
      certificationStatus: 'EXPIRING',
      actionLabel: 'Revisar próximas',
    });
  }

  if (vendorQuarter.targetCode && cards.vendorPending > 0) {
    recommendations.push({
      id: 'vendor-quarter',
      priority: cards.vendorExitRequired > 0 ? 'CRITICAL' : 'ATTENTION',
      eyebrow: `Preparación ${vendorQuarter.targetCode}`,
      title: `${cards.vendorPending} ${cards.vendorPending === 1 ? 'colaborador no está listo' : 'colaboradores no están listos'} para el siguiente corte.`,
      description: vendorQuarter.daysToTargetStart == null
        ? 'Revisa las certificaciones pendientes del universo actual.'
        : `Quedan ${vendorQuarter.daysToTargetStart} días para el inicio del ${vendorQuarter.targetCode}.`,
      target: 'TRACKING',
      certificationStatus: null,
      actionLabel: 'Gestionar preparación',
    });
  }

  if (cards.pending > 0) {
    recommendations.push({
      id: 'pending',
      priority: 'INFO',
      eyebrow: 'Cobertura pendiente',
      title: `${cards.pending} certificaciones todavía no tienen cobertura vigente.`,
      description: concentrationByTechnology(attention, 'pending') || 'Consulta el seguimiento para identificar la siguiente acción de cada caso.',
      target: 'TRACKING',
      certificationStatus: 'PENDING',
      actionLabel: 'Ver pendientes',
    });
  }

  const coverageComparison = history.comparisons.coveragePercent;
  if (coverageComparison && coverageComparison.delta < 0) {
    recommendations.push({
      id: 'coverage-decline',
      priority: 'ATTENTION',
      eyebrow: 'Tendencia de cobertura',
      title: `La cobertura bajó ${Math.abs(coverageComparison.delta).toLocaleString('es-MX', { maximumFractionDigits: 2 })} pp.`,
      description: `La comparación utiliza el snapshot real del ${coverageComparison.previousSnapshotDate}. Revisa vencidas, recertificaciones y pendientes que explican la brecha.`,
      target: 'REPORTS',
      certificationStatus: null,
      actionLabel: 'Ver evolución',
    });
  }

  const expiredComparison = history.comparisons.expired;
  if (expiredComparison && expiredComparison.delta > 0) {
    recommendations.push({
      id: 'expired-increase',
      priority: 'CRITICAL',
      eyebrow: 'Cambio del periodo',
      title: `Las certificaciones vencidas aumentaron en ${expiredComparison.delta.toLocaleString('es-MX')}.`,
      description: `El cambio se compara contra el snapshot real del ${expiredComparison.previousSnapshotDate}.`,
      target: 'TRACKING',
      certificationStatus: 'EXPIRED',
      actionLabel: 'Revisar vencidas',
    });
  }

  if (cards.dataQualityPending > 0) {
    recommendations.push({
      id: 'data-quality',
      priority: 'INFO',
      eyebrow: 'Calidad de datos',
      title: `${cards.dataQualityPending} ${cards.dataQualityPending === 1 ? 'colaborador requiere' : 'colaboradores requieren'} completar información.`,
      description: 'Completar los datos mejora la trazabilidad de seguimiento y comunicación.',
      target: 'COLLABORATORS',
      certificationStatus: null,
      actionLabel: 'Ver colaboradores',
    });
  }

  appendTechnologyRecommendations(recommendations, attention, 'critical', { priority: 'CRITICAL', eyebrow: 'Foco crítico', certificationStatus: 'FAILED', actionLabel: 'Resolver foco', singular: 'caso crítico', plural: 'casos críticos' });
  appendTechnologyRecommendations(recommendations, attention, 'expired', { priority: 'CRITICAL', eyebrow: 'Foco de vigencia', certificationStatus: 'EXPIRED', actionLabel: 'Revisar foco', singular: 'certificación vencida', plural: 'certificaciones vencidas' });
  appendTechnologyRecommendations(recommendations, attention, 'recertificationPending', { priority: 'ATTENTION', eyebrow: 'Foco de recertificación', certificationStatus: 'RECERTIFICATION_PENDING', actionLabel: 'Abrir foco', singular: 'recertificación', plural: 'recertificaciones' });
  appendTechnologyRecommendations(recommendations, attention, 'expiring', { priority: 'PREVENTIVE', eyebrow: 'Foco preventivo', certificationStatus: 'EXPIRING', actionLabel: 'Prevenir vencimientos', singular: 'certificación en alerta', plural: 'certificaciones en alerta' });
  appendTechnologyRecommendations(recommendations, attention, 'pending', { priority: 'INFO', eyebrow: 'Foco de cobertura', certificationStatus: 'PENDING', actionLabel: 'Cubrir pendientes', singular: 'certificación pendiente', plural: 'certificaciones pendientes' });

  if (cards.certificationsApplicable > 0 && cards.coveragePercent < 100) {
    const gap = Math.round((100 - cards.coveragePercent) * 100) / 100;
    recommendations.push({
      id: 'coverage-gap',
      priority: cards.expired > 0 ? 'ATTENTION' : 'INFO',
      eyebrow: 'Brecha de cobertura',
      title: `La cobertura actual es ${cards.coveragePercent.toLocaleString('es-MX', { maximumFractionDigits: 2 })}%.`,
      description: `Faltan ${gap.toLocaleString('es-MX', { maximumFractionDigits: 2 })} puntos porcentuales para una cobertura completa del universo aplicable.`,
      target: 'METRICS',
      certificationStatus: null,
      technology: null,
      actionLabel: 'Analizar cobertura',
    });
  }

  if (cards.talentBankActive > 0) {
    recommendations.push({
      id: 'talent-bank-active',
      priority: 'INFO',
      eyebrow: 'Disponibilidad',
      title: `${cards.talentBankActive} ${cards.talentBankActive === 1 ? 'persona está' : 'personas están'} en Banco de talento.`,
      description: 'Revisa perfiles disponibles y permanencia para detectar oportunidades de asignación con la información vigente.',
      target: 'TALENT_BANK',
      certificationStatus: null,
      technology: null,
      actionLabel: 'Revisar banco',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: 'clear',
      priority: 'INFO',
      eyebrow: 'Estado actual',
      title: 'No hay acciones prioritarias para el contexto actual.',
      description: 'El resultado se deriva de los estados y reglas vigentes, sin umbrales inventados.',
      target: 'METRICS',
      certificationStatus: null,
      actionLabel: 'Ver métricas',
    });
  }

  return recommendations;
}

export class BbvaDashboardService {
  async get(filters: DashboardFilters, actorEmail: string, options: DashboardGetOptions = {}): Promise<BbvaDashboardResponse> {
    const includeHistory = options.includeHistory ?? true;
    const captureSnapshot = options.captureSnapshot ?? false;
    const comparisonDays = boundedInteger(options.comparisonDays, 1, 1, 365);
    const historyDays = Math.max(comparisonDays + 7, boundedInteger(options.historyDays, 90, 7, 365));
    const activityDays = boundedInteger(options.activityDays, 30, 1, 365);
    const activityLimit = boundedInteger(options.activityLimit, 12, 1, 100);
    const [allCollaborators, allTalent, rawCertifications, allCertificationScores, filterOptions] = await Promise.all([
      repository.collaborators(),
      repository.talent(),
      repository.certifications(),
      repository.certificationScores(),
      repository.filterOptions(),
    ]);

    const now = new Date();
    const todayIso = bbvaBusinessDate(now);
    const metricActiveIds = metricActiveCertificationIds(rawCertifications.map((item) => ({
      recordId: item.id,
      personId: item.personId,
      applicable: item.applicable,
      baseStatus: item.baseStatus,
      coverageGroupId: item.coverageGroupId,
      coveragePriority: item.coveragePriority,
      expirationDate: item.expirationDate,
    })), todayIso);
    const allCertifications = rawCertifications.map((item) => ({ ...item, metricActive: metricActiveIds.has(item.id) }));
    const fromDate = normalizeDate(filters.fromDate);
    const toDate = normalizeDate(filters.toDate);
    const search = String(filters.search ?? '').trim().toLocaleLowerCase('es-MX');
    const operationalQuarterOverrides = await operationalQuarterRepository.listOverrides();
    const quarter = vendorQuarterContext(now, filters.quarterCode, operationalQuarterOverrides);
    const selectedQuarter = quarter.selectedQuarter;
    const selectedQuarterCode = selectedQuarter?.code ?? 'UNCONFIGURED';

    const technologyIds = filterValues(filters.technologyId);
    const certStatusById = new Map<string, string>();
    for (const cert of allCertifications) certStatusById.set(cert.id, certificationStatus(cert, todayIso));

    let collaborators = allCollaborators.filter((row) => {
      if (technologyIds.size && (!row.technologyId || !technologyIds.has(row.technologyId))) return false;
      if (filters.profileId && row.profileId !== filters.profileId) return false;
      if (filters.technologyProfile && row.technologyProfile !== filters.technologyProfile) return false;
      if (filters.bbvaStructureLevel2 && row.bbvaStructureLevel2 !== filters.bbvaStructureLevel2) return false;
      if (filters.bbvaStructureLevel3 && row.bbvaStructureLevel3 !== filters.bbvaStructureLevel3) return false;
      if (filters.deliveryManager && row.deliveryManager !== filters.deliveryManager) return false;
      if (!matchesDate(row.startDate, fromDate, toDate)) return false;
      if (search && !`${row.fullName} ${row.email} ${row.softtekCode ?? ''} ${row.bbvaUser ?? ''} ${row.bbvaEmail ?? ''} ${row.deliveryManager ?? ''} ${row.profile ?? ''} ${row.technology ?? ''}`.toLocaleLowerCase('es-MX').includes(search)) return false;
      return true;
    });

    if (filters.certificationStatus) {
      const personIds = new Set(
        allCertifications
          .filter((cert) => cert.metricActive)
          .filter((cert) => filters.certificationStatus === 'DUE_IN_PERIOD'
            ? Boolean(selectedQuarter && cert.expirationDate && cert.expirationDate >= selectedQuarter.startDate && cert.expirationDate <= selectedQuarter.endDate)
            : certStatusById.get(cert.id) === filters.certificationStatus)
          .map((cert) => cert.personId),
      );
      collaborators = collaborators.filter((row) => personIds.has(row.personId));
    }

    if (filters.certificationId) {
      const personIds = new Set(allCertifications.filter((cert) => cert.metricActive && cert.certificationId === filters.certificationId && cert.applicable).map((cert) => cert.personId));
      collaborators = collaborators.filter((row) => personIds.has(row.personId));
    }

    const collaboratorPersonIds = new Set(collaborators.map((row) => row.personId));
    const certifications = allCertifications.filter((row) => row.metricActive && collaboratorPersonIds.has(row.personId) && row.applicable && certStatusById.get(row.id) !== 'NOT_APPLICABLE' && (!filters.certificationId || row.certificationId === filters.certificationId) && (!filters.certificationStatus || (filters.certificationStatus === 'DUE_IN_PERIOD' ? Boolean(selectedQuarter && row.expirationDate && row.expirationDate >= selectedQuarter.startDate && row.expirationDate <= selectedQuarter.endDate) : certStatusById.get(row.id) === filters.certificationStatus)));

    const certificationScoreRows = allCertificationScores.filter((row) => {
      if (!collaboratorPersonIds.has(row.personId)) return false;
      if (filters.certificationId && row.certificationId !== filters.certificationId) return false;
      if (!matchesDate(row.applicationDate, fromDate, toDate)) return false;
      return true;
    });
    const certificationScoreMap = new Map<string, { certificationId: string; certificationName: string; sum: number; count: number }>();
    for (const row of certificationScoreRows) {
      const current = certificationScoreMap.get(row.certificationId) ?? { certificationId: row.certificationId, certificationName: row.certificationName, sum: 0, count: 0 };
      current.sum += row.score10;
      current.count += 1;
      certificationScoreMap.set(row.certificationId, current);
    }
    const certificationScores = [...certificationScoreMap.values()].map((item) => ({
      certificationId: item.certificationId,
      certificationName: item.certificationName,
      peopleCount: item.count,
      average: Math.round((item.sum / item.count) * 100) / 100,
    })).sort((a, b) => b.average - a.average || a.certificationName.localeCompare(b.certificationName, 'es-MX'));
    const certificationScoreBase = certificationScoreRows.length;
    const certificationAverage = certificationScoreBase
      ? Math.round((certificationScoreRows.reduce((sum, row) => sum + row.score10, 0) / certificationScoreBase) * 100) / 100
      : null;

    const counts = { valid: 0, expiring: 0, expired: 0, recertificationPending: 0, pending: 0, failed: 0 };
    for (const cert of certifications) {
      const status = certStatusById.get(cert.id);
      if (status === 'VALID') counts.valid += 1;
      else if (status === 'EXPIRING') counts.expiring += 1;
      else if (status === 'EXPIRED') counts.expired += 1;
      else if (status === 'RECERTIFICATION_PENDING') counts.recertificationPending += 1;
      else if (status === 'FAILED') counts.failed += 1;
      else counts.pending += 1;
    }

    let talent = allTalent.filter((row) => {
      if (filters.talentType && row.talentType !== filters.talentType) return false;
      if (technologyIds.size && (!row.technologyId || !technologyIds.has(row.technologyId))) return false;
      if (filters.profileId && row.profileId !== filters.profileId) return false;
      if (filters.bbvaStructureLevel2 && row.bbvaStructureLevel2 !== filters.bbvaStructureLevel2) return false;
      if (filters.bbvaStructureLevel3 && row.bbvaStructureLevel3 !== filters.bbvaStructureLevel3) return false;
      if (!matchesDate(row.entryDate, fromDate, toDate)) return false;
      if (search && !row.fullName.toLocaleLowerCase('es-MX').includes(search)) return false;
      return true;
    });
    if (!filters.talentType) talent = talent.filter(Boolean);

    const totalApplicable = certifications.length;
    // La cobertura operativa del Panel/Métricas es por Q: mide qué parte del universo
    // aplicable NO vence dentro del Q seleccionado. Si no hay vencimientos en el Q,
    // la cobertura es 100%, aunque existan pendientes sin fecha fuera de ese corte.
    const quarterDueCount = selectedQuarter
      ? certifications.filter((cert) => Boolean(cert.expirationDate && cert.expirationDate >= selectedQuarter.startDate && cert.expirationDate <= selectedQuarter.endDate)).length
      : 0;
    const qCovered = Math.max(0, totalApplicable - quarterDueCount);
    const coveragePercent = totalApplicable ? Math.round((qCovered / totalApplicable) * 10000) / 100 : 100;

    const personCerts = new Map<string, DashboardCertificationRow[]>();
    for (const cert of certifications) {
      const bucket = personCerts.get(cert.personId) ?? [];
      bucket.push(cert);
      personCerts.set(cert.personId, bucket);
    }

    const collaboratorFocusMap = new Map<string, number>([
      ['En regla', 0],
      ['Próximas a vencer', 0],
      ['Vencidas', 0],
      ['Pendientes', 0],
    ]);

    const attention = collaborators.map((collaborator) => {
      const rows = personCerts.get(collaborator.personId) ?? [];
      const result = { valid: 0, expiring: 0, expired: 0, pending: 0, recertificationPending: 0, critical: 0 };
      for (const cert of rows) {
        const status = certStatusById.get(cert.id);
        if (status === 'VALID') result.valid += 1;
        else if (status === 'EXPIRING') result.expiring += 1;
        else if (status === 'EXPIRED') result.expired += 1;
        else if (status === 'RECERTIFICATION_PENDING') result.recertificationPending += 1;
        else result.pending += 1;
        if (
          cert.baseStatus === 'FAILED'
          && isCriticalTwoAttemptExhausted(cert)
          && isCriticalResolutionOpen(cert.criticalResolutionStatus)
        ) result.critical += 1;
      }
      if (result.critical > 0 || result.expired + result.recertificationPending > 0) collaboratorFocusMap.set('Vencidas', (collaboratorFocusMap.get('Vencidas') ?? 0) + 1);
      else if (result.expiring > 0) collaboratorFocusMap.set('Próximas a vencer', (collaboratorFocusMap.get('Próximas a vencer') ?? 0) + 1);
      else if (result.pending > 0) collaboratorFocusMap.set('Pendientes', (collaboratorFocusMap.get('Pendientes') ?? 0) + 1);
      else collaboratorFocusMap.set('En regla', (collaboratorFocusMap.get('En regla') ?? 0) + 1);
      return {
        collaboratorId: collaborator.collaboratorId,
        fullName: collaborator.fullName,
        technology: collaborator.technology ?? 'Sin tecnología',
        profile: collaborator.profile ?? 'Sin perfil',
        deliveryManager: collaborator.deliveryManager ?? 'Sin DM',
        bbvaStructureLevel2: collaborator.bbvaStructureLevel2,
        bbvaStructureLevel3: collaborator.bbvaStructureLevel3,
        ...result,
      };
    }).sort((a, b) => {
      const scoreA = a.critical * 1000 + (a.expired + a.recertificationPending) * 100 + a.expiring * 10 + a.pending;
      const scoreB = b.critical * 1000 + (b.expired + b.recertificationPending) * 100 + b.expiring * 10 + b.pending;
      return scoreB - scoreA || a.fullName.localeCompare(b.fullName, 'es-MX');
    });

    const certificationCoverage: DashboardSlice[] = [
      { label: 'Vigentes', value: counts.valid },
      { label: 'Próximas a vencer', value: counts.expiring },
      { label: 'Vencidas', value: counts.expired },
      { label: 'Recertificación pendiente', value: counts.recertificationPending },
      { label: 'Pendientes', value: counts.pending + counts.failed },
    ];

    const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    const expirationByMonth = (() => {
      if (!selectedQuarter) return [];
      const startDate = new Date(`${selectedQuarter.startDate}T00:00:00Z`);
      const endDate = new Date(`${selectedQuarter.endDate}T00:00:00Z`);
      const result: Array<{ month: string; label: string; value: number }> = [];
      let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
      const last = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
      while (cursor <= last) {
        const month = cursor.toISOString().slice(0, 7);
        const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
        const value = certifications.filter((cert) => {
          if (!cert.expirationDate) return false;
          const expiration = new Date(`${cert.expirationDate}T00:00:00Z`);
          return expiration >= cursor && expiration < next && cert.expirationDate >= selectedQuarter.startDate && cert.expirationDate <= selectedQuarter.endDate;
        }).length;
        result.push({ month, label: monthFormatter.format(cursor).replace('.', ''), value });
        cursor = next;
      }
      return result;
    })();


    const techMap = new Map<string, { technologyId: string | null; value: number }>();
    for (const collaborator of collaborators) {
      const label = collaborator.technology ?? 'Sin tecnología';
      const current = techMap.get(label) ?? { technologyId: collaborator.technologyId, value: 0 };
      current.value += 1;
      techMap.set(label, current);
    }
    const technologyDistribution = [...techMap.entries()]
      .map(([label, data]) => ({ technologyId: data.technologyId, label, value: data.value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es-MX'));

    const deliveryManagerMap = new Map<string, number>();
    for (const collaborator of collaborators) {
      const label = collaborator.deliveryManager?.trim() || 'Sin DM';
      deliveryManagerMap.set(label, (deliveryManagerMap.get(label) ?? 0) + 1);
    }

    const targetStart = selectedQuarter?.startDate ?? null;
    const unresolvedByPerson = new Map<string, number>();
    const exhaustedByPerson = new Set<string>();
    for (const cert of certifications) {
      const status = certStatusById.get(cert.id);
      if (!isCertificationReadyForTarget(status, cert.expirationDate, targetStart)) {
        unresolvedByPerson.set(cert.personId, (unresolvedByPerson.get(cert.personId) ?? 0) + 1);
      }
      if (
        cert.baseStatus === 'FAILED'
        && isCriticalTwoAttemptExhausted(cert)
        && isCriticalResolutionOpen(cert.criticalResolutionStatus)
      ) exhaustedByPerson.add(cert.personId);
    }
    const pendingCollaborators = [...collaboratorPersonIds].filter((personId) => (unresolvedByPerson.get(personId) ?? 0) > 0).length;
    const readyCollaborators = Math.max(0, collaborators.length - pendingCollaborators);
    const vendorReadinessPercent = collaborators.length ? Math.round((readyCollaborators / collaborators.length) * 10000) / 100 : 100;

    const dataQualityPending = collaborators.filter((collaborator) =>
      !collaborator.softtekCode?.trim()
      || !collaborator.bbvaUser?.trim()
      || !collaborator.email?.trim()
      || !collaborator.bbvaEmail?.trim()
      || !collaborator.deliveryManager?.trim()
      || !collaborator.startDate
    ).length;

    const talentMap = new Map<string, number>();
    const typeLabel: Record<string, string> = { ACADEMY: 'Academia', PROSPECT: 'Prospectos', FORMER_COLLABORATOR: 'Excolaboradores', BBVA_EXIT: 'Bajas de BBVA' };
    for (const item of talent) talentMap.set(typeLabel[item.talentType] ?? item.talentType, (talentMap.get(typeLabel[item.talentType] ?? item.talentType) ?? 0) + 1);

    const cards: DashboardMetricCards = {
      collaboratorsActive: collaborators.length,
      talentBankActive: talent.length,
      certificationsApplicable: totalApplicable,
      coveragePercent,
      expiring: quarterDueCount,
      expired: counts.expired,
      recertificationPending: counts.recertificationPending,
      pending: counts.pending + counts.failed,
      deliveryManagersRepresented: [...deliveryManagerMap.keys()].filter((item) => item !== 'Sin DM').length,
      dataQualityPending,
      vendorReadyPercent: vendorReadinessPercent,
      vendorPending: pendingCollaborators,
      vendorExitRequired: exhaustedByPerson.size,
      certificationAverage,
      certificationScoreBase,
    };

    const vendorQuarter = {
      calendarName: quarter.calendarName,
      currentCode: quarter.currentQuarter?.code ?? null,
      selectedCode: selectedQuarter?.code ?? null,
      targetCode: selectedQuarter?.code ?? null,
      targetStartDate: selectedQuarter?.startDate ?? null,
      targetEndDate: selectedQuarter?.endDate ?? null,
      daysToTargetStart: quarter.daysToTargetStart,
      daysToTargetEnd: quarter.daysToTargetEnd,
      daysToSelectedStart: quarter.daysToSelectedStart,
      daysToSelectedEnd: quarter.daysToSelectedEnd,
      progressPercent: quarter.progressPercent,
      referenceDate: quarter.referenceDate,
      readyCollaborators,
      pendingCollaborators,
      exhaustedAttemptCollaborators: exhaustedByPerson.size,
      readinessPercent: vendorReadinessPercent,
      years: quarter.years,
      quarters: quarter.quarters,
    };

    const globalContext = isGlobalContext(filters);
    let history: DashboardHistory = {
      available: false,
      previousSnapshotDate: null,
      comparisonDays,
      comparisonTargetDate: subtractDays(todayIso, comparisonDays),
      historyDays,
      points: [],
      comparisons: {},
    };
    if (globalContext && captureSnapshot) {
      if (selectedQuarter) await repository.upsertMetricSnapshot(cards, actorEmail, todayIso, selectedQuarterCode);
      else await repository.upsertMetricSnapshot(cards, actorEmail, todayIso);
    }
    if (globalContext && includeHistory) {
      const points = selectedQuarter
        ? await repository.metricHistory(historyDays, todayIso, selectedQuarterCode)
        : await repository.metricHistory(historyDays, todayIso);
      history = buildHistory(cards, points, todayIso, comparisonDays, historyDays);
    }
    const activity = globalContext ? await repository.recentActivity(activityDays, activityLimit, todayIso) : [];
    const collaboratorByPerson = new Map(collaborators.map((item) => [item.personId, item]));
    const quarterExpirations = selectedQuarter
      ? certifications
          .filter((cert) => Boolean(cert.expirationDate && cert.expirationDate >= selectedQuarter.startDate && cert.expirationDate <= selectedQuarter.endDate))
          .map((cert) => {
            const collaborator = collaboratorByPerson.get(cert.personId);
            return {
              collaboratorId: collaborator?.collaboratorId ?? '',
              personId: cert.personId,
              fullName: collaborator?.fullName ?? 'Sin colaborador activo',
              certificationId: cert.certificationId,
              certificationName: cert.certificationName,
              expirationDate: cert.expirationDate as string,
              status: certStatusById.get(cert.id) ?? 'EXPIRING',
            };
          })
          .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate) || a.fullName.localeCompare(b.fullName, 'es-MX'))
      : [];

    return {
      cards,
      vendorQuarter,
      quarterExpirations,
      history,
      activity,
      recommendations: buildRecommendations(cards, attention, vendorQuarter, history),
      collaboratorFocus: [...collaboratorFocusMap.entries()].map(([label, value]) => ({ label, value })),
      certificationCoverage,
      expirationByMonth,
      technologyDistribution,
      deliveryManagerDistribution: sortSlices(deliveryManagerMap),
      talentComposition: sortSlices(talentMap),
      attention,
      certificationScores,
      certificationScoreDetails: certificationScoreRows.map((row) => ({
        collaboratorId: row.collaboratorId, personId: row.personId, fullName: row.fullName, certificationId: row.certificationId,
        certificationName: row.certificationName, result: row.result, score10: row.score10, applicationDate: row.applicationDate, attemptNumber: row.attemptNumber,
      })),
      filters: filterOptions,
    };
  }
}
