import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, Award, CalendarClock, Eye, Plus, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { CertificationCriticalResolutionDialog } from '../../componentsBBVATalent/CertificationCriticalResolutionDialog';
import { CertificationScheduleDialog } from '../../componentsBBVATalent/CertificationScheduleDialog';
import { useCertificationCatalogOptions } from '../hooks/useCertificationCatalog';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useCollaborator } from '../hooks/useCollaborators';
import {
  useAddCollaboratorCertification,
  useCollaboratorCertifications,
  useMarkCertificationNotApplicable,
  useRecertifyCollaboratorCertification,
  useResolveCriticalCertification,
  useUpdateCollaboratorCertification,
} from '../hooks/useCollaboratorCertifications';
import { COLLABORATOR_CERTIFICATION_STATUS_LABELS, type CollaboratorCertification, type CollaboratorCertificationStatus } from '../types/collaboratorCertification';

const tone: Record<CollaboratorCertificationStatus, string> = {
  VALID: 'bg-emerald-50 text-emerald-700', EXPIRING: 'bg-amber-50 text-amber-700', EXPIRED: 'bg-rose-50 text-rose-700',
  RECERTIFICATION_PENDING: 'bg-orange-50 text-orange-700', FAILED: 'bg-rose-50 text-rose-700', PENDING: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-blue-50 text-blue-700', APPLIED: 'bg-indigo-50 text-indigo-700', NOT_APPLICABLE: 'bg-slate-100 text-slate-500',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isCriticalDecisionPending(item: CollaboratorCertification) {
  return item.criticalActionRequired === true;
}
function isCriticalExitOpen(item: CollaboratorCertification) {
  return item.criticalActionRequired === true || item.criticalResolutionStatus === 'LOW_REQUESTED';
}


function followUp(item: CollaboratorCertification) {
  if (item.criticalResolutionStatus === 'INTERN') return 'Resuelto como becario';
  if (item.criticalResolutionStatus === 'LOW_CONFIRMED') return 'Baja BBVA confirmada';
  if (item.criticalResolutionStatus === 'LOW_REQUESTED') return 'Baja solicitada · confirmar salida';
  if (isCriticalDecisionPending(item)) return 'CRÍTICO · Resolver baja o becario';
  if (item.status === 'NOT_APPLICABLE') return 'Sin seguimiento';
  if (item.status === 'RECERTIFICATION_PENDING') return 'Recertificar';
  if (item.status === 'EXPIRED') return 'Vencida';
  if (item.status === 'EXPIRING') return `Vence ${formatDate(item.expirationDate)}`;
  if (item.requiresAttempts && item.maxAttempts && item.attemptCount >= item.maxAttempts) return `Intentos agotados (${item.maxAttempts})`;
  if (item.status === 'FAILED') return 'Nuevo intento';
  if (item.status === 'SCHEDULED' && item.scheduledDate) return `Programada ${formatDate(item.scheduledDate)}`;
  if (['PENDING', 'SCHEDULED', 'APPLIED'].includes(item.status)) return 'Pendiente de aprobación';
  return item.expirationDate ? `Vence ${formatDate(item.expirationDate)}` : 'Sin vencimiento';
}

