import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useCatalogList, useDeleteCatalogItem, useUpdateCatalogStatus } from '../hooks/useCatalog';
import { catalogConfigs, type CatalogRecord, type CatalogStatus, type CatalogType } from '../types/catalog';

interface CatalogListPageProps { type: CatalogType; }

type SortField = 'name' | 'usageCount' | 'updatedAt' | 'status';

type PendingAction =
  | { kind: 'status'; item: CatalogRecord; nextStatus: CatalogStatus }
  | { kind: 'delete'; item: CatalogRecord }
  | null;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const CatalogListPage: React.FC<CatalogListPageProps> = ({ type }) => {
  const config = catalogConfigs[type];
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CatalogStatus | 'ALL'>('ACTIVE');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<SortField>('name');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const query = useCatalogList(type, { search, status, page, size, sort, direction });
  const statusMutation = useUpdateCatalogStatus(type);
  const deleteMutation = useDeleteCatalogItem(type);
  const data = query.data;

  useEffect(() => {
    setPage(0);
  }, [search, status, size, type]);

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const changeSort = (field: SortField) => {
    if (sort === field) setDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setDirection(field === 'updatedAt' ? 'desc' : 'asc'); }
    setPage(0);
  };

  const th = (field: SortField, label: string, className = '') => (
    <button type="button" onClick={() => changeSort(field)} className={`inline-flex items-center gap-1 text-left ${className}`}>
      {label}<span className="text-[8px] text-slate-400">{sort === field ? (direction === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  );

  const confirm = async () => {
    if (!pending) return;
    setError(null);
    try {
      if (pending.kind === 'status') {
        await statusMutation.mutateAsync({ id: pending.item.id, status: pending.nextStatus });
        const feminine = config.singularArticle === 'la';
        setMessage(`${feminine ? 'La' : 'El'} ${config.singular} fue ${pending.nextStatus === 'ACTIVE' ? (feminine ? 'activada' : 'activado') : (feminine ? 'inactivada' : 'inactivado')} correctamente.`);
      } else {
        await deleteMutation.mutateAsync(pending.item.id);
        const feminine = config.singularArticle === 'la';
        setMessage(`${feminine ? 'La' : 'El'} ${config.singular} fue ${feminine ? 'eliminada' : 'eliminado'} correctamente.`);
      }
      setPending(null);
    } catch (actionError) {
      setPending(null);
      setError((actionError as Error).message);
    }
  };

  const busy = statusMutation.isPending || deleteMutation.isPending;
  const pendingStatus = pending?.kind === 'status' ? pending.nextStatus : null;
  const pendingItem = pending?.item ?? null;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate(`${config.route}/new`)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-500">
          <Plus className="h-3.5 w-3.5" /> Agregar {config.singular}
        </button>
      </div>

      {message && <BBVAAlert tone="success" onClose={() => setMessage(null)}>{message}</BBVAAlert>}
      {error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}

      <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_200px]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o descripción" className="h-8 w-full rounded-md border border-slate-300 bg-white py-1 pl-8 pr-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100" />
        </div>
        <BBVASearchableSelect value={status} onChange={(value) => setStatus(value as CatalogStatus | 'ALL')} options={[{ value: 'ACTIVE', label: 'Activos' }, { value: 'INACTIVE', label: 'Inactivos' }, { value: 'ALL', label: 'Todos' }]} ariaLabel="Filtrar por estado" />
      </div>

      {query.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">Cargando registros...</div>
      ) : query.error ? (
        <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[820px] table-fixed text-left text-[10.5px]">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[0.035em] text-slate-600 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-950/55 [.bbva-dark_&]:text-slate-400">
                <tr>
                  <th className="w-[44%] px-2 py-1.5">{th('name', 'Nombre')}</th>
                  <th className="w-[14%] px-2 py-1.5 text-center">{th('usageCount', 'Cantidad de usos')}</th>
                  <th className="w-[20%] px-2 py-1.5">{th('updatedAt', 'Actualización')}</th>
                  <th className="w-[12%] px-2 py-1.5">{th('status', 'Estado')}</th>
                  <th className="w-[10%] px-2 py-1.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 [.bbva-dark_&]:divide-slate-800">
                {(data?.items ?? []).map((item) => (
                  <tr key={item.id} className="h-[39px] transition hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/60">
                    <td className="px-2 py-1.5">
                      <div className="truncate font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.name}</div>
                      {(item.seniority || item.description) && <div className="truncate text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">{[item.seniority, item.description].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td className="px-2 py-1.5 text-center font-semibold tabular-nums text-slate-700 [.bbva-dark_&]:text-slate-300">{item.usageCount}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600 [.bbva-dark_&]:text-slate-300">{formatDateTime(item.updatedAt)}</td>
                    <td className="px-2 py-1.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300' : 'bg-slate-100 text-slate-600 [.bbva-dark_&]:bg-slate-700/70 [.bbva-dark_&]:text-slate-300'}`}>{item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="px-2 py-1.5 text-right">
                      <BBVAActionMenu items={[
                        { id: 'view', label: 'Ver', icon: Eye, onClick: () => navigate(`${config.route}/${item.id}`) },
                        { id: 'edit', label: 'Editar', icon: Pencil, onClick: () => navigate(`${config.route}/${item.id}/edit`) },
                        item.status === 'ACTIVE'
                          ? { id: 'inactive', label: 'Inactivar', icon: Power, onClick: () => setPending({ kind: 'status', item, nextStatus: 'INACTIVE' }) }
                          : { id: 'active', label: 'Activar', icon: RefreshCw, onClick: () => setPending({ kind: 'status', item, nextStatus: 'ACTIVE' }) },
                        { id: 'delete', label: 'Eliminar', icon: Trash2, tone: 'danger' as const, onClick: () => setPending({ kind: 'delete', item }) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.total ?? 0) === 0
            ? <div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800">No hay registros que coincidan con los filtros.</div>
            : <BBVAPagination total={data?.total ?? 0} page={page} size={size} onPageChange={setPage} onSizeChange={(next) => { setSize(next); setPage(0); }} />}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.kind === 'delete' ? `Eliminar ${config.singular}` : `${pendingStatus === 'ACTIVE' ? 'Activar' : 'Inactivar'} ${config.singular}`}
        message={pending?.kind === 'delete'
          ? `Se eliminará ${config.singularArticle} ${config.singular} “${pendingItem?.name ?? ''}”. Solo es posible cuando no tiene usos registrados.`
          : `${pendingStatus === 'ACTIVE' ? 'Se habilitará nuevamente' : 'Se inactivará'} ${config.singularArticle} ${config.singular} “${pendingItem?.name ?? ''}”. ${pendingStatus === 'INACTIVE' ? 'Los datos históricos se conservarán.' : ''}`}
        confirmLabel={pending?.kind === 'delete' ? 'Eliminar' : pendingStatus === 'ACTIVE' ? 'Activar' : 'Inactivar'}
        tone={pending?.kind === 'delete' ? 'danger' : pendingStatus === 'ACTIVE' ? 'success' : 'warning'}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirm()}
      />
    </div>
  );
};
