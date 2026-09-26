import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import {
  useCertificationCatalogList,
  useDeleteCertificationCatalogItem,
  useUpdateCertificationCatalogStatus,
} from '../hooks/useCertificationCatalog';
import {
  CERTIFICATION_TYPE_LABELS,
  CERTIFICATION_TYPES,
  type CertificationCatalogRecord,
  type CertificationCatalogStatus,
  type CertificationType,
} from '../types/certificationCatalog';

type SortField = 'name' | 'certificationType' | 'provider' | 'updatedAt' | 'status';
type PendingAction =
  | { kind: 'status'; item: CertificationCatalogRecord; nextStatus: CertificationCatalogStatus }
  | { kind: 'delete'; item: CertificationCatalogRecord }
  | null;

const route = '/bbva/admin/catalogs/certifications';

export const CertificationCatalogListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CertificationCatalogStatus | 'ALL'>('ACTIVE');
  const [type, setType] = useState<CertificationType | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<SortField>('name');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const query = useCertificationCatalogList({ search, status, certificationType: type, page, size, sort, direction });
  const statusMutation = useUpdateCertificationCatalogStatus();
  const deleteMutation = useDeleteCertificationCatalogItem();
  const data = query.data;

  useEffect(() => setPage(0), [search, status, type, size]);
  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const changeSort = (field: SortField) => {
    if (sort === field) setDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setDirection(field === 'updatedAt' ? 'desc' : 'asc'); }
    setPage(0);
  };
  const th = (field: SortField, label: string) => <button type="button" onClick={() => changeSort(field)} className="inline-flex items-center gap-1">{label}<span className="text-[8px] text-slate-400">{sort === field ? (direction === 'asc' ? '▲' : '▼') : '↕'}</span></button>;

  const confirm = async () => {
    if (!pending) return;
    setError(null);
    try {
      if (pending.kind === 'status') {
        await statusMutation.mutateAsync({ id: pending.item.id, status: pending.nextStatus });
        setMessage(`La certificación fue ${pending.nextStatus === 'ACTIVE' ? 'activada' : 'inactivada'} correctamente.`);
      } else {
        await deleteMutation.mutateAsync(pending.item.id);
        setMessage('La certificación fue eliminada correctamente.');
      }
      setPending(null);
    } catch (actionError) {
      setPending(null);
      setError((actionError as Error).message);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-end"><button type="button" onClick={() => navigate(`${route}/new`)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-500"><Plus className="h-3.5 w-3.5" />Agregar certificación</button></div>
      {message && <BBVAAlert tone="success" onClose={() => setMessage(null)}>{message}</BBVAAlert>}
      {error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}

      <div className="grid gap-2 md:grid-cols-[minmax(280px,1fr)_220px_180px]">
        <div className="relative"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar certificación, certificadora o tecnología" className="h-8 w-full rounded-md border border-slate-300 bg-white py-1 pl-8 pr-2.5 text-[11px] text-slate-900 outline-none focus:border-blue-500" /></div>
        <BBVASearchableSelect value={type} onChange={(value) => setType(value as CertificationType | 'ALL')} options={[{ value: 'ALL', label: 'Todos los tipos' }, ...CERTIFICATION_TYPES.map((item) => ({ value: item, label: CERTIFICATION_TYPE_LABELS[item] }))]} ariaLabel="Filtrar por tipo" />
        <BBVASearchableSelect value={status} onChange={(value) => setStatus(value as CertificationCatalogStatus | 'ALL')} options={[{ value: 'ACTIVE', label: 'Activas' }, { value: 'INACTIVE', label: 'Inactivas' }, { value: 'ALL', label: 'Todas' }]} ariaLabel="Filtrar por estado" />
      </div>

      {query.isLoading ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificaciones...</div> : query.error ? <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert> : (
        <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[760px] table-fixed text-left text-[10.5px]">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[0.035em] text-slate-600"><tr>
                <th className="w-[34%] px-2 py-1.5">{th('name', 'Certificación')}</th>
                <th className="w-[18%] px-2 py-1.5">{th('certificationType', 'Tipo')}</th>
                <th className="w-[28%] px-2 py-1.5">{th('provider', 'Tecnología / Certificadora')}</th>
                <th className="w-[10%] px-2 py-1.5">{th('status', 'Estado')}</th>
                <th className="w-[10%] px-2 py-1.5 text-right">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-200">{(data?.items ?? []).map((item) => <tr key={item.id} className="h-[42px] hover:bg-slate-50">
                <td className="px-2 py-1.5"><div className="truncate font-semibold text-slate-900">{item.name}</div></td>
                <td className="px-2 py-1.5 text-slate-700">{CERTIFICATION_TYPE_LABELS[item.certificationType]}</td>
                <td className="px-2 py-1.5"><div className="truncate text-slate-700">{item.technologyName || '—'}</div><div className="truncate text-[9.5px] text-slate-500">{item.provider || 'Sin certificadora'}</div></td>
                <td className="px-2 py-1.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</span></td>
                <td className="px-2 py-1.5 text-right"><BBVAActionMenu items={[
                  { id: 'view', label: 'Ver', icon: Eye, onClick: () => navigate(`${route}/${item.id}`) },
                  { id: 'edit', label: 'Editar', icon: Pencil, onClick: () => navigate(`${route}/${item.id}/edit`) },
                  item.status === 'ACTIVE' ? { id: 'inactive', label: 'Inactivar', icon: Power, onClick: () => setPending({ kind: 'status', item, nextStatus: 'INACTIVE' }) } : { id: 'active', label: 'Activar', icon: RefreshCw, onClick: () => setPending({ kind: 'status', item, nextStatus: 'ACTIVE' }) },
                  { id: 'delete', label: 'Eliminar', icon: Trash2, tone: 'danger' as const, onClick: () => setPending({ kind: 'delete', item }) },
                ]} /></td>
              </tr>)}</tbody>
            </table>
          </div>
          {(data?.total ?? 0) === 0 ? <div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500">No hay certificaciones que coincidan con los filtros.</div> : <BBVAPagination total={data?.total ?? 0} page={page} size={size} onPageChange={setPage} onSizeChange={(next) => { setSize(next); setPage(0); }} />}
        </div>
      )}

      <ConfirmDialog open={Boolean(pending)} title={pending?.kind === 'delete' ? 'Eliminar certificación' : `${pending?.nextStatus === 'ACTIVE' ? 'Activar' : 'Inactivar'} certificación`} message={pending?.kind === 'delete' ? `Se eliminará “${pending.item.name}”. Solo se permite cuando no existe historial operativo asociado.` : `${pending?.nextStatus === 'ACTIVE' ? 'Se habilitará nuevamente' : 'Se inactivará'} “${pending?.item.name ?? ''}”. La configuración histórica se conservará.`} confirmLabel={pending?.kind === 'delete' ? 'Eliminar' : pending?.nextStatus === 'ACTIVE' ? 'Activar' : 'Inactivar'} tone={pending?.kind === 'delete' ? 'danger' : pending?.nextStatus === 'ACTIVE' ? 'success' : 'warning'} busy={statusMutation.isPending || deleteMutation.isPending} onCancel={() => setPending(null)} onConfirm={() => void confirm()} />
    </div>
  );
};
