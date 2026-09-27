import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useCertificationCatalogList, useUpdateCertificationCatalogStatus } from '../hooks/useCertificationCatalog';
import {
  CERTIFICATION_TYPE_LABELS,
  CERTIFICATION_TYPES,
  type CertificationCatalogRecord,
  type CertificationCatalogStatus,
  type CertificationType,
} from '../types/certificationCatalog';

type SortField = 'name' | 'certificationType' | 'provider' | 'updatedAt' | 'status';
type PendingAction = { kind: 'status'; item: CertificationCatalogRecord; nextStatus: CertificationCatalogStatus } | null;
type ListState = { search: string; status: CertificationCatalogStatus | 'ALL'; type: CertificationType | 'ALL'; page: number; size: number; sort: SortField; direction: 'asc' | 'desc' };
const route = '/bbva/admin/catalogs/certifications';
const defaults: ListState = { search:'', status:'ACTIVE', type:'ALL', page:0, size:10, sort:'name', direction:'asc' };

export const CertificationCatalogListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, patch } = useBBVAListMemory<ListState>('certification-catalog', defaults);
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const query = useCertificationCatalogList({ search:state.search, status:state.status, certificationType:state.type, page:state.page, size:state.size, sort:state.sort, direction:state.direction });
  const statusMutation = useUpdateCertificationCatalogStatus();
  const data = query.data;

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const changeSort = (field: SortField) => {
    if (state.sort === field) patch({ direction: state.direction === 'asc' ? 'desc' : 'asc', page: 0 });
    else patch({ sort:field, direction:field === 'updatedAt' ? 'desc' : 'asc', page:0 });
  };

  const confirm = async () => {
    if (!pending) return;
    setError(null);
    try {
      await statusMutation.mutateAsync({ id: pending.item.id, status: pending.nextStatus });
      setMessage(`La certificación fue ${pending.nextStatus === 'ACTIVE' ? 'activada' : 'inactivada'} correctamente.`);
      setPending(null);
    } catch (actionError) { setPending(null); setError((actionError as Error).message); }
  };

  return <div className="space-y-3 animate-fade-in">
    <div className="flex justify-end"><BBVAButton variant="primary" size="md" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate(`${route}/new`)}>Agregar certificación</BBVAButton></div>
    {message ? <BBVAAlert tone="success" onClose={() => setMessage(null)}>{message}</BBVAAlert> : null}
    {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

    <div className="grid gap-2 md:grid-cols-[minmax(280px,1fr)_220px_180px]">
      <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"/><input value={state.search} onChange={(e)=>patch({search:e.target.value,page:0})} placeholder="Buscar certificación, certificadora o tecnología" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-500"/></div>
      <BBVASearchableSelect value={state.type} onChange={(value)=>patch({type:value as CertificationType|'ALL',page:0})} options={[{value:'ALL',label:'Todos los tipos'},...CERTIFICATION_TYPES.map((item)=>({value:item,label:CERTIFICATION_TYPE_LABELS[item]}))]} ariaLabel="Filtrar por tipo"/>
      <BBVASearchableSelect value={state.status} onChange={(value)=>patch({status:value as CertificationCatalogStatus|'ALL',page:0})} options={[{value:'ACTIVE',label:'Activas'},{value:'INACTIVE',label:'Inactivas'},{value:'ALL',label:'Todas'}]} ariaLabel="Filtrar por estado"/>
    </div>

    {query.isLoading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificaciones...</div> : query.error ? <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert> : (
      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto overflow-y-visible"><table className="w-full min-w-[760px] table-fixed text-left text-[10.5px]">
          <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[0.035em] text-slate-600"><tr>
            <th className="w-[34%] px-3 py-2"><BBVATableSortHeader label="Certificación" active={state.sort==='name'} direction={state.direction} onClick={()=>changeSort('name')}/></th>
            <th className="w-[18%] px-3 py-2"><BBVATableSortHeader label="Tipo" active={state.sort==='certificationType'} direction={state.direction} onClick={()=>changeSort('certificationType')}/></th>
            <th className="w-[28%] px-3 py-2"><BBVATableSortHeader label="Tecnología / Certificadora" active={state.sort==='provider'} direction={state.direction} onClick={()=>changeSort('provider')}/></th>
            <th className="w-[10%] px-3 py-2"><BBVATableSortHeader label="Estado" active={state.sort==='status'} direction={state.direction} onClick={()=>changeSort('status')}/></th>
            <th className="w-[10%] px-3 py-2 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-200">{(data?.items ?? []).map((item) => {
            const active=item.status==='ACTIVE';
            const actions=active ? [
              {id:'view',label:'Ver',icon:Eye,onClick:()=>navigate(`${route}/${item.id}`)},
              {id:'edit',label:'Editar',icon:Pencil,onClick:()=>navigate(`${route}/${item.id}/edit`)},
              {id:'inactive',label:'Inactivar',icon:Power,onClick:()=>setPending({kind:'status',item,nextStatus:'INACTIVE' as CertificationCatalogStatus})},
            ] : [
              {id:'view',label:'Ver',icon:Eye,onClick:()=>navigate(`${route}/${item.id}`)},
              {id:'active',label:'Activar',icon:RefreshCw,onClick:()=>setPending({kind:'status',item,nextStatus:'ACTIVE' as CertificationCatalogStatus})},
              {id:'delete',label:'Eliminar definitivamente',icon:Trash2,tone:'danger' as const,onClick:()=>navigate(`${route}/${item.id}/delete`)},
            ];
            return <tr key={item.id} className="h-[44px] hover:bg-slate-50"><td className="px-3 py-2"><div className="truncate font-semibold text-slate-900">{item.name}</div></td><td className="px-3 py-2 text-slate-700">{CERTIFICATION_TYPE_LABELS[item.certificationType]}</td><td className="px-3 py-2"><div className="truncate text-slate-700">{item.technologyName||'—'}</div><div className="truncate text-[9.5px] text-slate-500">{item.provider||'Sin certificadora'}</div></td><td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${active?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{active?'Activa':'Inactiva'}</span></td><td className="px-3 py-2 text-right"><BBVAActionMenu items={actions}/></td></tr>;
          })}</tbody>
        </table></div>
        {(data?.total??0)===0 ? <div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500">No hay certificaciones que coincidan con los filtros.</div> : <BBVAPagination total={data?.total??0} page={state.page} size={state.size} onPageChange={(page)=>patch({page})} onSizeChange={(size)=>patch({size,page:0})}/>}
      </div>
    )}

    <ConfirmDialog open={Boolean(pending)} title={`${pending?.nextStatus==='ACTIVE'?'Activar':'Inactivar'} certificación`} message={pending?.nextStatus==='ACTIVE'?`Se habilitará nuevamente “${pending?.item.name??''}”.`:`Se inactivará “${pending?.item.name??''}”. Podrás consultarla y volver a activarla desde el listado de inactivas.`} confirmLabel={pending?.nextStatus==='ACTIVE'?'Activar':'Inactivar'} tone={pending?.nextStatus==='ACTIVE'?'success':'warning'} busy={statusMutation.isPending} onCancel={()=>setPending(null)} onConfirm={()=>void confirm()}/>
  </div>;
};
