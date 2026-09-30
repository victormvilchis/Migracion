import React, { Fragment, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, CalendarClock, CheckCircle2, Clock3, Eye, RefreshCw, ShieldAlert, CalendarRange } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACertificationStatusBadge } from '../../componentsBBVATalent/BBVACertificationStatusBadge';
import { BBVAEmptyState } from '../../componentsBBVATalent/BBVAEmptyState';
import type { BBVAFilterSummaryItem } from '../../componentsBBVATalent/BBVAFilterSummary';
import { BBVAFilterBar } from '../../componentsBBVATalent/BBVAFilterBar';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVAMultiSelect } from '../../componentsBBVATalent/BBVAMultiSelect';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { CertificationCriticalResolutionDialog } from '../../componentsBBVATalent/CertificationCriticalResolutionDialog';
import { CertificationQuickApprovalDialog } from '../../componentsBBVATalent/CertificationQuickApprovalDialog';
import {
  useAddCertificationAttempt,
  useCertificationTracking,
  useResolveCriticalCertification,
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
  profile: '',
  technology: '',
  certification: '',
  critical: '',
  attemptCriticality: '',
  quarterCode: '',
};

type SortField = 'collaboratorName' | 'certificationName' | 'status' | 'expirationDate' | 'scheduledDate' | 'attempt';

