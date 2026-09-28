import React, { Fragment, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Clock3, Eye, Mail, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACertificationStatusBadge } from '../../componentsBBVATalent/BBVACertificationStatusBadge';
import { BBVAChartCard } from '../../componentsBBVATalent/BBVAChartCard';
import { BBVAEmptyState } from '../../componentsBBVATalent/BBVAEmptyState';
import { BBVAFilterSummary, type BBVAFilterSummaryItem } from '../../componentsBBVATalent/BBVAFilterSummary';
import { BBVAInsightCard } from '../../componentsBBVATalent/BBVAInsightCard';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVAMetricsSkeleton } from '../../componentsBBVATalent/BBVAMetricsSkeleton';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { CertificationCommunicationDialog } from '../../componentsBBVATalent/CertificationCommunicationDialog';
import { CertificationQuickApprovalDialog } from '../../componentsBBVATalent/CertificationQuickApprovalDialog';
import {
  useAddCertificationAttempt,
  useCertificationTracking,
  useGenerateCertificationCommunication,
  usePrepareCertificationCommunicationEmail,
} from '../hooks/useCollaboratorCertifications';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useBBVAListQueryState } from '../hooks/useBBVAListQueryState';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';
import {
  attemptContext,
  buildTrackingInsights,
  buildTrackingSummary,
  expirationContext,
  hasAttemptLimitReached,
  remainingAttempts,
  scheduledContext,
  trackingPriority,
} from '../lib/certificationTracking';
import {
  COLLABORATOR_CERTIFICATION_STATUS_LABELS,
  type CertificationCommunication,
  type CertificationTrackingItem,
  type CollaboratorCertificationStatus,
} from '../types/collaboratorCertification';

