import React, { Fragment, useMemo, useState } from 'react';
import { ArrowRightLeft, Award, Eye, FileSpreadsheet, Pencil, Plus, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BBVAActionMenu } from '../../componentsBBVATalent/BBVAActionMenu';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { useCatalogOptions } from '../hooks/useCatalog';
import { useStructureOptions } from '../hooks/useStructureCatalog';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useCollaborators } from '../hooks/useCollaborators';
import { displayPersonName, displayRoleName, displayStructure, sentenceCaseData, upperDisplay, upperIdentity } from '../lib/bbvaDisplayFormat';
import { buildStructureFilterOptions, decodeStructureFilter, encodeStructureFilter } from '../lib/structureFilter';
import type { Collaborator } from '../types/collaborator';

function roleDisplay(profile?: string | null, technologyProfile?: string | null) {
  const values = [profile, technologyProfile].filter(Boolean);
  return values.length ? values.join(' - ') : 'No disponible';
}
function technologyDisplay(technology?: string | null, expertise?: string | null) { return technology ? (expertise ? `${technology} - ${expertise}` : technology) : 'No disponible'; }
function formatDate(value?: string | null) { if (!value) return 'No disponible'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
function hasDoubleTechnologyCertification(item: Pick<Collaborator, 'certificationTechnologicalCovered'>) { return item.certificationTechnologicalCovered >= 2; }
function certificationStatus(item: Pick<Collaborator, 'certificationExpiring'|'certificationExpired'|'certificationPending'|'certificationRecertificationPending'|'certificationCritical'|'certificationApplicable'|'certificationTechnologicalApplicable'|'certificationTechnologicalCovered'>) {
  if (item.certificationCritical > 0) return 'CRITICAL';
  if (item.certificationExpired + item.certificationRecertificationPending > 0) return 'EXPIRED';
  if (item.certificationExpiring > 0) return 'EXPIRING';
  if (item.certificationPending > 0) return 'PENDING';
  if (item.certificationApplicable > 0) {
    if (item.certificationTechnologicalApplicable > 0 && item.certificationTechnologicalCovered === 0) return 'PENDING';
    if (item.certificationTechnologicalApplicable > 0 && hasDoubleTechnologyCertification(item)) return 'DOUBLE_TECH';
    return 'VALID';
  }
  return 'NA';
}
const certificationLabels: Record<string, string> = { CRITICAL: 'Crítico · resolver 2/2', VALID: 'En regla', DOUBLE_TECH: 'Doble certificación', EXPIRING: 'Cubierta · próxima a vencer', EXPIRED: 'Atención requerida', PENDING: 'Pendientes', NA: 'Sin aplicables' };
const certificationTone: Record<string, string> = { CRITICAL: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200', VALID: 'bg-emerald-50 text-emerald-700', DOUBLE_TECH: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200', EXPIRING: 'bg-amber-50 text-amber-700', EXPIRED: 'bg-rose-50 text-rose-700', PENDING: 'bg-blue-50 text-blue-700', NA: 'bg-slate-100 text-slate-500' };
type SortField = 'name'|'role'|'technology'|'dm'|'startDate'|'certifications'|'status';
const defaults = { search:'', roleFilter:'ALL', technologyFilter:'ALL', structure2Filter:'ALL', structure3Filter:'ALL', deliveryManagerFilter:'ALL', statusFilter:'ALL', page:0, size:10, sort:'name' as SortField, direction:'asc' as 'asc'|'desc' };
const unique=(values:Array<string|null|undefined>)=>[...new Set(values.map((value)=>String(value??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es-MX',{sensitivity:'base'}));

export const CollaboratorsPage: React.FC = () => {
  const query = useCollaborators();
  const profilesQuery = useCatalogOptions('profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const structuresQuery = useStructureOptions();
  const location = useLocation();
  const navigate = useNavigate();
  const memory = useBBVAListMemory('collaborators', defaults);
  const { search, roleFilter, technologyFilter, structure2Filter, structure3Filter, deliveryManagerFilter, statusFilter, page, size, sort, direction } = memory.state;
  const message = (location.state as { message?: string } | null)?.message ?? null;
  const items = query.data?.items ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const structureOptions=useMemo(()=>buildStructureFilterOptions(structuresQuery.data?.items??[]),[structuresQuery.data?.items]);
  const structureFilter=encodeStructureFilter(structure2Filter==='ALL'?'':structure2Filter,structure3Filter==='ALL'?'':structure3Filter);
  const deliveryManagerOptions=useMemo(()=>unique(items.map((item)=>item.deliveryManager)),[items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-MX');
    const rows = items.filter((item) => {
      const role = roleDisplay(item.profile, item.technologyProfile);
      const cert = certificationStatus(item);
      const matchesSearch = !term || [item.fullName,item.softtekEmail,item.bbvaEmail,item.email,item.softtekCode,item.bbvaUser,item.corporateUser,item.deliveryManager,role,item.currentTechnology,item.expertise,item.bbvaStructureLevel2,item.bbvaStructureLevel3].filter(Boolean).some((value) => String(value).toLocaleLowerCase('es-MX').includes(term));
      const normalizedStatusFilter = statusFilter === 'VALID_PLUS' ? 'DOUBLE_TECH' : statusFilter;
      const matchesStatus = normalizedStatusFilter === 'ALL' || (normalizedStatusFilter === 'DOUBLE_TECH' ? hasDoubleTechnologyCertification(item) : cert === normalizedStatusFilter);
      return matchesSearch && (roleFilter === 'ALL' || item.profileCatalogId === roleFilter) && (technologyFilter === 'ALL' || item.currentTechnologyCatalogId === technologyFilter) && (structure2Filter==='ALL'||item.bbvaStructureLevel2===structure2Filter) && (structure3Filter==='ALL'||item.bbvaStructureLevel3===structure3Filter) && (deliveryManagerFilter==='ALL'||item.deliveryManager===deliveryManagerFilter) && matchesStatus;
    });
    const value = (item: Collaborator) => sort === 'name' ? item.fullName : sort === 'role' ? roleDisplay(item.profile,item.technologyProfile) : sort === 'technology' ? technologyDisplay(item.currentTechnology,item.expertise) : sort === 'dm' ? item.deliveryManager : sort === 'startDate' ? item.bbvaStartDate ?? '' : sort === 'certifications' ? item.certificationValid + item.certificationExpiring : certificationStatus(item);
    return rows.sort((a,b) => {
      const av=value(a), bv=value(b);
      const cmp=typeof av==='number'&&typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv),'es-MX',{sensitivity:'base',numeric:true});
      return direction==='asc'?cmp:-cmp;
    });
  }, [deliveryManagerFilter, direction, items, roleFilter, search, sort, statusFilter, structure2Filter, structure3Filter, technologyFilter]);

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
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
      <div className="relative xl:col-span-2"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e)=>memory.patch({search:e.target.value,page:0})} placeholder="Buscar por nombre, correo, IS o usuario" className="h-9 w-full rounded-xl border border-slate-300 bg-white py-1 pl-8 pr-2.5 text-[11px] text-slate-900 outline-none focus:border-blue-500" /></div>
      <BBVASearchableSelect value={technologyFilter} onChange={(v)=>memory.patch({technologyFilter:v,page:0})} options={[{value:'ALL',label:'Todas las tecnologías'},...(technologiesQuery.data?.items??[]).map((o)=>({value:o.id,label:String(o.name).toUpperCase()}))]} ariaLabel="Filtrar por tecnología" />
      <BBVASearchableSelect value={deliveryManagerFilter} onChange={(v)=>memory.patch({deliveryManagerFilter:v,page:0})} options={[{value:'ALL',label:'Todos los DM'},...deliveryManagerOptions.map((value)=>({value,label:upperDisplay(value)}))]} ariaLabel="Filtrar por Delivery Manager" />
      <BBVASearchableSelect value={statusFilter} onChange={(v)=>memory.patch({statusFilter:v,page:0})} options={[{value:'ALL',label:'Todos los estados'},{value:'CRITICAL',label:'Crítico · resolver 2/2'},{value:'VALID',label:'En regla'},{value:'DOUBLE_TECH',label:'Doble certificación'},{value:'EXPIRING',label:'Cubierta · próxima a vencer'},{value:'EXPIRED',label:'Atención requerida'},{value:'PENDING',label:'Pendientes'},{value:'NA',label:'Sin aplicables'}]} ariaLabel="Filtrar por estado de certificación" />
      <BBVASearchableSelect value={structureFilter} onChange={(v)=>{const next=decodeStructureFilter(v);memory.patch({structure2Filter:next.level2||'ALL',structure3Filter:next.level3||'ALL',page:0});}} options={structureOptions} ariaLabel="Filtrar por estructura BBVA" searchPlaceholder="Buscar nivel 2 o nivel 3" />
      <div className="hidden"><BBVASearchableSelect value={roleFilter} onChange={(v)=>memory.patch({roleFilter:v,page:0})} options={[{value:'ALL',label:'Todos los roles'},...(profilesQuery.data?.items??[]).map((o)=>({value:o.id,label:String(o.name).toUpperCase()}))]} ariaLabel="Filtrar por rol" /></div>
    </div>
    {(search||technologyFilter!=='ALL'||deliveryManagerFilter!=='ALL'||statusFilter!=='ALL'||structureFilter!=='ALL')?<div className="flex justify-end"><button type="button" onClick={()=>memory.reset()} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">Limpiar filtros</button></div>:null}
    {query.isLoading ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando colaboradores...</div> : query.error ? <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert> : <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto overflow-y-visible"><table className="w-full min-w-[1320px] table-fixed text-left text-[10.5px]">
        <thead className="border-b border-slate-200 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-[.035em] text-slate-600"><tr>
          <th className="w-[27%] px-2 py-1.5"><BBVATableSortHeader label="Colaborador" active={sort==='name'} direction={direction} onClick={()=>changeSort('name')} /></th>
          <th className="w-[23%] px-2 py-1.5"><BBVATableSortHeader label="Rol" active={sort==='role'} direction={direction} onClick={()=>changeSort('role')} /></th>
          <th className="w-[13%] px-2 py-1.5"><BBVATableSortHeader label="Tecnología actual" active={sort==='technology'} direction={direction} onClick={()=>changeSort('technology')} /></th>
          <th className="w-[13%] px-2 py-1.5">Estructura BBVA</th>
          <th className="w-[12%] px-2 py-1.5"><BBVATableSortHeader label="DM" active={sort==='dm'} direction={direction} onClick={()=>changeSort('dm')} /></th>
          <th className="w-[9%] px-2 py-1.5"><BBVATableSortHeader label="Alta BBVA" active={sort==='startDate'} direction={direction} onClick={()=>changeSort('startDate')} /></th>
          <th className="w-[10%] px-2 py-1.5"><BBVATableSortHeader label="Certificaciones" active={sort==='certifications'} direction={direction} onClick={()=>changeSort('certifications')} /></th>
          <th className="w-[10%] px-2 py-1.5"><BBVATableSortHeader label="Estado" active={sort==='status'} direction={direction} onClick={()=>changeSort('status')} /></th>
          <th className="w-[6%] px-2 py-1.5 text-right">Acciones</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-200">{paged.map((item)=>{const cert=certificationStatus(item);const isExpanded=expanded===item.id;return <Fragment key={item.id}>
          <tr
            className={`h-[42px] cursor-pointer transition hover:bg-blue-50/35 ${isExpanded ? 'bg-blue-50/45' : ''}`}
            onClick={() => setExpanded(isExpanded ? null : item.id)}
            aria-expanded={isExpanded}
            title="Clic para ver contexto del colaborador"
          >
            <td className="px-2 py-1.5"><div className="min-w-0"><div className="truncate font-semibold text-slate-900">{displayPersonName(item.fullName)}</div><div className="truncate text-[9.5px] text-slate-500">{item.softtekEmail||item.email}</div></div></td>
            <td className="px-2 py-1.5"><div className="line-clamp-2 leading-[1.15] text-slate-700">{displayRoleName(roleDisplay(item.profile,item.technologyProfile))}</div></td>
            <td className="px-2 py-1.5 text-slate-700">{upperDisplay(technologyDisplay(item.currentTechnology,item.expertise))}</td>
            <td className="px-2 py-1.5"><div className="truncate font-medium text-slate-700">{displayStructure(item.bbvaStructureLevel2)}</div><div className="truncate text-[9px] text-slate-400">{displayStructure(item.bbvaStructureLevel3)}</div></td><td className="truncate px-2 py-1.5 text-slate-600" title={item.deliveryManager??''}>{displayPersonName(item.deliveryManager)}</td>
            <td className="px-2 py-1.5 text-slate-600">{formatDate(item.bbvaStartDate)}</td>
            <td className="px-2 py-1.5"><div className="font-semibold text-slate-900">{item.certificationValid + item.certificationExpiring}/{item.certificationApplicable}</div><div className="text-[8.5px] text-slate-400">cubiertas / aplicables</div></td>
            <td className="px-2 py-1.5"><span className={`rounded-full px-2 py-1 text-[8.5px] font-semibold ${certificationTone[cert]}`}>{certificationLabels[cert]}</span></td>
            <td className="px-2 py-1.5 text-right" onClick={(event)=>event.stopPropagation()}><BBVAActionMenu items={[{id:'view',label:'Ver',icon:Eye,onClick:()=>navigate(`/bbva/collaborators/${item.id}`)},{id:'edit',label:'Editar',icon:Pencil,onClick:()=>navigate(`/bbva/collaborators/${item.id}/edit`)},{id:'certifications',label:'Certificaciones',icon:Award,onClick:()=>navigate(`/bbva/collaborators/${item.id}/certifications`)},{id:'move-to-talent',label:'Mover a Banco de talento',icon:ArrowRightLeft,onClick:()=>navigate(`/bbva/collaborators/${item.id}/move-to-talent`)}]} /></td>
          </tr>
          {isExpanded ? <tr className="bg-slate-50/75"><td colSpan={9} className="px-3 py-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10">
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">IS Softtek</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{upperIdentity(item.softtekCode)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Usuario BBVA / XM</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{upperIdentity(item.bbvaUser||item.corporateUser)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Correo BBVA</div><div className="mt-1 truncate text-[10px] font-semibold text-slate-700" title={item.bbvaEmail??''}>{item.bbvaEmail||'No disponible'}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Contratación Softtek</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{formatDate(item.softtekHireDate)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Perfil tecnológico</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{sentenceCaseData(item.technologyProfile)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Nivel colaborador</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{sentenceCaseData(item.expertise)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Status accesos</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{sentenceCaseData(item.bbvaAccessStatus)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Fin de accesos</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{formatDate(item.bbvaAccessEndDate)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Autorizador</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{displayPersonName(item.bbvaAccessAuthorizer)}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Por atender</div><div className="mt-1 text-[10px] font-semibold text-slate-700">{item.certificationPending + item.certificationExpired + item.certificationRecertificationPending + item.certificationCritical}</div></div>
            <div><div className="text-[8px] font-semibold uppercase tracking-[.05em] text-slate-400">Notas</div><div className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-600" title={item.notes??''}>{sentenceCaseData(item.notes,'Sin notas')}</div></div>
          </div></td></tr> : null}
        </Fragment>;})}</tbody>
      </table></div>
      {filtered.length===0?<div className="border-t border-slate-200 px-3 py-8 text-center text-xs text-slate-500">No hay registros que coincidan con los filtros.</div>:<BBVAPagination total={filtered.length} page={safePage} size={size} onPageChange={(v)=>memory.patch({page:v})} onSizeChange={(v)=>memory.patch({size:v,page:0})}/>}
    </div>}
  </div>;
};
