import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Eye, Mail, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
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
import { publishBbvaDataChange } from '../lib/bbvaDataSync';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import {
  COLLABORATOR_CERTIFICATION_STATUS_LABELS,
  type CertificationCommunication,
  type CertificationTrackingItem,
  type CollaboratorCertificationStatus,
} from '../types/collaboratorCertification';

const tone: Record<CollaboratorCertificationStatus, string> = {
  VALID: 'bg-emerald-50 text-emerald-700', EXPIRING: 'bg-amber-50 text-amber-700', EXPIRED: 'bg-rose-50 text-rose-700',
  RECERTIFICATION_PENDING: 'bg-orange-50 text-orange-700', FAILED: 'bg-rose-50 text-rose-700', PENDING: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-blue-50 text-blue-700', APPLIED: 'bg-indigo-50 text-indigo-700', NOT_APPLICABLE: 'bg-slate-100 text-slate-500',
};

type SortField = 'collaboratorName' | 'certificationName' | 'status' | 'expirationDate' | 'scheduledDate' | 'attempt';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function priority(item: CertificationTrackingItem) {
  if (['EXPIRED', 'RECERTIFICATION_PENDING'].includes(item.status)) return 1;
  if (item.status === 'EXPIRING') return 2;
  if (item.status === 'FAILED') return 3;
  if (item.status === 'SCHEDULED') return 4;
  if (item.status === 'PENDING') return 5;
  return 6;
}

function compare(a: CertificationTrackingItem, b: CertificationTrackingItem, field: SortField) {
  const text = (left: unknown, right: unknown) => String(left ?? '').localeCompare(String(right ?? ''), 'es-MX', { sensitivity: 'base', numeric: true });
  if (field === 'collaboratorName') return text(a.collaboratorName, b.collaboratorName);
  if (field === 'certificationName') return text(a.certificationName, b.certificationName);
  if (field === 'status') return priority(a) - priority(b) || text(a.status, b.status);
  if (field === 'expirationDate') return text(a.expirationDate, b.expirationDate);
  if (field === 'scheduledDate') return text(a.scheduledDate, b.scheduledDate);
  return a.nextAttemptNumber - b.nextAttemptNumber;
}