const metricHelp = {
  attention: {
    what: 'Certificaciones aplicables de colaboradores activos que requieren una acción o seguimiento en su estado actual.',
    calculation: 'Total de registros entregados por Seguimiento, excluyendo Vigente y No aplica.',
    interpretation: 'Es el universo operativo de esta pantalla, no un score de riesgo.',
  },
  expired: {
    what: 'Certificaciones cuya vigencia calculada ya terminó.',
    calculation: 'Registros cuyo estado de dominio actual es Vencida.',
    interpretation: 'Requieren revisión de vigencia y, cuando corresponda, iniciar recertificación.',
  },
  recertification: {
    what: 'Certificaciones cuyo estado actual requiere un nuevo ciclo de recertificación.',
    calculation: 'Registros con estado Recertificación pendiente.',
    interpretation: 'La condición proviene de las reglas configuradas de la certificación.',
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

function matchesTrackingStatusFilter(item: CertificationTrackingItem, status: string, effectiveQuarterCode: string): boolean {
  if (!status) return true;
  if (status === 'DUE_IN_PERIOD') return Boolean(effectiveQuarterCode && item.expirationDate && item.quarterCode === effectiveQuarterCode);
  return item.status === status;
}

function trackingStatusFilterLabel(status: string): string {
  if (status === 'DUE_IN_PERIOD') return 'Vence en el periodo';
  return COLLABORATOR_CERTIFICATION_STATUS_LABELS[status as CollaboratorCertificationStatus] ?? status;
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
  const [error, setError] = useState<string | null>(null);
  const approveMutation = useAddCertificationAttempt(approval?.collaboratorId ?? '');
  const resolveCritical = useResolveCriticalCertification(criticalItem?.collaboratorId ?? '');
  const items = query.data?.items ?? [];

  const options = useMemo(() => ({
    profiles: uniqueOptions(items, (item) => item.profile),
    technologies: uniqueOptions(items, (item) => item.technology),
    certifications: uniqueOptions(items, (item) => item.certificationName),
  }), [items]);

  const selectedTechnologies = useMemo(() => decodeMultiValue(filters.technology), [filters.technology]);

  const contextItems = useMemo(() => {
    return items.filter((item) => {
      return (!filters.profile || item.profile === filters.profile)
        && (!selectedTechnologies.length || Boolean(item.technology && selectedTechnologies.includes(item.technology)))
        && (!filters.certification || item.certificationName === filters.certification)
        && (!filters.quarterCode || (filters.quarterCode === 'NO_QUARTER' ? !item.quarterCode : item.quarterCode === filters.quarterCode));
    });
  }, [filters.certification, filters.profile, filters.quarterCode, items, selectedTechnologies]);

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

  const summary = useMemo(() => buildTrackingSummary(contextItems), [contextItems]);
  const attentionRequired=useMemo(()=>contextItems.filter((item)=>!['VALID','NOT_APPLICABLE'].includes(item.status)).length,[contextItems]);
  const safePage=Math.min(page,Math.max(0,Math.ceil(filtered.length/size)-1));
  const paged=useMemo(()=>filtered.slice(safePage*size,safePage*size+size),[filtered,safePage,size]);
  React.useEffect(()=>{patchSort({page:0});},[filters.certificationStatus,filters.profile,filters.technology,filters.certification,filters.critical,filters.attemptCriticality,filters.quarterCode]);
  const currentYearPeriods=useMemo(()=>periodOptions(query.data?.vendorQuarter.quarters??[],query.data?.vendorQuarter.currentCode,query.data?.vendorQuarter.referenceDate,true),[query.data?.vendorQuarter.quarters,query.data?.vendorQuarter.currentCode,query.data?.vendorQuarter.referenceDate]);
  const dueInPeriodCount=useMemo(()=>contextItems.filter((item)=>Boolean(effectiveQuarterCode&&item.quarterCode===effectiveQuarterCode)).length,[contextItems,effectiveQuarterCode]);

  const activeFilters = useMemo<BBVAFilterSummaryItem[]>(() => {
    const active: BBVAFilterSummaryItem[] = [];
    if (filters.certificationStatus) active.push({ key: 'certificationStatus', label: `Estado: ${trackingStatusFilterLabel(filters.certificationStatus)}`, onRemove: () => update({ certificationStatus: '' }) });
    if (filters.profile) active.push({ key: 'profile', label: `Perfil: ${sentenceCaseData(filters.profile)}`, onRemove: () => update({ profile: '' }) });
    if (selectedTechnologies.length) active.push({ key: 'technology', label: selectedTechnologies.length === 1 ? `Tecnología: ${upperDisplay(selectedTechnologies[0])}` : `Tecnologías: ${selectedTechnologies.length}`, onRemove: () => update({ technology: '' }) });
    if (filters.certification) active.push({ key: 'certification', label: `Certificación: ${displayCertificationName(filters.certification)}`, onRemove: () => update({ certification: '' }) });
    if (filters.quarterCode) active.push({ key: 'quarterCode', label: `Periodo: ${filters.quarterCode === 'NO_QUARTER' ? 'Sin periodo' : formatPeriodCode(filters.quarterCode)}`, onRemove: () => update({ quarterCode: '' }) });
    if (filters.critical) active.push({ key: 'critical', label: `Intentos: ${filters.critical === 'OPEN' ? 'Críticos 2/2 abiertos' : filters.critical === 'NO_ATTEMPT' ? 'Sin intentos' : filters.critical === 'ONE_ATTEMPT' ? '1 intento' : 'Límite agotado'}`, onRemove: () => update({ critical: '' }) });
    if (filters.attemptCriticality) active.push({ key: 'attemptCriticality', label: `Intentos: ${{NO_ATTEMPTS:'Sin intentos',ONE_ATTEMPT:'1 intento',LAST_AVAILABLE:'Último disponible',LIMIT_REACHED:'Agotados'}[filters.attemptCriticality] ?? filters.attemptCriticality}`, onRemove: () => update({ attemptCriticality: '' }) });
    return active;
  }, [filters.attemptCriticality, filters.certification, filters.certificationStatus, filters.critical, filters.profile, filters.quarterCode, selectedTechnologies, update]);

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
    <div className="space-y-2 animate-fade-in">
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

      <BBVAFilterBar actions={<><BBVAButton variant="secondary" size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />} onClick={() => void query.refetch()}>Actualizar</BBVAButton>{activeFilters.length ? <BBVAButton variant="secondary" size="sm" onClick={reset}>Limpiar</BBVAButton> : null}</>}>
        
        <BBVAMultiSelect className="w-full sm:w-[190px]" values={selectedTechnologies} onChange={(values) => update({ technology: encodeMultiValue(values) })} options={options.technologies.map((option)=>({ ...option, label: upperDisplay(option.label) }))} placeholder="Todas las tecnologías" selectedLabel="tecnologías" ariaLabel="Tecnología" />
        <div className="w-full sm:w-[180px]"><BBVASearchableSelect value={filters.profile} onChange={(value) => update({ profile: value })} options={[{ value: '', label: 'Todos los perfiles' }, ...options.profiles.map((option)=>({ ...option, label: sentenceCaseData(option.label) }))]} ariaLabel="Perfil" /></div>
        <div className="w-full sm:w-[205px]"><BBVASearchableSelect value={filters.certification} onChange={(value) => update({ certification: value })} options={[{ value: '', label: 'Todas las certificaciones' }, ...options.certifications.map((option)=>({ ...option, label: displayCertificationName(option.label) }))]} ariaLabel="Certificación" /></div>
        <div className="w-full sm:w-[190px]"><BBVASearchableSelect value={filters.quarterCode} onChange={(value) => update({ quarterCode: value })} options={[...currentYearPeriods, { value: 'NO_QUARTER', label: 'Sin periodo configurado' }]} ariaLabel="Periodo de vencimiento" searchPlaceholder="Buscar periodo" /></div>
        <div className="w-full sm:w-[190px]"><BBVASearchableSelect value={filters.critical} onChange={(value) => update({ critical: value })} options={[{value:'',label:'Todos los intentos'},{value:'NO_ATTEMPT',label:'Sin intentos'},{value:'ONE_ATTEMPT',label:'1 intento'},{value:'LIMIT_REACHED',label:'Límite de intentos agotado'},{value:'OPEN',label:'Críticos 2/2 abiertos'}]} ariaLabel="Intentos o criticidad" /></div>
        <div className="w-full sm:w-[185px]"><BBVASearchableSelect value={filters.certificationStatus} onChange={(value) => update({ certificationStatus: value })} options={[{ value: '', label: 'Todos los estados' }, { value: 'DUE_IN_PERIOD', label: 'Vence en el periodo' }, ...Object.entries(COLLABORATOR_CERTIFICATION_STATUS_LABELS).filter(([key]) => key !== 'NOT_APPLICABLE').map(([value, label]) => ({ value, label }))]} ariaLabel="Estado" /></div>
      </BBVAFilterBar>

      {!query.isLoading ? (
        <section aria-label="Resumen operativo de seguimiento" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(125px,1fr))] items-stretch gap-1.5">
            <BBVAMetricCard density="compact" label={`Vencen en ${formatPeriodCode(effectiveQuarterCode)}`} value={dueInPeriodCount} icon={<CalendarRange className="h-3.5 w-3.5" />} tone={dueInPeriodCount ? 'amber' : 'emerald'} supportingText="Vigencia dentro del periodo" active={filters.certificationStatus === 'DUE_IN_PERIOD'} onAction={() => update({ certificationStatus: filters.certificationStatus === 'DUE_IN_PERIOD' ? '' : 'DUE_IN_PERIOD' })} actionLabel={filters.certificationStatus === 'DUE_IN_PERIOD' ? 'Quitar filtro' : 'Filtrar'} />
            <BBVAMetricCard density="compact" label="Atención requerida" value={attentionRequired} icon={<AlertCircle className="h-3.5 w-3.5" />} tone="blue" help={metricHelp.attention} supportingText={`${summary.scheduled} con fecha programada`} active={!filters.certificationStatus} onAction={() => filterStatus('')} actionLabel="Todas" />
            <BBVAMetricCard density="compact" label="Críticos 2/2" value={summary.criticalExit} icon={<ShieldAlert className="h-3.5 w-3.5" />} tone={summary.criticalExit ? 'rose' : 'emerald'} supportingText={summary.criticalExit ? 'Resolver baja / becario' : 'Sin casos críticos'} active={filters.critical === 'OPEN'} onAction={() => update({ critical: filters.critical === 'OPEN' ? '' : 'OPEN' })} actionLabel={filters.critical === 'OPEN' ? 'Quitar filtro' : 'Filtrar'} />
            <BBVAMetricCard density="compact" label="Vencidas" value={summary.expired} icon={<ShieldAlert className="h-3.5 w-3.5" />} tone={summary.expired ? 'rose' : 'emerald'} help={metricHelp.expired} supportingText={summary.expired ? 'Fuera de vigencia' : 'Sin vencidas'} active={filters.certificationStatus === 'EXPIRED'} onAction={() => filterStatus('EXPIRED')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Recertificación" value={summary.recertificationPending} icon={<RefreshCw className="h-3.5 w-3.5" />} tone={summary.recertificationPending ? 'orange' : 'emerald'} help={metricHelp.recertification} supportingText={summary.recertificationPending ? 'Nuevo ciclo requerido' : 'Sin pendientes'} active={filters.certificationStatus === 'RECERTIFICATION_PENDING'} onAction={() => filterStatus('RECERTIFICATION_PENDING')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Próximas a vencer" value={summary.expiring} icon={<Clock3 className="h-3.5 w-3.5" />} tone={summary.expiring ? 'amber' : 'emerald'} help={metricHelp.expiring} supportingText={summary.expiring ? 'Periodo de alerta' : 'Sin próximas'} active={filters.certificationStatus === 'EXPIRING'} onAction={() => filterStatus('EXPIRING')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Reprobadas" value={summary.failed} icon={<AlertCircle className="h-3.5 w-3.5" />} tone={summary.failed ? 'rose' : 'emerald'} help={metricHelp.failed} supportingText={summary.limitReached ? `${summary.limitReached} sin intentos` : 'Ciclo actual'} active={filters.certificationStatus === 'FAILED'} onAction={() => filterStatus('FAILED')} actionLabel="Filtrar" />
            <BBVAMetricCard density="compact" label="Pendientes" value={summary.pending} icon={<CalendarClock className="h-3.5 w-3.5" />} tone={summary.pending ? 'slate' : 'emerald'} help={metricHelp.pending} supportingText={`${summary.applied} aplicadas · ${summary.scheduled} programadas`} active={filters.certificationStatus === 'PENDING'} onAction={() => filterStatus('PENDING')} actionLabel="Filtrar" />
          </div>
        </section>
      ) : null}

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[1360px] text-left text-[10.5px]">
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
                  className={`align-top cursor-pointer transition ${criticalOpen ? 'bg-rose-50/70 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 [.bbva-dark_&]:bg-rose-950/20 [.bbva-dark_&]:ring-rose-900/70' : 'hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/50'} ${isExpanded ? 'bg-blue-50/35 [.bbva-dark_&]:bg-blue-950/15' : ''}`}
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
                  <td className="px-3 py-2.5"><div className="font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{displayCertificationName(item.certificationName)}</div><div className="mt-0.5 text-[9px] text-slate-400">{sentenceCaseData(item.technologyName || item.certificationType)}</div></td>
                  <td className="px-3 py-2.5"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold ${item.quarterCode === query.data?.vendorQuarter.currentCode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{formatPeriodCode(item.quarterCode, '—')}</span></td>
                  <td className="px-3 py-2.5"><div className="font-medium text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.expirationDate)}</div><div className={`mt-0.5 text-[9px] ${item.status === 'EXPIRED' ? 'font-semibold text-rose-600 [.bbva-dark_&]:text-rose-300' : item.status === 'EXPIRING' ? 'font-semibold text-amber-600 [.bbva-dark_&]:text-amber-300' : 'text-slate-400'}`}>{expirationContext(item)}</div></td>
                  <td className="px-3 py-2.5">{item.scheduledDate ? <><span className="inline-flex items-center gap-1 font-medium text-blue-700 [.bbva-dark_&]:text-cyan-300"><CalendarClock className="h-3 w-3" />{formatDate(item.scheduledDate)}</span>{scheduleText ? <div className="mt-0.5 text-[9px] text-slate-400">{scheduleText}</div> : null}</> : initialScheduleText ? <><span className={`inline-flex items-center gap-1 font-semibold ${item.initialScheduleTiming === 'OVERDUE' ? 'text-rose-700 [.bbva-dark_&]:text-rose-300' : item.initialScheduleTiming === 'DUE_TODAY' ? 'text-amber-700 [.bbva-dark_&]:text-amber-300' : 'text-blue-700 [.bbva-dark_&]:text-cyan-300'}`}><CalendarClock className="h-3 w-3" />{formatDate(item.initialScheduleDueDate)}</span><div className="mt-0.5 text-[9px] text-slate-500">{initialScheduleText}</div></> : <span className="text-slate-400">Sin fecha programada</span>}</td>
                  <td className="px-3 py-2.5 text-center">{item.requiresAttempts ? <div><div className="font-semibold tabular-nums text-slate-800 [.bbva-dark_&]:text-slate-200">{item.maxAttempts !== null ? `${item.attemptCount} / ${item.maxAttempts}` : item.attemptCount}</div><div className={`mt-0.5 text-[9px] ${limitReached ? 'font-semibold text-rose-600 [.bbva-dark_&]:text-rose-300' : remaining === 1 ? 'font-semibold text-amber-600 [.bbva-dark_&]:text-amber-300' : 'text-slate-400'}`}>{attemptContext(item)}</div></div> : <span className="text-slate-400">No aplica</span>}</td>
                  <td className="px-3 py-2.5">{criticalOpen ? <span className="inline-flex rounded-full bg-rose-600 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[.04em] text-white">Crítico</span> : <BBVACertificationStatusBadge status={item.status} />}<div className={`mt-1 text-[9px] leading-3 ${criticalOpen ? 'font-semibold text-rose-700 [.bbva-dark_&]:text-rose-300' : 'text-slate-500 [.bbva-dark_&]:text-slate-400'}`}>{criticalDecision ? '2/2 intentos agotados · decisión pendiente' : item.criticalResolutionStatus === 'LOW_REQUESTED' ? 'Baja solicitada · falta confirmar salida' : item.criticalResolutionStatus === 'INTERN' ? 'Caso resuelto como becario' : item.criticalResolutionStatus === 'LOW_CONFIRMED' ? 'Baja de BBVA confirmada' : item.status === 'EXPIRED' ? 'Revisión de vigencia' : item.status === 'RECERTIFICATION_PENDING' ? 'Nuevo ciclo requerido' : item.status === 'EXPIRING' ? 'Seguimiento preventivo' : item.status === 'FAILED' ? 'Revisar siguiente intento' : item.status === 'SCHEDULED' ? 'Presentación programada' : 'Acción pendiente'}</div></td>
                  <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><div className="flex flex-wrap justify-end gap-1.5">
                    {criticalDecision ? <BBVAButton variant="table" size="sm" className="border-rose-300 bg-rose-50 font-semibold text-rose-700 hover:bg-rose-100" onClick={() => setCriticalItem(item)}>Resolver</BBVAButton> : item.criticalResolutionStatus === 'LOW_REQUESTED' ? <BBVAButton variant="table" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => navigate(`/bbva/collaborators/${item.collaboratorId}/move-to-talent`, { state: { criticalCertification: item.certificationName, criticalMessage: 'Solicitud de baja registrada por agotamiento 2/2. Completa el movimiento para confirmar la salida de BBVA.', preferredReasonGroup: 'BBVA_EXIT' } })}><ArrowRightLeft className="h-3 w-3" />Continuar baja</BBVAButton> : null}
                    {canApprove ? <BBVAButton variant="table" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setApproval(item)}><CheckCircle2 className="h-3 w-3" />Aprobar</BBVAButton> : null}
                    {['EXPIRING', 'EXPIRED', 'RECERTIFICATION_PENDING'].includes(item.status) && item.recertificationEnabled ? <BBVAButton variant="table" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => void startRecertification(item)}><RefreshCw className="h-3 w-3" />Recertificar</BBVAButton> : null}
                    <BBVAButton variant="table" size="sm" onClick={() => navigate(`/bbva/collaborators/${item.collaboratorId}/certifications/${item.certificationRecordId}`, { state: { returnTo: `/bbva/certifications/tracking${window.location.search}` } })}><Eye className="h-3 w-3" />Ver</BBVAButton>
                  </div></td>
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
