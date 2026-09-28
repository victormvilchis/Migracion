import React, { useMemo } from 'react';
import { ArrowRightLeft, Award, Eye, FileSpreadsheet, Pencil, Plus, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { useCatalogOptions } from '../hooks/useCatalog';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useCollaborators } from '../hooks/useCollaborators';
import type { Collaborator } from '../types/collaborator';

function roleDisplay(profile?: string | null, technologyProfile?: string | null) {
  const values = [profile, technologyProfile].filter(Boolean);
  return values.length ? values.join(' - ') : 'No disponible';
}
function technologyDisplay(technology?: string | null, expertise?: string | null) { return technology ? (expertise ? `${technology} - ${expertise}` : technology) : 'No disponible'; }
function formatDate(value?: string | null) { if (!value) return 'No disponible'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
function certificationStatus(item: Pick<Collaborator, 'certificationExpiring'|'certificationExpired'|'certificationPending'|'certificationRecertificationPending'|'certificationCritical'|'certificationApplicable'>) {
  if (item.certificationCritical > 0) return 'CRITICAL';
  if (item.certificationExpired + item.certificationRecertificationPending > 0) return 'EXPIRED';
  if (item.certificationExpiring > 0) return 'EXPIRING';
  if (item.certificationPending > 0) return 'PENDING';
  if (item.certificationApplicable > 0) return 'VALID';
  return 'NA';
}
const certificationLabels: Record<string, string> = { CRITICAL: 'Crítico · solicitar baja', VALID: 'En regla', EXPIRING: 'Cubierta · próxima a vencer', EXPIRED: 'Atención requerida', PENDING: 'Pendientes', NA: 'Sin aplicables' };
const certificationTone: Record<string, string> = { CRITICAL: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200', VALID: 'bg-emerald-50 text-emerald-700', EXPIRING: 'bg-amber-50 text-amber-700', EXPIRED: 'bg-rose-50 text-rose-700', PENDING: 'bg-blue-50 text-blue-700', NA: 'bg-slate-100 text-slate-500' };
type SortField = 'name'|'role'|'technology'|'dm'|'startDate'|'certifications'|'status';
const defaults = { search:'', roleFilter:'ALL', technologyFilter:'ALL', statusFilter:'ALL', page:0, size:10, sort:'name' as SortField, direction:'asc' as 'asc'|'desc' };

export const CollaboratorsPage: React.FC = () => {
  const query = useCollaborators();
  const profilesQuery = useCatalogOptions('profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const location = useLocation();
  const navigate = useNavigate();
  const memory = useBBVAListMemory('collaborators', defaults);
  const { search, roleFilter, technologyFilter, statusFilter, page, size, sort, direction } = memory.state;
  const message = (location.state as { message?: string } | null)?.message ?? null;
  const items = query.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-MX');
    const rows = items.filter((item) => {
      const role = roleDisplay(item.profile, item.technologyProfile);
      const cert = certificationStatus(item);
      const matchesSearch = !term || [item.fullName,item.softtekEmail,item.bbvaEmail,item.email,item.softtekCode,item.bbvaUser,item.corporateUser,item.deliveryManager,role,item.currentTechnology,item.expertise].filter(Boolean).some((value) => String(value).toLocaleLowerCase('es-MX').includes(term));
      return matchesSearch && (roleFilter === 'ALL' || item.profileCatalogId === roleFilter) && (technologyFilter === 'ALL' || item.currentTechnologyCatalogId === technologyFilter) && (statusFilter === 'ALL' || cert === statusFilter);
    });
    const value = (item: Collaborator) => sort === 'name' ? item.fullName : sort === 'role' ? roleDisplay(item.profile,item.technologyProfile) : sort === 'technology' ? technologyDisplay(item.currentTechnology,item.expertise) : sort === 'dm' ? item.deliveryManager : sort === 'startDate' ? item.bbvaStartDate ?? '' : sort === 'certifications' ? item.certificationValid + item.certificationExpiring : certificationStatus(item);
    return rows.sort((a,b) => {
      const av=value(a), bv=value(b);
      const cmp=typeof av==='number'&&typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv),'es-MX',{sensitivity:'base',numeric:true});
      return direction==='asc'?cmp:-cmp;
    });
  }, [direction, items, roleFilter, search, sort, statusFilter, technologyFilter]);

  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
  const paged = useMemo(() => filtered.slice(safePage * size, safePage * size + size), [filtered, safePage, size]);
  const changeSort=(field:SortField)=>memory.patch(sort===field?{direction:direction==='asc'?'desc':'asc',page:0}:{sort:field,direction:'asc',page:0});
  const clearMessage=()=>navigate(location.pathname,{replace:true,state:{}});

  return <div className="space-y-3 animate-fade-in">
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={() => navigate('/bbva/collaborators/import')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />Cargar Tablero</button>
      <button type="button" onClick={() => navigate('/bbva/collaborators/new')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-500"><Plus className="h-3.5 w-3.5" />Agregar colaborador</button>
    </div>
    {message ? <BBVAAlert tone="success" onClose={clearMessage}>{message}</BBVAAlert> : null}
    <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_minmax(230px,.58fr)_minmax(220px,.52fr)_minmax(220px,.48fr)]">
      <div className="relative"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e)=>memory.patch({search:e.target.value,page:0})} placeholder="Buscar por nombre, correo, IS o usuario" className="h-8 w-full rounded-md border border-slate-300 bg-white py-1 pl-8 pr-2.5 text-[11px] text-slate-900 outline-none focus:border-blue-500" /></div>
      <BBVASearchableSelect value={roleFilter} onChange={(v)=>memory.patch({roleFilter:v,page:0})} options={[{value:'ALL',label:'Todos los roles'},...(profilesQuery.data?.items??[]).map((o)=>({value:o.id,label:o.name}))]} ariaLabel="Filtrar por rol" />
      <BBVASearchableSelect value={technologyFilter} onChange={(v)=>memory.patch({technologyFilter:v,page:0})} options={[{value:'ALL',label:'Todas las tecnologías'},...(technologiesQuery.data?.items??[]).map((o)=>({value:o.id,label:o.name}))]} ariaLabel="Filtrar por tecnología" />
      <BBVASearchableSelect value={statusFilter} onChange={(v)=>memory.patch({statusFilter:v,page:0})} options={[{value:'ALL',label:'Todos los estados'},{value:'CRITICAL',label:'Crítico · solicitar baja'},{value:'VALID',label:'En regla'},{value:'EXPIRING',label:'Cubierta · próxima a vencer'},{value:'EXPIRED',label:'Atención requerida'},{value:'PENDING',label:'Pendientes'},{value:'NA',label:'Sin aplicables'}]} ariaLabel="Filtrar por estado de certificación" />
    </div>
    {query.isLoading ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando colaboradores...</div> : query.error ? <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert> : <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto overflow-y-visible"><table className="w-full min-w-[1120px] table-fixed text-left text-[10.5px]">
        <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[.035em] text-slate-600"><tr>
          <th className="w-[27%] px-2 py-1.5"><BBVATableSortHeader label="Colaborador" active={sort==='name'} direction={direction} onClick={()=>changeSort('name')} /></th>
          <th className="w-[23%] px-2 py-1.5"><BBVATableSortHeader label="Rol" active={sort==='role'} direction={direction} onClick={()=>changeSort('role')} /></th>
          <th className="w-[13%] px-2 py-1.5"><BBVATableSortHeader label="Tecnología actual" active={sort==='technology'} direction={direction} onClick={()=>changeSort('technology')} /></th>
          <th className="w-[13%] px-2 py-1.5"><BBVATableSortHeader label="DM" active={sort==='dm'} direction={direction} onClick={()=>changeSort('dm')} /></th>
          <th className="w-[9%] px-2 py-1.5"><BBVATableSortHeader label="Alta BBVA" active={sort==='startDate'} direction={direction} onClick={()=>changeSort('startDate')} /></th>
          <th className="w-[10%] px-2 py-1.5"><BBVATableSortHeader label="Certificaciones" active={sort==='certifications'} direction={direction} onClick={()=>changeSort('certifications')} /></th>
          <th className="w-[10%] px-2 py-1.5"><BBVATableSortHeader label="Estado" active={sort==='status'} direction={direction} onClick={()=>changeSort('status')} /></th>
          <th className="w-[6%] px-2 py-1.5 text-right">Acciones</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-200">{paged.map((item)=>{const cert=certificationStatus(item);return <tr key={item.id} className="h-[42px] transition hover:bg-blue-50/35">
            <td className="px-2 py-1.5"><div className="min-w-0"><div className="truncate font-semibold text-slate-900">{item.fullName}</div><div className="truncate text-[9.5px] text-slate-500">{item.softtekEmail||item.email}</div></div></td>
            <td className="px-2 py-1.5"><div className="line-clamp-2 leading-[1.15] text-slate-700">{roleDisplay(item.profile,item.technologyProfile)}</div></td>
            <td className="px-2 py-1.5 text-slate-700">{technologyDisplay(item.currentTechnology,item.expertise)}</td>
            <td className="truncate px-2 py-1.5 text-slate-600" title={item.deliveryManager}>{item.deliveryManager||'No disponible'}</td>
            <td className="px-2 py-1.5 text-slate-600">{formatDate(item.bbvaStartDate)}</td>
            <td className="px-2 py-1.5"><div className="font-semibold text-slate-900">{item.certificationValid + item.certificationExpiring}/{item.certificationApplicable}</div><div className="text-[8.5px] text-slate-400">cubiertas / aplicables</div></td>
            <td className="px-2 py-1.5"><span className={`rounded-full px-2 py-1 text-[8.5px] font-semibold ${certificationTone[cert]}`}>{certificationLabels[cert]}</span></td>
            <td className="px-2 py-1.5 text-right"><BBVAActionMenu items={[{id:'view',label:'Ver',icon:Eye,onClick:()=>navigate(`/bbva/collaborators/${item.id}`)},{id:'edit',label:'Editar',icon:Pencil,onClick:()=>navigate(`/bbva/collaborators/${item.id}/edit`)},{id:'certifications',label:'Certificaciones',icon:Award,onClick:()=>navigate(`/bbva/collaborators/${item.id}/certifications`)},{id:'move-to-talent',label:'Mover a Banco de talento',icon:ArrowRightLeft,onClick:()=>navigate(`/bbva/collaborators/${item.id}/move-to-talent`)}]} /></td>
          </tr>;})}</tbody>
      </table></div>
      {filtered.length===0?<div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500">No hay registros que coincidan con los filtros.</div>:<BBVAPagination total={filtered.length} page={safePage} size={size} onPageChange={(v)=>memory.patch({page:v})} onSizeChange={(v)=>memory.patch({size:v,page:0})}/>}
    </div>}
  </div>;
};