export const CertificationTrackingPage: React.FC = () => {
  const query = useCertificationTracking();
  const navigate = useNavigate();
  const { state: listState, patch: patchList } = useBBVAListMemory<{ search: string; filter: 'ALL' | CollaboratorCertificationStatus; sort: SortField; direction: 'asc' | 'desc' }>('certification-tracking', { search:'', filter:'ALL', sort:'status', direction:'asc' });
  const { search, filter, sort, direction } = listState;
  const [approval, setApproval] = useState<CertificationTrackingItem | null>(null);
  const [communicationItem, setCommunicationItem] = useState<CertificationTrackingItem | null>(null);
  const [communication, setCommunication] = useState<CertificationCommunication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const approveMutation = useAddCertificationAttempt(approval?.collaboratorId ?? '');
  const generateCommunication = useGenerateCertificationCommunication(communicationItem?.collaboratorId ?? '');
  const prepareCommunication = usePrepareCertificationCommunicationEmail(communicationItem?.collaboratorId ?? '');
  const items = query.data?.items ?? [];
  const actionableItems = useMemo(() => items.filter((item) => !['VALID', 'NOT_APPLICABLE'].includes(item.status)), [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-MX');
    return actionableItems
      .filter((item) => {
        const matches = !term || `${item.collaboratorName} ${item.certificationName} ${item.profile ?? ''} ${item.technology ?? ''}`.toLocaleLowerCase('es-MX').includes(term);
        return matches && (filter === 'ALL' || item.status === filter);
      })
      .sort((a, b) => (direction === 'asc' ? 1 : -1) * compare(a, b, sort));
  }, [actionableItems, direction, filter, search, sort]);

  const changeSort = (field: SortField) => {
    if (sort === field) patchList({ direction: direction === 'asc' ? 'desc' : 'asc' });
    else patchList({ sort: field, direction: 'asc' });
  };

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
      setError('Registra primero un resultado de certificación para generar la postal.');
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

  const attention = actionableItems.length;
  const scheduled = actionableItems.filter((item) => Boolean(item.scheduledDate)).length;
  const expiring = actionableItems.filter((item) => item.status === 'EXPIRING').length;

  return (
    <div className="space-y-3 animate-fade-in">
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3">
        <div className="border-b border-slate-100 px-3 py-2.5 sm:border-b-0 sm:border-r"><div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Atención requerida</div><div className="mt-1 text-[18px] font-semibold text-amber-700">{attention}</div><div className="text-[9.5px] text-slate-500">certificaciones con acción pendiente</div></div>
        <div className="border-b border-slate-100 px-3 py-2.5 sm:border-b-0 sm:border-r"><div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Programadas</div><div className="mt-1 text-[18px] font-semibold text-blue-700">{scheduled}</div><div className="text-[9.5px] text-slate-500">con fecha de presentación</div></div>
        <div className="px-3 py-2.5"><div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Próximas a vencer</div><div className="mt-1 text-[18px] font-semibold text-orange-700">{expiring}</div><div className="text-[9.5px] text-slate-500">requieren seguimiento preventivo</div></div>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_240px]">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e) => patchList({ search: e.target.value })} placeholder="Buscar persona o certificación" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-500" /></div>
        <BBVASearchableSelect value={filter} onChange={(value) => patchList({ filter: value as 'ALL' | CollaboratorCertificationStatus })} options={[{ value: 'ALL', label: 'Todos los estados' }, ...Object.entries(COLLABORATOR_CERTIFICATION_STATUS_LABELS).filter(([key]) => !['VALID', 'NOT_APPLICABLE'].includes(key)).map(([value, label]) => ({ value, label }))]} ariaLabel="Estado" />
      </div>

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[1180px] text-left text-[10.5px]">
            <thead className="bg-slate-50 text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-500"><tr>
              <th className="px-3 py-2"><BBVATableSortHeader label="Colaborador" active={sort === 'collaboratorName'} direction={direction} onClick={() => changeSort('collaboratorName')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Certificación" active={sort === 'certificationName'} direction={direction} onClick={() => changeSort('certificationName')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Estado" active={sort === 'status'} direction={direction} onClick={() => changeSort('status')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Vence" active={sort === 'expirationDate'} direction={direction} onClick={() => changeSort('expirationDate')} /></th>
              <th className="px-3 py-2"><BBVATableSortHeader label="Programada" active={sort === 'scheduledDate'} direction={direction} onClick={() => changeSort('scheduledDate')} /></th>
              <th className="px-3 py-2 text-center"><BBVATableSortHeader label="Intento" active={sort === 'attempt'} direction={direction} onClick={() => changeSort('attempt')} align="center" /></th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{filtered.map((item) => {
              const limitReached = Boolean(item.maxAttempts && item.attemptCount >= item.maxAttempts);
              const canApprove = item.requiresAttempts && !limitReached && ['PENDING', 'SCHEDULED', 'FAILED', 'APPLIED'].includes(item.status);
              return <tr key={item.certificationRecordId} className="hover:bg-slate-50">
                <td className="px-3 py-2"><div className="font-semibold text-slate-900">{item.collaboratorName}</div><div className="text-[9px] text-slate-400">{item.profile || 'Sin perfil'} · {item.technology || 'Sin tecnología'}</div></td>
                <td className="px-3 py-2"><div className="font-semibold text-slate-800">{item.certificationName}</div><div className="text-[9px] text-slate-400">{item.technologyName || item.certificationType}</div></td>
                <td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${tone[item.status]}`}>{COLLABORATOR_CERTIFICATION_STATUS_LABELS[item.status]}</span></td>
                <td className="px-3 py-2 font-medium text-slate-700">{formatDate(item.expirationDate)}</td>
                <td className="px-3 py-2">{item.scheduledDate ? <span className="inline-flex items-center gap-1 font-medium text-blue-700"><CalendarClock className="h-3 w-3" />{formatDate(item.scheduledDate)}</span> : '—'}</td>
                <td className="px-3 py-2 text-center font-semibold">{item.requiresAttempts ? (item.maxAttempts ? `${Math.min(item.nextAttemptNumber, item.maxAttempts)} / ${item.maxAttempts}` : item.nextAttemptNumber) : '—'}</td>
                <td className="px-3 py-2"><div className="flex justify-end gap-1.5">
                  {canApprove ? <BBVAButton variant="table" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setApproval(item)}><CheckCircle2 className="h-3 w-3" />Aprobar</BBVAButton> : null}
                  {['EXPIRING', 'EXPIRED', 'RECERTIFICATION_PENDING'].includes(item.status) && item.recertificationEnabled ? <BBVAButton variant="table" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => void startRecertification(item)}><RefreshCw className="h-3 w-3" />Recertificar</BBVAButton> : null}
                  {item.latestAttemptId ? <BBVAButton variant="table" size="sm" onClick={() => void openCommunication(item)}><Mail className="h-3 w-3" />Postal</BBVAButton> : null}
                  <BBVAButton variant="table" size="sm" onClick={() => navigate(`/bbva/collaborators/${item.collaboratorId}/certifications/${item.certificationRecordId}`, { state: { returnTo: '/bbva/certifications/tracking' } })}><Eye className="h-3 w-3" />Ver</BBVAButton>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {query.isLoading ? <div className="px-4 py-8 text-center text-xs text-slate-500">Cargando seguimiento...</div> : null}
        {!query.isLoading && filtered.length === 0 ? <div className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-500">No hay certificaciones que requieran seguimiento con los filtros seleccionados.</div> : null}
      </div>

      <CertificationQuickApprovalDialog open={Boolean(approval)} collaboratorName={approval?.collaboratorName ?? ''} certificationName={approval?.certificationName ?? ''} attemptNumber={approval?.nextAttemptNumber ?? 1} busy={approveMutation.isPending} onCancel={() => setApproval(null)} onConfirm={(date) => void approve(date)} />
      <CertificationCommunicationDialog
        open={Boolean(communicationItem && communication)}
        communication={communication}
        certificationName={communicationItem?.certificationName ?? ''}
        busy={generateCommunication.isPending || prepareCommunication.isPending}
        onClose={() => { setCommunicationItem(null); setCommunication(null); }}
        onRegenerate={async () => {
          if (!communicationItem?.latestAttemptId) throw new Error('No hay un resultado disponible para regenerar la postal.');
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
