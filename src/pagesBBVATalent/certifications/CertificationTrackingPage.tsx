import React, { Fragment, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, CalendarClock, CheckCircle2, Clock3, Eye, RefreshCw, Search, ShieldAlert, CalendarRange, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACertificationStatusBadge } from '../../componentsBBVATalent/BBVACertificationStatusBadge';
import { BBVAEmptyState } from '../../componentsBBVATalent/BBVAEmptyState';
import type { BBVAFilterSummaryItem } from '../../componentsBBVATalent/BBVAFilterSummary';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { CertificationCriticalResolutionDialog } from '../../componentsBBVATalent/CertificationCriticalResolutionDialog';
import { CertificationQuickApprovalDialog } from '../../componentsBBVATalent/CertificationQuickApprovalDialog';
import { CertificationScheduleDialog } from '../../componentsBBVATalent/CertificationScheduleDialog';
import {
  useAddCertificationAttempt,
  useCertificationTracking,
  useResolveCriticalCertification,
  useUpdateCollaboratorCertification,
} from '../hooks/useCollaboratorCertifications';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useBBVAListQueryState } from '../hooks/useBBVAListQueryState';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';
import { displayPersonName, displayRoleName, sentenceCaseData, upperDisplay, displayCertificationName } from '../lib/bbvaDisplayFormat';
import { formatPeriodCode, periodOptions } from '../lib/periodOptions';
import { decodeMultiValue, encodeMultiValue } from '../lib/multiValueFilter';
import {
  attemptContext,
  buildTrackingSummary,
  expirationContext,
  initialCertificationContext,
  hasAttemptLimitReached,
  remainingAttempts,
  requiresCriticalExitReview,
  hasOpenCriticalResolution,
  scheduledContext,
  trackingPriority,
} from '../lib/certificationTracking';
import {
  COLLABORATOR_CERTIFICATION_STATUS_LABELS,
  type CertificationTrackingItem,
  type CollaboratorCertificationStatus,
} from '../types/collaboratorCertification';

const filterDefaults = {
  certificationStatus: '',
  technology: '',
  certification: '',
  critical: '',
  attemptCriticality: '',
  quarterCode: '',
  search: '',
};

const TECHNOLOGICAL_CERTIFICATION_FILTER = '__TECHNOLOGICAL__';

type SortField = 'collaboratorName' | 'certificationName' | 'status' | 'expirationDate' | 'scheduledDate' | 'attempt';

