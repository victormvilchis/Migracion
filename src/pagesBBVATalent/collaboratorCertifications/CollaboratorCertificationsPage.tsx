import React, { useMemo, useState } from 'react';
import { Award, Eye, Plus, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useCertificationCatalogOptions } from '../hooks/useCertificationCatalog';
import { useCollaborator } from '../hooks/useCollaborators';
import {
  useAddCollaboratorCertification,
  useCollaboratorCertifications,
  useMarkCertificationNotApplicable,
  useRecertifyCollaboratorCertification,
} from '../hooks/useCollaboratorCertifications';
import { COLLABORATOR_CERTIFICATION_STATUS_LABELS, type CollaboratorCertification, type CollaboratorCertificationStatus } from '../types/collaboratorCertification';

const tone: Record<CollaboratorCertificationStatus, string> = {
  VALID: 'bg-emerald-50 text-emerald-700',
  EXPIRING: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-rose-50 text-rose-700',
  RECERTIFICATION_PENDING: 'bg-orange-50 text-orange-700',
  FAILED: 'bg-rose-50 text-rose-700',
  PENDING: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-blue-50 text-blue-700',
  APPLIED: 'bg-indigo-50 text-indigo-700',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const CollaboratorCertificationsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const collaboratorQuery = useCollaborator(id);
  const query = useCollaboratorCertifications(id);
  const optionsQuery = useCertificationCatalogOptions();
  const addMutation = useAddCollaboratorCertification(id ?? '');
  const recertifyMutation = useRecertifyCollaboratorCertification(id ?? '');
  const notApplicableMutation = useMarkCertificationNotApplicable(id ?? '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | CollaboratorCertificationStatus>('ALL');
  const [certificationId, setCertificationId] = useState('');
  const [pendingRecertify, setPendingRecertify] = useState<CollaboratorCertification | null>(null);
  const [pendingNoApply, setPendingNoApply] = useState<CollaboratorCertification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const collaborator = collaboratorQuery.data?.item;
  const items = query.data?.items ?? [];
  const summary = query.data?.summary;

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-MX');
    return items.filter((item) => {
      const matches = !term || `${item.certificationName} ${item.technologyName ?? ''} ${item.provider ?? ''}`.toLocaleLowerCase('es-MX').includes(term);
      return matches && (status === 'ALL' || item.status === status);
    });
  }, [items, search, status]);

  const availableOptions = (optionsQuery.data?.items ?? []).filter((option) => !items.some((item) => item.certificationId === option.id && item.status !== 'NOT_APPLICABLE'));

  const add = async () => {
    if (!certificationId) return;
    try {
      setError(null);
      await addMutation.mutateAsync(certificationId);
      setCertificationId('');
    } catch (e) { setError((e as Error).message); }
  };

  if (collaboratorQuery.isLoading || query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificaciones...</div>;
  if (collaboratorQuery.error || !collaborator) return <BBVAAlert tone="error">{(collaboratorQuery.error as Error)?.message || 'Colaborador no encontrado.'}</BBVAAlert>;
  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  const attentionCount = (summary?.expiring ?? 0)
    + (summary?.expired ?? 0)
    + (summary?.failed ?? 0)
    + (summary?.pending ?? 0)
    + (summary?.recertificationPending ?? 0);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start"><BBVAFormBackButton onBack={() => navigate(`/bbva/collaborators/${id}/manage`)} /></div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="border-b border-slate-200 bg-slate-50/60 p-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/35">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold text-slate-950 [.bbva-dark_&]:text-white">{collaborator.fullName}</h1>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">
                <span>{collaborator.profile || 'Perfil no disponible'}</span>
                <span>{collaborator.currentTechnology || 'Tecnología no disponible'}</span>
                <span>{collaborator.expertise || 'Nivel no disponible'}</span>
              </div>
            </div>
            <div className="flex w-full max-w-xl gap-2">
              <div className="min-w-0 flex-1">
                <BBVASearchableSelect
                  value={certificationId}
                  onChange={setCertificationId}
                  options={[{ value: '', label: 'Seleccionar certificación' }, ...availableOptions.map((option) => ({ value: option.id, label: option.name }))]}
                  ariaLabel="Agregar certificación"
                />
              </div>
              <button type="button" onClick={() => void add()} disabled={!certificationId || addMutation.isPending} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[10.5px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Agregar</button>
            </div>
          </div>

          <div className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/70">
            <div className="border-b border-slate-100 px-3 py-2.5 sm:border-r lg:border-b-0 [.bbva-dark_&]:border-slate-800">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Cobertura</div>
              <div className="mt-1 text-[17px] font-semibold text-blue-700 [.bbva-dark_&]:text-blue-300">{summary?.coveragePercent ?? 100}%</div>
              <div className="text-[9.5px] text-slate-500">{summary?.valid ?? 0} vigentes</div>
            </div>
            <div className="border-b border-slate-100 px-3 py-2.5 lg:border-r lg:border-b-0 [.bbva-dark_&]:border-slate-800">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Aplicables</div>
              <div className="mt-1 text-[17px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{summary?.applicable ?? 0}</div>
              <div className="text-[9.5px] text-slate-500">{items.length} registros visibles</div>
            </div>
            <div className="border-b border-slate-100 px-3 py-2.5 sm:border-r sm:border-b-0 [.bbva-dark_&]:border-slate-800">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Atención requerida</div>
              <div className={`mt-1 text-[17px] font-semibold ${attentionCount ? 'text-amber-700 [.bbva-dark_&]:text-amber-300' : 'text-emerald-700 [.bbva-dark_&]:text-emerald-300'}`}>{attentionCount}</div>
              <div className="text-[9.5px] text-slate-500">{summary?.expired ?? 0} vencidas · {summary?.recertificationPending ?? 0} recertificación</div>
            </div>
            <div className="px-3 py-2.5">
              <div className="text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">Próximas a vencer</div>
              <div className="mt-1 text-[17px] font-semibold text-amber-700 [.bbva-dark_&]:text-amber-300">{summary?.expiring ?? 0}</div>
              <div className="text-[9.5px] text-slate-500">{summary?.pending ?? 0} pendientes</div>
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-3 grid gap-2 md:grid-cols-[minmax(260px,1fr)_240px]">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar certificación, tecnología o certificadora" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-950 [.bbva-dark_&]:text-slate-200" /></div>
            <BBVASearchableSelect value={status} onChange={(value) => setStatus(value as 'ALL' | CollaboratorCertificationStatus)} options={[{ value: 'ALL', label: 'Todos los estados' }, ...Object.entries(COLLABORATOR_CERTIFICATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))]} ariaLabel="Filtrar por estado" />
          </div>

          <div className="overflow-visible rounded-xl border border-slate-200 [.bbva-dark_&]:border-slate-800">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-[1040px] table-fixed text-left text-[10.5px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[8.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/45"><tr>
                  <th className="w-[27%] px-3 py-2">Certificación</th>
                  <th className="w-[14%] px-3 py-2">Estado</th>
                  <th className="w-[8%] px-3 py-2 text-center">Intentos</th>
                  <th className="w-[13%] px-3 py-2">Última aplicación</th>
                  <th className="w-[13%] px-3 py-2">Vencimiento</th>
                  <th className="w-[12%] px-3 py-2">Regla</th>
                  <th className="w-[13%] px-3 py-2 text-right">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">{filtered.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70 [.bbva-dark_&]:hover:bg-slate-950/30">
                    <td className="px-3 py-2.5"><div className="font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.certificationName}</div><div className="mt-0.5 truncate text-[9.5px] text-slate-500">{[item.technologyName, item.provider].filter(Boolean).join(' · ') || 'General'}</div></td>
                    <td className="px-3 py-2.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-[8.5px] font-semibold ${tone[item.status]}`}>{COLLABORATOR_CERTIFICATION_STATUS_LABELS[item.status]}</span></td>
                    <td className="px-3 py-2.5 text-center font-semibold tabular-nums">{item.attemptCount}</td>
                    <td className="px-3 py-2.5"><div>{formatDate(item.applicationDate)}</div>{item.approvedDate && item.approvedDate !== item.applicationDate ? <div className="mt-0.5 text-[9px] text-slate-400">Aprobada {formatDate(item.approvedDate)}</div> : null}</td>
                    <td className="px-3 py-2.5">{formatDate(item.expirationDate)}</td>
                    <td className="px-3 py-2.5"><span className="text-[9.5px] text-slate-600 [.bbva-dark_&]:text-slate-300">{item.mandatory ? 'Obligatoria' : 'Opcional'}<br/><span className="text-slate-400">{item.source === 'AUTO' ? 'Automática' : 'Manual'}</span></span></td>
                    <td className="px-3 py-2.5 text-right"><BBVAActionMenu items={[
                      { id: 'view', label: 'Ver', icon: Eye, onClick: () => navigate(`/bbva/collaborators/${id}/certifications/${item.id}`) },
                      { id: 'attempt', label: 'Registrar intento', icon: Award, disabled: item.status === 'NOT_APPLICABLE', onClick: () => navigate(`/bbva/collaborators/${id}/certifications/${item.id}/attempt`) },
                      { id: 'recertify', label: 'Recertificar', icon: RefreshCw, disabled: !item.recertificationEnabled || !['VALID','EXPIRING','EXPIRED','RECERTIFICATION_PENDING'].includes(item.status), onClick: () => setPendingRecertify(item) },
                      { id: 'not-applicable', label: 'Marcar no aplica', icon: ShieldAlert, tone: 'danger', disabled: item.status === 'NOT_APPLICABLE', onClick: () => setPendingNoApply(item) },
                    ]} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {filtered.length === 0 ? <div className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800">No hay certificaciones que coincidan con los filtros.</div> : null}
          </div>
        </div>
      </section>

      <ConfirmDialog open={Boolean(pendingRecertify)} title="Iniciar recertificación" message={`Se iniciará un nuevo ciclo para “${pendingRecertify?.certificationName ?? ''}”. El historial anterior se conservará.`} confirmLabel="Iniciar recertificación" tone="warning" busy={recertifyMutation.isPending} onCancel={() => setPendingRecertify(null)} onConfirm={() => { if (!pendingRecertify) return; recertifyMutation.mutate(pendingRecertify.id, { onSuccess: () => setPendingRecertify(null), onError: (e) => { setPendingRecertify(null); setError((e as Error).message); } }); }} />
      <ConfirmDialog open={Boolean(pendingNoApply)} title="Marcar como no aplica" message={`“${pendingNoApply?.certificationName ?? ''}” dejará de participar en el seguimiento actual de este colaborador. El historial se conservará.`} confirmLabel="Marcar no aplica" tone="danger" busy={notApplicableMutation.isPending} onCancel={() => setPendingNoApply(null)} onConfirm={() => { if (!pendingNoApply) return; notApplicableMutation.mutate(pendingNoApply.id, { onSuccess: () => setPendingNoApply(null), onError: (e) => { setPendingNoApply(null); setError((e as Error).message); } }); }} />
    </div>
  );
};