const filterDefaults = {
  search: '',
  certificationStatus: '',
  profile: '',
  technology: '',
  certification: '',
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

export const CertificationTrackingPage: React.FC = () => {
  const query = useCertificationTracking();
  const navigate = useNavigate();
  const { state: filters, update, reset } = useBBVAListQueryState(filterDefaults);
  const { state: sortState, patch: patchSort } = useBBVAListMemory<{ sort: SortField; direction: 'asc' | 'desc' }>('certification-tracking-sort', { sort: 'status', direction: 'asc' });
  const { sort, direction } = sortState;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approval, setApproval] = useState<CertificationTrackingItem | null>(null);
  const [communicationItem, setCommunicationItem] = useState<CertificationTrackingItem | null>(null);
  const [communication, setCommunication] = useState<CertificationCommunication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const approveMutation = useAddCertificationAttempt(approval?.collaboratorId ?? '');
  const generateCommunication = useGenerateCertificationCommunication(communicationItem?.collaboratorId ?? '');
  const prepareCommunication = usePrepareCertificationCommunicationEmail(communicationItem?.collaboratorId ?? '');
  const items = query.data?.items ?? [];

  const options = useMemo(() => ({
    profiles: uniqueOptions(items, (item) => item.profile),
    technologies: uniqueOptions(items, (item) => item.technology),
    certifications: uniqueOptions(items, (item) => item.certificationName),
  }), [items]);

  const contextItems = useMemo(() => {
    const term = filters.search.trim().toLocaleLowerCase('es-MX');
    return items.filter((item) => {
      const searchable = `${item.collaboratorName} ${item.certificationName} ${item.profile ?? ''} ${item.technology ?? ''} ${item.technologyName ?? ''}`.toLocaleLowerCase('es-MX');
      return (!term || searchable.includes(term))
        && (!filters.profile || item.profile === filters.profile)
        && (!filters.technology || item.technology === filters.technology)
        && (!filters.certification || item.certificationName === filters.certification);
    });
  }, [filters.certification, filters.profile, filters.search, filters.technology, items]);

  const filtered = useMemo(() => contextItems
    .filter((item) => !filters.certificationStatus || item.status === filters.certificationStatus)
    .sort((a, b) => (direction === 'asc' ? 1 : -1) * compare(a, b, sort)), [contextItems, direction, filters.certificationStatus, sort]);

  const summary = useMemo(() => buildTrackingSummary(contextItems), [contextItems]);
  const insights = useMemo(() => buildTrackingInsights(contextItems), [contextItems]);

  const activeFilters = useMemo<BBVAFilterSummaryItem[]>(() => {
    const active: BBVAFilterSummaryItem[] = [];
    if (filters.search) active.push({ key: 'search', label: `Búsqueda: ${filters.search}`, onRemove: () => update({ search: '' }) });
    if (filters.certificationStatus) active.push({ key: 'certificationStatus', label: `Estado: ${COLLABORATOR_CERTIFICATION_STATUS_LABELS[filters.certificationStatus as CollaboratorCertificationStatus] ?? filters.certificationStatus}`, onRemove: () => update({ certificationStatus: '' }) });
    if (filters.profile) active.push({ key: 'profile', label: `Perfil: ${filters.profile}`, onRemove: () => update({ profile: '' }) });
    if (filters.technology) active.push({ key: 'technology', label: `Tecnología: ${filters.technology}`, onRemove: () => update({ technology: '' }) });
    if (filters.certification) active.push({ key: 'certification', label: `Certificación: ${filters.certification}`, onRemove: () => update({ certification: '' }) });
    return active;
  }, [filters.certification, filters.certificationStatus, filters.profile, filters.search, filters.technology, update]);

  const changeSort = (field: SortField) => {
    if (sort === field) patchSort({ direction: direction === 'asc' ? 'desc' : 'asc' });
    else patchSort({ sort: field, direction: 'asc' });
  };

  const filterStatus = (status: CollaboratorCertificationStatus | '') => update({ certificationStatus: status });

  const approve = async (date: string) => {
    if (!approval) return;
    try {
      setError(null);
      await approveMutation.mutateAsync({ recordId: approval.certificationRecordId, payload: { applicationDate: date, result: 'APPROVED', notes: 'Aprobación registrada desde Seguimiento.' } });
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

  const openCommunication = async (item: CertificationTrackingItem) => {
    if (!item.latestAttemptId) {
      setError('Registra primero un resultado en el ciclo actual para generar la postal.');
      return;
    }
    try {
      setError(null);
      setCommunicationItem(item);
      const response = await generateCommunication.mutateAsync({ recordId: item.certificationRecordId, attemptId: item.latestAttemptId });
      setCommunication(response.item);
    } catch (e) {
      setCommunicationItem(null);
      setError((e as Error).message);
    }
  };

  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[.06em] text-blue-600 [.bbva-dark_&]:text-cyan-300">Seguimiento operativo</div>
            <p className="mt-0.5 text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">Prioriza certificaciones que requieren acción. Los KPIs respetan búsqueda, perfil, tecnología y certificación; el estado selecciona el segmento visible.</p>
          </div>
          <BBVAButton variant="secondary" size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />} onClick={() => void query.refetch()}>Actualizar</BBVAButton>
        </div>
      </section>

      {query.isLoading ? <BBVAMetricsSkeleton cards={6} /> : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] items-stretch gap-2">
            <BBVAMetricCard label="Atención requerida" value={summary.total} icon={<AlertCircle className="h-4 w-4" />} tone="blue" help={metricHelp.attention} supportingText={`${summary.scheduled} con fecha programada`} active={!filters.certificationStatus} onAction={() => filterStatus('')} actionLabel="Ver todas" />
            <BBVAMetricCard label="Vencidas" value={summary.expired} icon={<ShieldAlert className="h-4 w-4" />} tone={summary.expired ? 'rose' : 'emerald'} help={metricHelp.expired} supportingText={summary.expired ? 'Fuera de vigencia actual' : 'Sin vencidas en este contexto'} active={filters.certificationStatus === 'EXPIRED'} onAction={() => filterStatus('EXPIRED')} actionLabel="Filtrar" />
            <BBVAMetricCard label="Recertificación" value={summary.recertificationPending} icon={<RefreshCw className="h-4 w-4" />} tone={summary.recertificationPending ? 'orange' : 'emerald'} help={metricHelp.recertification} supportingText={summary.recertificationPending ? 'Nuevo ciclo requerido' : 'Sin recertificaciones pendientes'} active={filters.certificationStatus === 'RECERTIFICATION_PENDING'} onAction={() => filterStatus('RECERTIFICATION_PENDING')} actionLabel="Filtrar" />
            <BBVAMetricCard label="Próximas a vencer" value={summary.expiring} icon={<Clock3 className="h-4 w-4" />} tone={summary.expiring ? 'amber' : 'emerald'} help={metricHelp.expiring} supportingText={summary.expiring ? 'Dentro del periodo de alerta' : 'Sin vencimientos próximos'} active={filters.certificationStatus === 'EXPIRING'} onAction={() => filterStatus('EXPIRING')} actionLabel="Filtrar" />
            <BBVAMetricCard label="Reprobadas" value={summary.failed} icon={<AlertCircle className="h-4 w-4" />} tone={summary.failed ? 'rose' : 'emerald'} help={metricHelp.failed} supportingText={summary.limitReached ? `${summary.limitReached} con límite alcanzado` : 'Resultado del ciclo actual'} active={filters.certificationStatus === 'FAILED'} onAction={() => filterStatus('FAILED')} actionLabel="Filtrar" />
            <BBVAMetricCard label="Pendientes" value={summary.pending} icon={<CalendarClock className="h-4 w-4" />} tone={summary.pending ? 'slate' : 'emerald'} help={metricHelp.pending} supportingText={`${summary.applied} aplicadas · ${summary.scheduled} programadas`} active={filters.certificationStatus === 'PENDING'} onAction={() => filterStatus('PENDING')} actionLabel="Filtrar" />
          </div>

          <BBVAChartCard title="Insights de seguimiento" description="Lecturas determinísticas del contexto actual. No utilizan scoring ni tendencias históricas inventadas.">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {insights.map((insight) => (
                <BBVAInsightCard
                  key={insight.id}
                  eyebrow={insight.eyebrow}
                  title={insight.title}
                  description={insight.description}
                  tone={insight.tone}
                  actionLabel={insight.actionLabel}
                  onAction={insight.status ? () => filterStatus(insight.status as CollaboratorCertificationStatus) : undefined}
                />
              ))}
            </div>
          </BBVAChartCard>
        </>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={filters.search} onChange={(e) => update({ search: e.target.value })} placeholder="Persona o certificación" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-950/40 [.bbva-dark_&]:text-slate-100" aria-label="Buscar persona o certificación" />
          </div>
          <BBVASearchableSelect value={filters.certificationStatus} onChange={(value) => update({ certificationStatus: value })} options={[{ value: '', label: 'Todos los estados' }, ...Object.entries(COLLABORATOR_CERTIFICATION_STATUS_LABELS).filter(([key]) => !['VALID', 'NOT_APPLICABLE'].includes(key)).map(([value, label]) => ({ value, label }))]} ariaLabel="Estado" />
          <BBVASearchableSelect value={filters.technology} onChange={(value) => update({ technology: value })} options={[{ value: '', label: 'Todas las tecnologías' }, ...options.technologies]} ariaLabel="Tecnología" />
          <BBVASearchableSelect value={filters.profile} onChange={(value) => update({ profile: value })} options={[{ value: '', label: 'Todos los perfiles' }, ...options.profiles]} ariaLabel="Perfil" />
          <BBVASearchableSelect value={filters.certification} onChange={(value) => update({ certification: value })} options={[{ value: '', label: 'Todas las certificaciones' }, ...options.certifications]} ariaLabel="Certificación" />
        </div>
        {activeFilters.length ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <BBVAFilterSummary items={activeFilters} />
            <BBVAButton variant="secondary" size="sm" onClick={reset}>Limpiar filtros</BBVAButton>
          </div>
        ) : null}
      </section>

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 [.bbva-dark_&]:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">Certificaciones por atender</h2>
            <p className="mt-0.5 text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">{filtered.length} de {contextItems.length} registros en el contexto actual.</p>
          </div>
          {summary.limitReached ? <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[9px] font-semibold text-rose-700 [.bbva-dark_&]:border-rose-400/20 [.bbva-dark_&]:bg-rose-400/10 [.bbva-dark_&]:text-rose-300">{summary.limitReached} con límite de intentos alcanzado</span> : null}
        </div>
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[1200px] text-left text-[10.5px]">
            <thead className="bg-slate-50 text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:bg-slate-950/40"><tr>
              <th className="px-3 py-2"><BBVATableSortHeader label="Colaborador" active={sort === 'collaboratorName'} direction={direction} onClick={() => changeSort('collaboratorName')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Certificación" active={sort === 'certificationName'} direction={direction} onClick={() => changeSort('certificationName')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Estado" active={sort === 'status'} direction={direction} onClick={() => changeSort('status')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Vigencia" active={sort === 'expirationDate'} direction={direction} onClick={() => changeSort('expirationDate')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Programación" active={sort === 'scheduledDate'} direction={direction} onClick={() => changeSort('scheduledDate')} /></th>
              <th className="px-3 py-2 text-center"><BBVATableSortHeader label="Intentos" active={sort === 'attempt'} direction={direction} onClick={() => changeSort('attempt')} align="center" /></th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">{filtered.map((item) => {
              const limitReached = hasAttemptLimitReached(item);
              const canApprove = item.requiresAttempts && !limitReached && ['PENDING', 'SCHEDULED', 'FAILED', 'APPLIED'].includes(item.status);
              const remaining = remainingAttempts(item);
              const isExpanded = expandedId === item.certificationRecordId;
              const scheduleText = scheduledContext(item.scheduledDate);
              return <Fragment key={item.certificationRecordId}>
                <tr className="align-top transition hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/50">
                  <td className="px-3 py-2.5"><div className="font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.collaboratorName}</div><div className="mt-0.5 text-[9px] text-slate-400">{item.profile || 'Sin perfil'} · {item.technology || 'Sin tecnología'}</div></td>
                  <td className="px-3 py-2.5"><div className="font-semibold text-slate-800 [.bbva-dark_&]:text-slate-200">{item.certificationName}</div><div className="mt-0.5 text-[9px] text-slate-400">{item.technologyName || item.certificationType}</div></td>
                  <td className="px-3 py-2.5"><BBVACertificationStatusBadge status={item.status} /><div className="mt-1 text-[9px] leading-3 text-slate-500 [.bbva-dark_&]:text-slate-400">{item.status === 'EXPIRED' ? 'Revisión de vigencia' : item.status === 'RECERTIFICATION_PENDING' ? 'Nuevo ciclo requerido' : item.status === 'EXPIRING' ? 'Seguimiento preventivo' : item.status === 'FAILED' ? 'Revisar siguiente intento' : item.status === 'SCHEDULED' ? 'Presentación programada' : 'Acción pendiente'}</div></td>
                  <td className="px-3 py-2.5"><div className="font-medium text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.expirationDate)}</div><div className={`mt-0.5 text-[9px] ${item.status === 'EXPIRED' ? 'font-semibold text-rose-600 [.bbva-dark_&]:text-rose-300' : item.status === 'EXPIRING' ? 'font-semibold text-amber-600 [.bbva-dark_&]:text-amber-300' : 'text-slate-400'}`}>{expirationContext(item)}</div></td>
                  <td className="px-3 py-2.5">{item.scheduledDate ? <><span className="inline-flex items-center gap-1 font-medium text-blue-700 [.bbva-dark_&]:text-cyan-300"><CalendarClock className="h-3 w-3" />{formatDate(item.scheduledDate)}</span>{scheduleText ? <div className="mt-0.5 text-[9px] text-slate-400">{scheduleText}</div> : null}</> : <span className="text-slate-400">Sin fecha programada</span>}</td>
                  <td className="px-3 py-2.5 text-center">{item.requiresAttempts ? <div><div className="font-semibold tabular-nums text-slate-800 [.bbva-dark_&]:text-slate-200">{item.maxAttempts !== null ? `${item.attemptCount} / ${item.maxAttempts}` : item.attemptCount}</div><div className={`mt-0.5 text-[9px] ${limitReached ? 'font-semibold text-rose-600 [.bbva-dark_&]:text-rose-300' : remaining === 1 ? 'font-semibold text-amber-600 [.bbva-dark_&]:text-amber-300' : 'text-slate-400'}`}>{attemptContext(item)}</div></div> : <span className="text-slate-400">No aplica</span>}</td>
                  <td className="px-3 py-2.5"><div className="flex flex-wrap justify-end gap-1.5">
                    {canApprove ? <BBVAButton variant="table" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setApproval(item)}><CheckCircle2 className="h-3 w-3" />Aprobar</BBVAButton> : null}
                    {['EXPIRING', 'EXPIRED', 'RECERTIFICATION_PENDING'].includes(item.status) && item.recertificationEnabled ? <BBVAButton variant="table" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => void startRecertification(item)}><RefreshCw className="h-3 w-3" />Recertificar</BBVAButton> : null}
                    {item.latestAttemptId ? <BBVAButton variant="table" size="sm" onClick={() => void openCommunication(item)}><Mail className="h-3 w-3" />Postal</BBVAButton> : null}
                    <BBVAButton variant="table" size="sm" onClick={() => navigate(`/bbva/collaborators/${item.collaboratorId}/certifications/${item.certificationRecordId}`, { state: { returnTo: `/bbva/certifications/tracking${window.location.search}` } })}><Eye className="h-3 w-3" />Ver</BBVAButton>
                    <BBVAButton variant="table" size="sm" onClick={() => setExpandedId(isExpanded ? null : item.certificationRecordId)} aria-expanded={isExpanded}>{isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}Contexto</BBVAButton>
                  </div></td>
                </tr>
                {isExpanded ? <tr className="bg-slate-50/70 [.bbva-dark_&]:bg-slate-950/25"><td colSpan={7} className="px-4 py-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Ciclo actual</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">Ciclo {item.currentCycle}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Última aplicación</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.lastApplicationDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Aprobación</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.approvedDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Vencimiento</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDate(item.expirationDate)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Intentos</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{attemptContext(item)}</div></div>
                  <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Resultado del ciclo</div><div className="mt-1 text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{latestAttemptLabel(item)}</div></div>
                </div></td></tr> : null}
              </Fragment>;
            })}</tbody>
          </table>
        </div>
        {query.isLoading ? <div className="px-4 py-8 text-center text-xs text-slate-500">Cargando seguimiento...</div> : null}
        {!query.isLoading && filtered.length === 0 ? <BBVAEmptyState title="No hay certificaciones con este contexto" description={activeFilters.length ? 'No existen registros que coincidan con los filtros activos. Ajusta o limpia los filtros para ampliar el resultado.' : 'Actualmente no existen certificaciones que requieran seguimiento.'} action={activeFilters.length ? <BBVAButton variant="secondary" size="sm" onClick={reset}>Limpiar filtros</BBVAButton> : undefined} /> : null}
      </div>

      <CertificationQuickApprovalDialog open={Boolean(approval)} collaboratorName={approval?.collaboratorName ?? ''} certificationName={approval?.certificationName ?? ''} attemptNumber={approval?.nextAttemptNumber ?? 1} busy={approveMutation.isPending} onCancel={() => setApproval(null)} onConfirm={(date) => void approve(date)} />
      <CertificationCommunicationDialog
        open={Boolean(communicationItem && communication)}
        communication={communication}
        certificationName={communicationItem?.certificationName ?? ''}
        busy={generateCommunication.isPending || prepareCommunication.isPending}
        onClose={() => { setCommunicationItem(null); setCommunication(null); }}
        onRegenerate={async () => {
          if (!communicationItem?.latestAttemptId) throw new Error('No hay un resultado del ciclo actual disponible para regenerar la postal.');
          const response = await generateCommunication.mutateAsync({ recordId: communicationItem.certificationRecordId, attemptId: communicationItem.latestAttemptId, regenerate: true });
          setCommunication(response.item);
          return response.item;
        }}
        onPrepareEmail={async (payload) => {
          if (!communicationItem || !communication) throw new Error('No hay una comunicación seleccionada.');
          const response = await prepareCommunication.mutateAsync({ recordId: communicationItem.certificationRecordId, communicationId: communication.id, payload });
          setCommunication(response.item);
          return response.item;
        }}
      />
    </div>
  );
};