export const CollaboratorCertificationsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/bbva/collaborators';
  const listPath = `/bbva/collaborators/${id}/certifications`;
  const collaboratorQuery = useCollaborator(id);
  const query = useCollaboratorCertifications(id);
  const optionsQuery = useCertificationCatalogOptions();
  const addMutation = useAddCollaboratorCertification(id ?? '');
  const recertifyMutation = useRecertifyCollaboratorCertification(id ?? '');
  const notApplicableMutation = useMarkCertificationNotApplicable(id ?? '');
  const updateMutation = useUpdateCollaboratorCertification(id ?? '');
  const resolveCriticalMutation = useResolveCriticalCertification(id ?? '');
  const listMemory = useBBVAListMemory('collaborator-certifications', { search:'', status:'ALL' as 'ALL' | CollaboratorCertificationStatus, sort:'certificationName' as 'certificationName'|'status'|'approvedDate'|'followUp', direction:'asc' as 'asc'|'desc' });
  const { search, status, sort, direction } = listMemory.state;
  const [certificationId, setCertificationId] = useState('');
  const [certificationLevel, setCertificationLevel] = useState('');
  const [pendingRecertify, setPendingRecertify] = useState<CollaboratorCertification | null>(null);
  const [pendingNoApply, setPendingNoApply] = useState<CollaboratorCertification | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<CollaboratorCertification | null>(null);
  const [pendingCritical, setPendingCritical] = useState<CollaboratorCertification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const collaborator = collaboratorQuery.data?.item;
  const items = query.data?.items ?? [];
  const visibleItems = items.filter((item) => item.status !== 'NOT_APPLICABLE');
  const summary = query.data?.summary;

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-MX');
    const rows = visibleItems.filter((item) => {
      const matches = !term || `${item.certificationName} ${item.technologyName ?? ''} ${item.provider ?? ''}`.toLocaleLowerCase('es-MX').includes(term);
      return matches && (status === 'ALL' || item.status === status);
    });
    const value = (item: CollaboratorCertification) => sort === 'certificationName' ? item.certificationName : sort === 'status' ? item.status : sort === 'approvedDate' ? (item.approvedDate ?? '') : followUp(item);
    return [...rows].sort((a,b)=>{ const cmp=String(value(a)).localeCompare(String(value(b)),'es-MX',{sensitivity:'base',numeric:true}); return direction==='asc'?cmp:-cmp; });
  }, [visibleItems, search, status, sort, direction]);
  const changeSort=(field:'certificationName'|'status'|'approvedDate'|'followUp')=>listMemory.patch(sort===field?{direction:direction==='asc'?'desc':'asc'}:{sort:field,direction:'asc'});

  const resolveCritical = async (resolution: 'LOW_REQUESTED' | 'INTERN', notes: string) => {
    if (!pendingCritical) return;
    try {
      setError(null);
      const item = pendingCritical;
      await resolveCriticalMutation.mutateAsync({ recordId: item.id, payload: { resolution, notes } });
      setPendingCritical(null);
      if (resolution === 'LOW_REQUESTED') {
        navigate(`/bbva/collaborators/${id}/move-to-talent`, {
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

  const availableOptions = (optionsQuery.data?.items ?? []).filter((option) => !items.some((item) => item.certificationId === option.id && item.status !== 'NOT_APPLICABLE'));
  const selectedCatalogOption = availableOptions.find((option) => option.id === certificationId) ?? null;
  const needsLevel = selectedCatalogOption?.certificationType === 'TECHNOLOGICAL';
  const criticalItems = visibleItems.filter(isCriticalExitOpen);
  const attentionCount = (summary?.expiring ?? 0) + (summary?.expired ?? 0) + (summary?.failed ?? 0) + (summary?.pending ?? 0) + (summary?.recertificationPending ?? 0);

  const add = async () => {
    if (!certificationId) return;
    if (needsLevel && !certificationLevel) return setError('Selecciona el nivel de la certificación tecnológica.');
    try { setError(null); await addMutation.mutateAsync({ certificationId, certificationLevel: needsLevel ? certificationLevel : undefined }); setCertificationId(''); setCertificationLevel(''); }
    catch (e) { setError((e as Error).message); }
  };

  if (collaboratorQuery.isLoading || query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificaciones...</div>;
  if (collaboratorQuery.error || !collaborator) return <BBVAAlert tone="error">{(collaboratorQuery.error as Error)?.message || 'Colaborador no encontrado.'}</BBVAAlert>;
  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => navigate(returnTo)} /></div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      {criticalItems.length ? <BBVAAlert tone="error" persistent title="Atención crítica">{criticalItems.length} certificación{criticalItems.length === 1 ? '' : 'es'} de Desarrollo Seguro, Tecnológica o Normativa agotaron 2/2 intentos. Revisa si corresponde solicitar baja o gestionar el caso como becario.</BBVAAlert> : null}
      {(summary?.expiring ?? 0) > 0 ? <BBVAAlert tone="info">Una certificación aprobada no extiende su vigencia registrando otro intento en el mismo ciclo. Para renovarla utiliza <strong>Iniciar recertificación</strong> y registra el intento en el nuevo ciclo.</BBVAAlert> : null}

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="border-b border-slate-200 bg-slate-50/60 p-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/35">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold text-slate-950 [.bbva-dark_&]:text-white">{collaborator.fullName}</h1>
              <div className="mt-1 text-[10px] text-slate-500">{[collaborator.profile, collaborator.currentTechnology, collaborator.expertise].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="flex w-full max-w-3xl gap-2">
              <div className="min-w-0 flex-1"><BBVASearchableSelect value={certificationId} onChange={(value)=>{setCertificationId(value);setCertificationLevel('');}} options={[{ value: '', label: 'Seleccionar certificación' }, ...availableOptions.map((option) => ({ value: option.id, label: option.name, description: option.certificationType === 'TECHNOLOGICAL' ? `${option.technologyName ?? 'Tecnológica'} · niveles ${option.allowedLevels.join(', ') || 'sin configurar'}` : undefined }))]} ariaLabel="Agregar certificación" /></div>
              {needsLevel ? <div className="w-[180px]"><BBVASearchableSelect value={certificationLevel} onChange={setCertificationLevel} options={[{value:'',label:'Nivel'},...(selectedCatalogOption?.allowedLevels ?? []).filter((level)=>level!=='GENERIC').map((level)=>({value:level,label:level}))]} ariaLabel="Nivel de certificación" /></div> : null}
              <button type="button" onClick={() => void add()} disabled={!certificationId || (needsLevel && !certificationLevel) || addMutation.isPending} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[10.5px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Agregar</button>
            </div>
          </div>

          <div className="mt-3 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/70">
            <div className="border-b border-slate-100 px-3 py-2.5 sm:border-b-0 sm:border-r [.bbva-dark_&]:border-slate-800"><div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Cobertura</div><div className="mt-1 text-[17px] font-semibold text-blue-700">{summary?.coveragePercent ?? 100}%</div><div className="text-[9.5px] text-slate-500">{(summary?.valid ?? 0) + (summary?.expiring ?? 0)} cubiertas de {summary?.applicable ?? 0} aplicables</div></div>
            <div className="border-b border-slate-100 px-3 py-2.5 sm:border-b-0 sm:border-r [.bbva-dark_&]:border-slate-800"><div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Atención</div><div className={`mt-1 text-[17px] font-semibold ${attentionCount ? 'text-amber-700' : 'text-emerald-700'}`}>{attentionCount}</div><div className="text-[9.5px] text-slate-500">pendientes, vencidas o por recertificar</div></div>
            <div className="px-3 py-2.5"><div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Próximas a vencer</div><div className="mt-1 text-[17px] font-semibold text-amber-700">{summary?.expiring ?? 0}</div><div className="text-[9.5px] text-slate-500">seguimiento preventivo</div></div>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-3 grid gap-2 md:grid-cols-[minmax(260px,1fr)_220px]">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e) => listMemory.patch({search:e.target.value})} placeholder="Buscar certificación" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-500" /></div>
            <BBVASearchableSelect value={status} onChange={(value) => listMemory.patch({status:value as 'ALL' | CollaboratorCertificationStatus})} options={[{ value: 'ALL', label: 'Todos los estados' }, ...Object.entries(COLLABORATOR_CERTIFICATION_STATUS_LABELS).filter(([value]) => value !== 'NOT_APPLICABLE').map(([value, label]) => ({ value, label }))]} ariaLabel="Filtrar por estado" />
          </div>

          <div className="overflow-visible rounded-xl border border-slate-200 [.bbva-dark_&]:border-slate-800">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-[820px] table-fixed text-left text-[10.5px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[8.5px] font-semibold uppercase tracking-[0.04em] text-slate-500"><tr><th className="w-[34%] px-3 py-2"><BBVATableSortHeader label="Certificación" active={sort==='certificationName'} direction={direction} onClick={()=>changeSort('certificationName')}/></th><th className="w-[18%] px-3 py-2"><BBVATableSortHeader label="Estado" active={sort==='status'} direction={direction} onClick={()=>changeSort('status')}/></th><th className="w-[17%] px-3 py-2"><BBVATableSortHeader label="Última aprobación" active={sort==='approvedDate'} direction={direction} onClick={()=>changeSort('approvedDate')}/></th><th className="w-[19%] px-3 py-2"><BBVATableSortHeader label="Seguimiento" active={sort==='followUp'} direction={direction} onClick={()=>changeSort('followUp')}/></th><th className="w-[12%] px-3 py-2 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map((item) => {
                  const approvedCycle = item.baseStatus === 'APPROVED';
                  const attemptLimitReached = Boolean(item.requiresAttempts && item.maxAttempts && item.attemptCount >= item.maxAttempts);
                  const criticalDecision = isCriticalDecisionPending(item);
                  const criticalOpen = isCriticalExitOpen(item);
                  return <tr key={item.id} className={`transition ${criticalOpen ? 'bg-rose-50/70 ring-1 ring-inset ring-rose-200 hover:bg-rose-50' : 'hover:bg-slate-50/70'}`}>
                    <td className="px-3 py-2.5"><div className="font-semibold text-slate-900">{item.certificationName}</div><div className="mt-0.5 truncate text-[9.5px] text-slate-500">{[item.technologyName, item.certificationLevel && item.certificationLevel !== 'GENERIC' ? `Nivel ${item.certificationLevel}` : null, item.provider].filter(Boolean).join(' · ') || 'General'}</div></td>
                    <td className="px-3 py-2.5">{criticalOpen ? <span className="inline-flex rounded-full bg-rose-600 px-2 py-0.5 text-[8.5px] font-bold uppercase text-white">Crítico</span> : <span className={`inline-flex rounded-full px-2 py-0.5 text-[8.5px] font-semibold ${tone[item.status]}`}>{COLLABORATOR_CERTIFICATION_STATUS_LABELS[item.status]}</span>}</td>
                    <td className="px-3 py-2.5"><div>{formatDate(item.approvedDate)}</div>{item.attemptCount > 0 ? <div className="mt-0.5 text-[9px] text-slate-400">{item.attemptCount} intento{item.attemptCount === 1 ? '' : 's'} en ciclo {item.currentCycle}</div> : null}</td>
                    <td className="px-3 py-2.5"><span className="text-[9.5px] font-medium text-slate-600">{followUp(item)}</span></td>
                    <td className="px-3 py-2.5 text-right"><BBVAActionMenu items={[
                      ...(criticalDecision ? [{ id: 'critical-resolve', label: 'Resolver baja / becario', icon: ArrowRightLeft, tone: 'danger' as const, onClick: () => setPendingCritical(item) }] : []),
                      ...(item.criticalResolutionStatus === 'LOW_REQUESTED' ? [{ id: 'critical-low-continue', label: 'Continuar baja BBVA', icon: ArrowRightLeft, tone: 'danger' as const, onClick: () => navigate(`/bbva/collaborators/${id}/move-to-talent`, { state: { criticalCertification: item.certificationName, criticalMessage: 'Solicitud de baja registrada por agotamiento 2/2. Completa el movimiento para confirmar la salida de BBVA.', preferredReasonGroup: 'BBVA_EXIT' } }) }] : []),
                      { id: 'view', label: 'Ver detalle', icon: Eye, onClick: () => navigate(`/bbva/collaborators/${id}/certifications/${item.id}`, { state: { returnTo: listPath, rootReturnTo: returnTo } }) },
                      { id: 'schedule', label: item.scheduledDate ? 'Reprogramar examen' : 'Programar examen', icon: CalendarClock, disabled: item.status === 'NOT_APPLICABLE' || approvedCycle || attemptLimitReached, onClick: () => setPendingSchedule(item) },
                      { id: 'attempt', label: 'Registrar intento', icon: Award, disabled: item.status === 'NOT_APPLICABLE' || approvedCycle || attemptLimitReached, onClick: () => navigate(`/bbva/collaborators/${id}/certifications/${item.id}/attempt`, { state: { returnTo: listPath, rootReturnTo: returnTo } }) },
                      { id: 'recertify', label: 'Iniciar recertificación', icon: RefreshCw, disabled: !item.recertificationEnabled || !approvedCycle, onClick: () => setPendingRecertify(item) },
                      { id: 'not-applicable', label: criticalOpen ? 'Resolver 2/2 antes de quitar' : 'Quitar certificación', icon: ShieldAlert, tone: 'danger', disabled: item.status === 'NOT_APPLICABLE' || criticalOpen, onClick: () => setPendingNoApply(item) },
                    ]} /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {filtered.length === 0 ? <div className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-500">No hay certificaciones que coincidan con los filtros.</div> : null}
          </div>
        </div>
      </section>

      <CertificationCriticalResolutionDialog
        open={Boolean(pendingCritical)}
        collaboratorName={collaborator?.fullName ?? ''}
        certificationName={pendingCritical?.certificationName ?? ''}
        busy={resolveCriticalMutation.isPending}
        onCancel={() => setPendingCritical(null)}
        onResolve={(resolution, notes) => void resolveCritical(resolution, notes)}
      />
      <CertificationScheduleDialog
        open={Boolean(pendingSchedule)}
        certificationName={pendingSchedule?.certificationName ?? ''}
        initialDate={pendingSchedule?.scheduledDate}
        busy={updateMutation.isPending}
        onCancel={() => setPendingSchedule(null)}
        onConfirm={(date) => {
          if (!pendingSchedule) return;
          updateMutation.mutate({
            recordId: pendingSchedule.id,
            payload: { scheduledDate: date, notes: pendingSchedule.notes ?? '', mandatory: pendingSchedule.mandatory },
          }, {
            onSuccess: () => { setPendingSchedule(null); setError(null); },
            onError: (e) => { setPendingSchedule(null); setError((e as Error).message); },
          });
        }}
      />
      <ConfirmDialog open={Boolean(pendingRecertify)} title="Iniciar recertificación" message={`Se cerrará el seguimiento de la aprobación actual de “${pendingRecertify?.certificationName ?? ''}” y se abrirá un nuevo ciclo. El historial anterior se conserva.`} confirmLabel="Iniciar recertificación" tone="warning" busy={recertifyMutation.isPending} onCancel={() => setPendingRecertify(null)} onConfirm={() => { if (!pendingRecertify) return; recertifyMutation.mutate(pendingRecertify.id, { onSuccess: () => setPendingRecertify(null), onError: (e) => { setPendingRecertify(null); setError((e as Error).message); } }); }} />
      <ConfirmDialog open={Boolean(pendingNoApply)} title="Quitar certificación" message={`“${pendingNoApply?.certificationName ?? ''}” dejará de aparecer en las certificaciones activas de esta persona. Sus intentos e historial se conservarán.`} confirmLabel="Quitar certificación" tone="danger" busy={notApplicableMutation.isPending} onCancel={() => setPendingNoApply(null)} onConfirm={() => { if (!pendingNoApply) return; notApplicableMutation.mutate(pendingNoApply.id, { onSuccess: () => setPendingNoApply(null), onError: (e) => { setPendingNoApply(null); setError((e as Error).message); } }); }} />
    </div>
  );
};