const metricHelp = {
  expired: {
    what: 'Certificaciones cuya vigencia calculada ya terminó.',
    calculation: 'Registros cuyo estado de dominio actual es Vencida.',
    interpretation: 'Requieren revisión de vigencia y, cuando corresponda, iniciar recertificación.',
  },
  expiring: {
    what: 'Certificaciones dentro del periodo de alerta previo a su fecha de vencimiento.',
    calculation: 'Registros cuyo estado de dominio actual es Próxima a vencer.',
    interpretation: 'Permite actuar antes de que la vigencia termine.',
  },
  failed: {
    what: 'Certificaciones con un resultado no aprobado en el ciclo actual.',
    calculation: 'Registros cuyo estado actual es Reprobada.',
    interpretation: 'Los intentos restantes dependen de la configuración real de cada certificación.',
  },
  pending: {
    what: 'Certificaciones aplicables que todavía se encuentran pendientes de completar.',
    calculation: 'Registros cuyo estado actual es Pendiente.',
    interpretation: 'Consulta el detalle para revisar programación, intentos y siguiente acción.',
  },
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function compare(a: CertificationTrackingItem, b: CertificationTrackingItem, field: SortField) {
  const text = (left: unknown, right: unknown) => String(left ?? '').localeCompare(String(right ?? ''), 'es-MX', { sensitivity: 'base', numeric: true });
  if (field === 'collaboratorName') return text(a.collaboratorName, b.collaboratorName);
  if (field === 'certificationName') return text(a.certificationName, b.certificationName);
  if (field === 'status') return trackingPriority(a) - trackingPriority(b) || text(a.status, b.status);
  if (field === 'expirationDate') return text(a.expirationDate, b.expirationDate);
  if (field === 'scheduledDate') return text(a.scheduledDate, b.scheduledDate);
  return a.attemptCount - b.attemptCount;
}

const uniqueOptions = (items: CertificationTrackingItem[], selector: (item: CertificationTrackingItem) => string | null | undefined) =>
  [...new Set(items.map(selector).map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, 'es-MX', { sensitivity: 'base', numeric: true }))
    .map((value) => ({ value, label: value }));

const latestAttemptLabel = (item: CertificationTrackingItem) => {
  if (!item.latestAttemptId || !item.latestAttemptResult) return 'Sin resultado en el ciclo actual';
  if (item.latestAttemptResult === 'APPROVED') return 'Último resultado: Aprobado';
  if (item.latestAttemptResult === 'FAILED') return 'Último resultado: No aprobado';
  return 'Último resultado: Pendiente';
};

const isRecertificationToSchedule = (item: CertificationTrackingItem) =>
  item.currentCycle > 1 && item.status === 'PENDING' && !item.scheduledDate;

function matchesTrackingStatusFilter(item: CertificationTrackingItem, status: string, effectiveQuarterCode: string): boolean {
  if (!status) return true;
  if (status === 'DUE_IN_PERIOD') return Boolean(effectiveQuarterCode && item.expirationDate && item.quarterCode === effectiveQuarterCode);
  return item.status === status;
}

function trackingStatusFilterLabel(status: string): string {
  if (status === 'DUE_IN_PERIOD') return 'Vence en el periodo';
  return COLLABORATOR_CERTIFICATION_STATUS_LABELS[status as CollaboratorCertificationStatus] ?? status;
}

function matchesCertificationFilter(item: CertificationTrackingItem, certification: string): boolean {
  if (!certification) return true;
  if (certification === TECHNOLOGICAL_CERTIFICATION_FILTER) return item.certificationType === 'TECHNOLOGICAL';
  return item.certificationName === certification;
}

function certificationFilterLabel(certification: string): string {
  if (certification === TECHNOLOGICAL_CERTIFICATION_FILTER) return 'Solo tecnológicas';
  return displayCertificationName(certification);
}

export const CertificationTrackingPage: React.FC = () => {
  const query = useCertificationTracking();
  const navigate = useNavigate();
  const { state: filters, update, reset } = useBBVAListQueryState(filterDefaults);
  const { state: sortState, patch: patchSort } = useBBVAListMemory<{ sort: SortField; direction: 'asc' | 'desc'; page:number; size:number }>('certification-tracking-sort', { sort: 'status', direction: 'asc', page:0, size:10 });
  const { sort, direction, page, size } = sortState;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approval, setApproval] = useState<CertificationTrackingItem | null>(null);
  const [criticalItem, setCriticalItem] = useState<CertificationTrackingItem | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<CertificationTrackingItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const approveMutation = useAddCertificationAttempt(approval?.collaboratorId ?? '');
  const resolveCritical = useResolveCriticalCertification(criticalItem?.collaboratorId ?? '');
  const scheduleMutation = useUpdateCollaboratorCertification(pendingSchedule?.collaboratorId ?? '');
  const items = query.data?.items ?? [];

  const options = useMemo(() => ({
    technologies: uniqueOptions(items, (item) => item.technology),
    certifications: uniqueOptions(items, (item) => item.certificationName),
  }), [items]);

  const selectedTechnologies = useMemo(() => decodeMultiValue(filters.technology).slice(0, 1), [filters.technology]);

  const combinedScopeValue = useMemo(() => {
    if (filters.certification) return `cert::${filters.certification}`;
    if (selectedTechnologies.length === 1) return `tech::${selectedTechnologies[0]}`;
    return '';
  }, [filters.certification, selectedTechnologies]);

  const combinedScopeOptions = useMemo(() => [
    { value: '', label: 'Todas las tecnologías y certificaciones' },
    { value: `cert::${TECHNOLOGICAL_CERTIFICATION_FILTER}`, label: 'Certificaciones · Solo tecnológicas' },
    ...options.technologies.map((option) => ({ value: `tech::${option.value}`, label: `Tecnología · ${upperDisplay(option.label)}` })),
    ...options.certifications.map((option) => ({ value: `cert::${option.value}`, label: `Certificación · ${displayCertificationName(option.label)}` })),
  ], [options.certifications, options.technologies]);

  const updateCombinedScope = (value: string) => {
    if (!value) { update({ technology: '', certification: '' }); return; }
    if (value.startsWith('tech::')) { update({ technology: encodeMultiValue([value.slice(6)]), certification: '' }); return; }
    if (value.startsWith('cert::')) { update({ certification: value.slice(6), technology: '' }); }
  };

  const contextItems = useMemo(() => {
    return items.filter((item) => {
      const search = filters.search.trim().toLocaleUpperCase('es-MX');
      const matchesSearch = !search || [item.collaboratorName, item.certificationName, item.technology, item.technologyName, item.profile]
        .some((value) => String(value ?? '').toLocaleUpperCase('es-MX').includes(search));
      return matchesSearch
        && (!selectedTechnologies.length || Boolean(item.technology && selectedTechnologies.includes(item.technology)))
        && matchesCertificationFilter(item, filters.certification)
        && (!filters.quarterCode || (filters.quarterCode === 'NO_QUARTER' ? !item.quarterCode : item.quarterCode === filters.quarterCode));
    });
  }, [filters.certification, filters.quarterCode, filters.search, items, selectedTechnologies]);

  const effectiveQuarterCode=filters.quarterCode || query.data?.vendorQuarter.currentCode || '';

  const filtered = useMemo(() => contextItems
    .filter((item) => matchesTrackingStatusFilter(item, filters.certificationStatus, effectiveQuarterCode))
    .filter((item) => !filters.critical || (filters.critical === 'OPEN' ? hasOpenCriticalResolution(item) : filters.critical === 'NO_ATTEMPT' ? item.attemptCount === 0 : filters.critical === 'ONE_ATTEMPT' ? item.attemptCount === 1 : filters.critical === 'LIMIT_REACHED' ? (Number(item.maxAttempts) > 0 && Number(item.attemptCount) >= Number(item.maxAttempts)) : true))
    .filter((item) => {
      if (!filters.attemptCriticality) return true;
      if (filters.attemptCriticality === 'NO_ATTEMPTS') return item.requiresAttempts && item.attemptCount === 0;
      if (filters.attemptCriticality === 'ONE_ATTEMPT') return item.requiresAttempts && item.attemptCount === 1;
      if (filters.attemptCriticality === 'LAST_AVAILABLE') return item.requiresAttempts && remainingAttempts(item) === 1 && !hasAttemptLimitReached(item);
      if (filters.attemptCriticality === 'LIMIT_REACHED') return hasAttemptLimitReached(item);
      return true;
    })
    .sort((a, b) => (direction === 'asc' ? 1 : -1) * compare(a, b, sort)), [contextItems, direction, filters.attemptCriticality, filters.certificationStatus, filters.critical, sort]);

  const metricContextItems = useMemo(() => contextItems.filter((item) => item.metricActive), [contextItems]);
  const summary = useMemo(() => buildTrackingSummary(metricContextItems), [metricContextItems]);
  const safePage=Math.min(page,Math.max(0,Math.ceil(filtered.length/size)-1));
  const paged=useMemo(()=>filtered.slice(safePage*size,safePage*size+size),[filtered,safePage,size]);
  React.useEffect(()=>{patchSort({page:0});},[filters.certificationStatus,filters.technology,filters.certification,filters.critical,filters.attemptCriticality,filters.quarterCode,filters.search]);
  const currentYearPeriods=useMemo(()=>periodOptions(query.data?.vendorQuarter.quarters??[],query.data?.vendorQuarter.currentCode,query.data?.vendorQuarter.referenceDate,true),[query.data?.vendorQuarter.quarters,query.data?.vendorQuarter.currentCode,query.data?.vendorQuarter.referenceDate]);
  const dueInPeriodCount=useMemo(()=>metricContextItems.filter((item)=>Boolean(effectiveQuarterCode&&item.quarterCode===effectiveQuarterCode)).length,[metricContextItems,effectiveQuarterCode]);
  const coverageHandoverItems = useMemo(() => contextItems.filter((item) => item.metricActive && item.coverageHandover), [contextItems]);
  const coverageWithoutValidityItems = useMemo(() => contextItems.filter((item) => item.metricActive && item.coverageNoValidCertification), [contextItems]);
  const coverageAlternateExpiringItems = useMemo(() => contextItems.filter((item) => Boolean(item.coverageGroupId) && !item.metricActive && item.status === 'EXPIRING'), [contextItems]);

  const activeFilters = useMemo<BBVAFilterSummaryItem[]>(() => {
    const active: BBVAFilterSummaryItem[] = [];
    if (filters.search.trim()) active.push({ key: 'search', label: `Búsqueda: ${filters.search.trim()}`, onRemove: () => update({ search: '' }) });
    if (filters.certificationStatus) active.push({ key: 'certificationStatus', label: `Estado: ${trackingStatusFilterLabel(filters.certificationStatus)}`, onRemove: () => update({ certificationStatus: '' }) });
    if (selectedTechnologies.length) active.push({ key: 'technology', label: selectedTechnologies.length === 1 ? `Tecnología: ${upperDisplay(selectedTechnologies[0])}` : `Tecnologías: ${selectedTechnologies.length}`, onRemove: () => update({ technology: '' }) });
    if (filters.certification) active.push({ key: 'certification', label: `Certificación: ${certificationFilterLabel(filters.certification)}`, onRemove: () => update({ certification: '' }) });
    if (filters.quarterCode) active.push({ key: 'quarterCode', label: `Periodo: ${filters.quarterCode === 'NO_QUARTER' ? 'Sin periodo' : formatPeriodCode(filters.quarterCode)}`, onRemove: () => update({ quarterCode: '' }) });
    if (filters.critical) active.push({ key: 'critical', label: `Intentos: ${filters.critical === 'OPEN' ? 'Críticos 2/2 abiertos' : filters.critical === 'NO_ATTEMPT' ? 'Sin intentos' : filters.critical === 'ONE_ATTEMPT' ? '1 intento' : 'Límite agotado'}`, onRemove: () => update({ critical: '' }) });
    if (filters.attemptCriticality) active.push({ key: 'attemptCriticality', label: `Intentos: ${{NO_ATTEMPTS:'Sin intentos',ONE_ATTEMPT:'1 intento',LAST_AVAILABLE:'Último disponible',LIMIT_REACHED:'Agotados'}[filters.attemptCriticality] ?? filters.attemptCriticality}`, onRemove: () => update({ attemptCriticality: '' }) });
    return active;
  }, [filters.attemptCriticality, filters.certification, filters.certificationStatus, filters.critical, filters.quarterCode, filters.search, selectedTechnologies, update]);

  const changeSort = (field: SortField) => {
    if (sort === field) patchSort({ direction: direction === 'asc' ? 'desc' : 'asc' });
    else patchSort({ sort: field, direction: 'asc' });
  };

  const filterStatus = (status: CollaboratorCertificationStatus | '') => update({ certificationStatus: status });

  const approve = async (date: string, score10: number | null) => {
    if (!approval) return;
    try {
      setError(null);
      await approveMutation.mutateAsync({ recordId: approval.certificationRecordId, payload: { applicationDate: date, result: 'APPROVED', score10, notes: 'Aprobación registrada desde Seguimiento.' } });
      setApproval(null);
      await query.refetch();
    } catch (e) { setError((e as Error).message); }
  };

  const startRecertification = async (item: CertificationTrackingItem) => {
    try {
      setError(null);
      const { collaboratorCertificationApi } = await import('../api/collaboratorCertificationApi');
      await collaboratorCertificationApi.recertify(item.collaboratorId, item.certificationRecordId);
      publishBbvaDataChange(['certifications', 'collaborators', 'dashboard']);
      await query.refetch();
    } catch (e) { setError((e as Error).message); }
  };

  const resolveCriticalItem = async (resolution: 'LOW_REQUESTED' | 'INTERN', notes: string) => {
    if (!criticalItem) return;
    try {
      setError(null);
      await resolveCritical.mutateAsync({ recordId: criticalItem.certificationRecordId, payload: { resolution, notes } });
      const item = criticalItem;
      setCriticalItem(null);
      await query.refetch();
      if (resolution === 'LOW_REQUESTED') {
        navigate(`/bbva/collaborators/${item.collaboratorId}/move-to-talent`, {
          state: {
            criticalCertification: item.certificationName,
            criticalMessage: 'La solicitud de baja quedó registrada por agotamiento 2/2. Completa el movimiento para confirmar la salida de BBVA.',
            preferredReasonGroup: 'BBVA_EXIT',
          },
        });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };


  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  return (
    <div className="bbva-page bbva-certification-tracking-page space-y-2 animate-fade-in">
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      {coverageWithoutValidityItems.length ? <BBVAAlert tone="error" persistent title="Sin cobertura tecnológica vigente">{coverageWithoutValidityItems.length} grupo{coverageWithoutValidityItems.length === 1 ? '' : 's'} de cobertura no tiene ninguna certificación tecnológica vigente. El registro que queda en métrica requiere atención inmediata.</BBVAAlert> : null}
      {coverageHandoverItems.length || coverageAlternateExpiringItems.length ? <BBVAAlert tone="info" persistent title="Seguimiento de cobertura tecnológica">{coverageHandoverItems.length ? `${coverageHandoverItems.length} relevo${coverageHandoverItems.length === 1 ? '' : 's'} activo${coverageHandoverItems.length === 1 ? '' : 's'}. ` : ''}{coverageAlternateExpiringItems.length ? `${coverageAlternateExpiringItems.length} certificación${coverageAlternateExpiringItems.length === 1 ? '' : 'es'} alterna${coverageAlternateExpiringItems.length === 1 ? '' : 's'} próxima${coverageAlternateExpiringItems.length === 1 ? '' : 's'} a vencer. ` : ''}Cada certificación conserva su propia vigencia y las alternas se monitorean aunque no impacten la métrica.</BBVAAlert> : null}

      <section className="bbva-density-filters w-full rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-[#020617]">
        <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-[minmax(210px,1.1fr)_minmax(360px,1.8fr)_minmax(180px,0.95fr)_minmax(180px,0.95fr)_minmax(180px,0.95fr)_auto] 2xl:items-center">
          <label className="relative min-w-0 w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder="Buscar colaborador..."
              aria-label="Buscar colaborador, tecnología o certificación"
              className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-[11px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-[#111c2e] [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:placeholder:text-slate-500 [.bbva-dark_&]:hover:border-cyan-500/50"
            />
          </label>
          <div className="min-w-0 w-full"><BBVASearchableSelect value={combinedScopeValue} onChange={updateCombinedScope} options={combinedScopeOptions} ariaLabel="Tecnología o certificación" searchPlaceholder="Buscar tecnología o certificación" /></div>
          <div className="min-w-0 w-full"><BBVASearchableSelect value={filters.quarterCode} onChange={(value) => update({ quarterCode: value })} options={[...currentYearPeriods, { value: 'NO_QUARTER', label: 'Sin periodo configurado' }]} ariaLabel="Periodo de vencimiento" searchPlaceholder="Buscar periodo" /></div>
          <div className="min-w-0 w-full"><BBVASearchableSelect value={filters.critical} onChange={(value) => update({ critical: value })} options={[{value:'',label:'Todos los intentos'},{value:'NO_ATTEMPT',label:'Sin intentos'},{value:'ONE_ATTEMPT',label:'1 intento'},{value:'LIMIT_REACHED',label:'Límite de intentos agotado'},{value:'OPEN',label:'Críticos 2/2 abiertos'}]} ariaLabel="Intentos o criticidad" /></div>
          <div className="min-w-0 w-full"><BBVASearchableSelect value={filters.certificationStatus} onChange={(value) => update({ certificationStatus: value })} options={[{ value: '', label: 'Todos los estados' }, { value: 'DUE_IN_PERIOD', label: 'Vence en el periodo' }, ...Object.entries(COLLABORATOR_CERTIFICATION_STATUS_LABELS).filter(([key]) => key !== 'NOT_APPLICABLE').map(([value, label]) => ({ value, label }))]} ariaLabel="Estado" /></div>
          <div className="flex w-full items-center justify-end gap-1.5 md:col-span-2 2xl:col-span-1">
            <BBVAButton variant="secondary" size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />} onClick={() => void query.refetch()}>Actualizar</BBVAButton>
            <BBVAButton variant="secondary" size="sm" onClick={reset} disabled={!activeFilters.length}>Limpiar</BBVAButton>
          </div>
        </div>
      </section>

      {!query.isLoading ? (
        <section aria-label="Resumen operativo de seguimiento" className="bbva-density-metrics rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(125px,1fr))] items-stretch gap-1.5">
            <BBVAMetricCard density="compact" label={`Vencen en ${formatPeriodCode(effectiveQuarterCode)}`} value={dueInPeriodCount} icon={<CalendarRange className="h-3.5 w-3.5" />} tone={dueInPeriodCount ? 'amber' : 'emerald'} supportingText="Vigencia dentro del periodo" active={filters.certificationStatus === 'DUE_IN_PERIOD'} onAction={() => update({ certificationStatus: filters.certificationStatus === 'DUE_IN_PERIOD' ? '' : 'DUE_IN_PERIOD' })} actionLabel={filters.certificationStatus === 'DUE_IN_PERIOD' ? 'Quitar filtro' : 'Filtrar'} />
            <BBVAMetricCard density="compact" label="Próximas a vencer" value={summary.expiring} icon={<Clock3 className="h-3.5 w-3.5" />} tone={summary.expiring ? 'amber' : 'emerald'} help={metricHelp.expiring} supportingText={summary.expiring ? 'Periodo de alerta' : 'Sin próximas'} active={filters.certificationStatus === 'EXPIRING'} onAction={() => filterStatus('EXPIRING')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Pendientes" value={summary.pending} icon={<CalendarClock className="h-3.5 w-3.5" />} tone={summary.pending ? 'slate' : 'emerald'} help={metricHelp.pending} supportingText={`${summary.applied} aplicadas · ${summary.scheduled} programadas`} active={filters.certificationStatus === 'PENDING'} onAction={() => filterStatus('PENDING')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Vencidas" value={summary.expired} icon={<ShieldAlert className="h-3.5 w-3.5" />} tone={summary.expired ? 'rose' : 'emerald'} help={metricHelp.expired} supportingText={summary.expired ? 'Fuera de vigencia' : 'Sin vencidas'} active={filters.certificationStatus === 'EXPIRED'} onAction={() => filterStatus('EXPIRED')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Reprobadas" value={summary.failed} icon={<AlertCircle className="h-3.5 w-3.5" />} tone={summary.failed ? 'rose' : 'emerald'} help={metricHelp.failed} supportingText={summary.limitReached ? `${summary.limitReached} sin intentos` : 'Ciclo actual'} active={filters.certificationStatus === 'FAILED'} onAction={() => filterStatus('FAILED')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Críticos 2/2" value={summary.criticalExit} icon={<ShieldAlert className="h-3.5 w-3.5" />} tone={summary.criticalExit ? 'rose' : 'emerald'} supportingText={summary.criticalExit ? 'Resolver baja / becario' : 'Sin casos críticos'} active={filters.critical === 'OPEN'} onAction={() => update({ critical: filters.critical === 'OPEN' ? '' : 'OPEN' })} actionLabel={filters.critical === 'OPEN' ? 'Quitar filtro' : 'Filtrar'} />
          </div>
        </section>
      ) : null}

      <div className="bbva-table-shell overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800">
        <div className="bbva-density-table-scroll overflow-x-auto overflow-y-visible">
          <table className="bbva-density-table bbva-tracking-table w-full min-w-[1360px] text-left text-[10.5px]">
            <thead className="bg-slate-50 text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:bg-slate-950/40"><tr>
              <th className="px-3 py-2"><BBVATableSortHeader label="Colaborador" active={sort === 'collaboratorName'} direction={direction} onClick={() => changeSort('collaboratorName')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Certificación" active={sort === 'certificationName'} direction={direction} onClick={() => changeSort('certificationName')} /></th>
              <th className="px-3 py-2">Periodo</th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Vigencia" active={sort === 'expirationDate'} direction={direction} onClick={() => changeSort('expirationDate')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Programación" active={sort === 'scheduledDate'} direction={direction} onClick={() => changeSort('scheduledDate')} /></th>
              <th className="px-3 py-2 text-center"><BBVATableSortHeader label="Intentos" active={sort === 'attempt'} direction={direction} onClick={() => changeSort('attempt')} align="center" /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Estado" active={sort === 'status'} direction={direction} onClick={() => changeSort('status')} /></th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">{paged.map((item) => {
              const limitReached = hasAttemptLimitReached(item);
              const criticalDecision = requiresCriticalExitReview(item);
              const criticalOpen = hasOpenCriticalResolution(item);
              const canApprove = item.requiresAttempts && !limitReached && ['PENDING', 'SCHEDULED', 'FAILED', 'APPLIED'].includes(item.status);
              const remaining = remainingAttempts(item);
              const isExpanded = expandedId === item.certificationRecordId;
              const scheduleText = scheduledContext(item.scheduledDate);
              const initialScheduleText = initialCertificationContext(item);
              return <Fragment key={item.certificationRecordId}>
                <tr
                  className={`bbva-density-row align-top cursor-pointer transition ${criticalOpen ? 'bg-rose-50/70 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 [.bbva-dark_&]:bg-rose-950/20 [.bbva-dark_&]:ring-rose-900/70' : 'hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/50'} ${isExpanded ? 'bg-blue-50/35 [.bbva-dark_&]:bg-blue-950/15' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : item.certificationRecordId)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setExpandedId(isExpanded ? null : item.certificationRecordId);
                    }
                  }}
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`${item.collaboratorName}, ${displayCertificationName(item.certificationName)}. ${isExpanded ? 'Ocultar' : 'Mostrar'} contexto`}
                  title="Clic para desplegar contexto"
                >
                  <td className="px-3 py-2.5"><div className="font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{displayPersonName(item.collaboratorName)}</div><div className="mt-0.5 text-[9px] text-slate-400">{displayRoleName(item.profile,'SIN PERFIL')} · {upperDisplay(item.technology,'SIN TECNOLOGÍA')}</div></td>
                  <td className="px-3 py-2.5"><div className="font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{displayCertificationName(item.certificationName)}</div><div className="mt-0.5 text-[9px] text-slate-400">{sentenceCaseData(item.technologyName || item.certificationType)}</div>{item.coverageGroupId && item.certificationType === 'TECHNOLOGICAL' ? <div className="mt-1 flex flex-wrap gap-1"><span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${item.metricActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700 [.bbva-dark_&]:border-emerald-500/30 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300' : 'border-slate-300 bg-slate-100 text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800/60 [.bbva-dark_&]:text-slate-300'}`}>Cobertura tecnológica · {item.metricActive?'en métrica':'alterna'}</span>{item.metricActive && item.coverageNoValidCertification ? <span className="inline-flex rounded-full border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[8px] font-semibold text-rose-700 [.bbva-dark_&]:border-rose-500/30 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-300">Sin cobertura vigente</span> : item.metricActive && item.coverageHandover ? <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700 [.bbva-dark_&]:border-amber-500/30 [.bbva-dark_&]:bg-amber-500/10 [.bbva-dark_&]:text-amber-300">Relevo activo{item.coveragePreviousCertificationName ? ` · ${displayCertificationName(item.coveragePreviousCertificationName)} → ${displayCertificationName(item.certificationName)}` : ''}</span> : !item.metricActive && item.status === 'EXPIRING' ? <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700 [.bbva-dark_&]:border-amber-500/30 [.bbva-dark_&]:bg-amber-500/10 [.bbva-dark_&]:text-amber-300">Alterna por vencer</span> : null}</div> : null}</td>
                  <td className="px-3 py-2.5"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold ${item.quarterCode === query.data?.vendorQuarter.currentCode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{formatPeriodCode(item.quarterCode, '—')}</span></td>
                  <td className="px-3 py-2.5"><div className="font-medium text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.expirationDate)}</div><div className={`mt-0.5 text-[9px] ${item.status === 'EXPIRED' ? 'font-semibold text-rose-600 [.bbva-dark_&]:text-rose-300' : item.status === 'EXPIRING' ? 'font-semibold text-amber-600 [.bbva-dark_&]:text-amber-300' : 'text-slate-400'}`}>{expirationContext(item)}</div></td>
                  <td className="px-3 py-2.5">{item.scheduledDate ? <><span className="inline-flex items-center gap-1 font-medium text-blue-700 [.bbva-dark_&]:text-cyan-300"><CalendarClock className="h-3 w-3" />{formatDate(item.scheduledDate)}</span>{scheduleText ? <div className="mt-0.5 text-[9px] text-slate-400">{scheduleText}</div> : null}</> : initialScheduleText ? <><span className={`inline-flex items-center gap-1 font-semibold ${item.initialScheduleTiming === 'OVERDUE' ? 'text-rose-700 [.bbva-dark_&]:text-rose-300' : item.initialScheduleTiming === 'DUE_TODAY' ? 'text-amber-700 [.bbva-dark_&]:text-amber-300' : 'text-blue-700 [.bbva-dark_&]:text-cyan-300'}`}><CalendarClock className="h-3 w-3" />{formatDate(item.initialScheduleDueDate)}</span><div className="mt-0.5 text-[9px] text-slate-500">{initialScheduleText}</div></> : <span className="text-slate-400">Sin fecha programada</span>}</td>
                  <td className="px-3 py-2.5 text-center">{item.requiresAttempts ? <div><div className="font-semibold tabular-nums text-slate-800 [.bbva-dark_&]:text-slate-200">{item.maxAttempts !== null ? `${item.attemptCount} / ${item.maxAttempts}` : item.attemptCount}</div><div className={`mt-0.5 text-[9px] ${limitReached ? 'font-semibold text-rose-600 [.bbva-dark_&]:text-rose-300' : remaining === 1 ? 'font-semibold text-amber-600 [.bbva-dark_&]:text-amber-300' : 'text-slate-400'}`}>{attemptContext(item)}</div></div> : <span className="text-slate-400">No aplica</span>}</td>
                  <td className="px-3 py-2.5">{criticalOpen ? <span className="inline-flex rounded-full bg-rose-600 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[.04em] text-white">Crítico</span> : isRecertificationToSchedule(item) ? <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[8.5px] font-semibold text-amber-700 [.bbva-dark_&]:border-amber-500/30 [.bbva-dark_&]:bg-amber-500/10 [.bbva-dark_&]:text-amber-300">Recertificación por programar</span> : <BBVACertificationStatusBadge status={item.status} />}<div className={`mt-1 text-[9px] leading-3 ${criticalOpen ? 'font-semibold text-rose-700 [.bbva-dark_&]:text-rose-300' : 'text-slate-500 [.bbva-dark_&]:text-slate-400'}`}>{criticalDecision ? '2/2 intentos agotados · decisión pendiente' : item.coverageNoValidCertification && item.metricActive ? 'Sin cobertura tecnológica vigente' : item.coverageHandover && item.metricActive ? `Relevo activo${item.coveragePreviousCertificationName ? ` desde ${displayCertificationName(item.coveragePreviousCertificationName)}` : ''}` : !item.metricActive && item.coverageGroupId && item.status === 'EXPIRING' ? 'Alterna próxima a vencer' : item.criticalResolutionStatus === 'LOW_REQUESTED' ? 'Baja solicitada · falta confirmar salida' : item.criticalResolutionStatus === 'INTERN' ? 'Caso resuelto como becario' : item.criticalResolutionStatus === 'LOW_CONFIRMED' ? 'Baja de BBVA confirmada' : isRecertificationToSchedule(item) ? 'Nuevo ciclo abierto · falta programar presentación' : item.status === 'EXPIRED' ? 'Revisión de vigencia' : item.status === 'RECERTIFICATION_PENDING' ? 'Nuevo ciclo requerido' : item.status === 'EXPIRING' ? 'Seguimiento preventivo' : item.status === 'FAILED' ? 'Revisar siguiente intento' : item.status === 'SCHEDULED' ? 'Presentación programada' : 'Acción pendiente'}</div></td>
                  <td className="px-3 py-2.5 text-right" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <details className="group relative inline-block text-left">
                      <summary className="inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-[9px] font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [&::-webkit-details-marker]:hidden [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-[#020617] [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:border-cyan-500/50 [.bbva-dark_&]:hover:bg-slate-900">
                        Acciones
                        <MoreHorizontal className="h-3 w-3" />
                      </summary>
                      <div className="absolute right-0 z-[80] mt-1 min-w-[164px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-[#111c2e]">
                        {criticalDecision ? <BBVAButton variant="table" size="sm" className="w-full justify-start border-0 px-2.5 text-rose-700 shadow-none hover:bg-rose-50 [.bbva-dark_&]:text-rose-300 [.bbva-dark_&]:hover:bg-rose-500/10" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setCriticalItem(item); }}>Resolver</BBVAButton> : item.criticalResolutionStatus === 'LOW_REQUESTED' ? <BBVAButton variant="table" size="sm" className="w-full justify-start border-0 px-2.5 text-rose-700 shadow-none hover:bg-rose-50 [.bbva-dark_&]:text-rose-300 [.bbva-dark_&]:hover:bg-rose-500/10" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); navigate(`/bbva/collaborators/${item.collaboratorId}/move-to-talent`, { state: { criticalCertification: item.certificationName, criticalMessage: 'Solicitud de baja registrada por agotamiento 2/2. Completa el movimiento para confirmar la salida de BBVA.', preferredReasonGroup: 'BBVA_EXIT' } }); }}><ArrowRightLeft className="h-3 w-3" />Continuar baja</BBVAButton> : null}
                        {item.requiresAttempts && !limitReached && ['PENDING', 'SCHEDULED', 'FAILED'].includes(item.status) ? <BBVAButton variant="table" size="sm" className="w-full justify-start border-0 px-2.5 text-blue-700 shadow-none hover:bg-blue-50 [.bbva-dark_&]:text-cyan-300 [.bbva-dark_&]:hover:bg-cyan-500/10" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setPendingSchedule(item); }}><CalendarClock className="h-3 w-3" />{item.scheduledDate ? 'Reprogramar' : 'Programar'}</BBVAButton> : null}
                        {canApprove ? <BBVAButton variant="table" size="sm" className="w-full justify-start border-0 px-2.5 text-emerald-700 shadow-none hover:bg-emerald-50 [.bbva-dark_&]:text-emerald-300 [.bbva-dark_&]:hover:bg-emerald-500/10" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setApproval(item); }}><CheckCircle2 className="h-3 w-3" />Aprobar</BBVAButton> : null}
                        {['EXPIRING', 'EXPIRED', 'RECERTIFICATION_PENDING'].includes(item.status) && item.recertificationEnabled ? <BBVAButton variant="table" size="sm" className="w-full justify-start border-0 px-2.5 text-amber-700 shadow-none hover:bg-amber-50 [.bbva-dark_&]:text-amber-300 [.bbva-dark_&]:hover:bg-amber-500/10" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void startRecertification(item); }}><RefreshCw className="h-3 w-3" />Recertificar</BBVAButton> : null}
                        <BBVAButton variant="table" size="sm" className="w-full justify-start border-0 px-2.5 text-slate-700 shadow-none hover:bg-slate-100 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); navigate(`/bbva/collaborators/${item.collaboratorId}/certifications/${item.certificationRecordId}`, { state: { returnTo: `/bbva/certifications/tracking${window.location.search}` } }); }}><Eye className="h-3 w-3" />Ver detalle</BBVAButton>
                      </div>
                    </details>
                  </td>
                </tr>
                {isExpanded ? <tr className="bg-slate-50/70 [.bbva-dark_&]:bg-slate-950/25"><td colSpan={8} className="px-4 py-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-11">
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Ciclo actual</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">Ciclo {item.currentCycle}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Alta BBVA</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.bbvaStartDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Límite inicial</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.initialDueDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Última aplicación</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.lastApplicationDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Aprobación</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.approvedDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Vencimiento</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.expirationDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Intentos</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{attemptContext(item)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Resultado del ciclo</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{latestAttemptLabel(item)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Resolución crítica</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{item.criticalResolutionStatus === 'INTERN' ? 'Becario' : item.criticalResolutionStatus === 'LOW_REQUESTED' ? 'Baja solicitada' : item.criticalResolutionStatus === 'LOW_CONFIRMED' ? 'Baja confirmada' : criticalDecision ? 'Pendiente' : 'No aplica'}</div></div>
                </div></td></tr> : null}
              </Fragment>;
            })}</tbody>
          </table>
        </div>
        {query.isLoading ? <div className="px-4 py-8 text-center text-xs text-slate-500">Cargando seguimiento...</div> : null}
        {!query.isLoading && filtered.length === 0 ? <BBVAEmptyState title="No hay certificaciones con este contexto" description={activeFilters.length ? 'No existen registros que coincidan con los filtros activos. Ajusta o limpia los filtros para ampliar el resultado.' : 'Actualmente no existen certificaciones que requieran seguimiento.'} action={activeFilters.length ? <BBVAButton variant="secondary" size="sm" onClick={reset}>Limpiar filtros</BBVAButton> : undefined} /> : null}
        {!query.isLoading && filtered.length ? <BBVAPagination total={filtered.length} page={safePage} size={size} onPageChange={(next)=>patchSort({page:next})} onSizeChange={(next)=>patchSort({size:next,page:0})}/> : null}
      </div>




      <CertificationScheduleDialog
        open={Boolean(pendingSchedule)}
        certificationName={displayCertificationName(pendingSchedule?.certificationName, '')}
        initialDate={pendingSchedule?.scheduledDate}
        busy={scheduleMutation.isPending}
        onCancel={() => setPendingSchedule(null)}
        onConfirm={(date) => {
          if (!pendingSchedule) return;
          scheduleMutation.mutate({
            recordId: pendingSchedule.certificationRecordId,
            payload: { scheduledDate: date, notes: 'Programación registrada desde Seguimiento.', mandatory: true },
          }, {
            onSuccess: async () => { setPendingSchedule(null); setError(null); await query.refetch(); },
            onError: (e) => { setPendingSchedule(null); setError((e as Error).message); },
          });
        }}
      />
      <CertificationQuickApprovalDialog open={Boolean(approval)} collaboratorName={approval?.collaboratorName ?? ''} certificationName={displayCertificationName(approval?.certificationName, '')} attemptNumber={approval?.nextAttemptNumber ?? 1} tracksScore={Boolean(approval?.tracksScore)} busy={approveMutation.isPending} onCancel={() => setApproval(null)} onConfirm={(date, score10) => void approve(date, score10)} />
      <CertificationCriticalResolutionDialog
        open={Boolean(criticalItem)}
        collaboratorName={criticalItem?.collaboratorName ?? ''}
        certificationName={displayCertificationName(criticalItem?.certificationName, '')}
        busy={resolveCritical.isPending}
        onCancel={() => setCriticalItem(null)}
        onResolve={(resolution, notes) => void resolveCriticalItem(resolution, notes)}
      />

    </div>
  );
};
