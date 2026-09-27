import React, { useMemo, useState } from 'react';
import { AlertCircle, Award, Briefcase, ChevronRight, Layers3, RefreshCw, UserRoundCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useBbvaDashboard } from '../hooks/useDashboard';
import type { DashboardFilters, DashboardResponse } from '../types/dashboard';

const initialFilters: DashboardFilters = { technologyId:'', profileId:'', certificationStatus:'', deliveryManager:'', talentType:'', fromDate:'', toDate:'', search:'' };
const sliceColors = ['#2563eb','#7c3aed','#0f9f6e','#f59e0b','#ef4444','#64748b'];
type AttentionRow = DashboardResponse['attention'][number];
type AttentionSort = 'fullName'|'profile'|'technology'|'deliveryManager'|'alerts';

function Donut({items,center,caption}:{items:Array<{label:string;value:number}>;center:string|number;caption:string}) {
  const total=items.reduce((s,i)=>s+i.value,0); let cursor=0;
  const stops=items.map((item,index)=>{const start=total?(cursor/total)*100:0;cursor+=item.value;const end=total?(cursor/total)*100:100;return `${sliceColors[index%sliceColors.length]} ${start}% ${end}%`;});
  const background=total?`conic-gradient(${stops.join(',')})`:'conic-gradient(#e2e8f0 0 100%)';
  return <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center"><div className="relative mx-auto h-32 w-32 rounded-full" style={{background}}><div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner"><div className="text-2xl font-semibold text-slate-950">{center}</div><div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">{caption}</div></div></div><div className="space-y-2">{items.map((item,index)=><div key={item.label} className="flex items-center justify-between gap-3 text-[10.5px]"><span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:sliceColors[index%sliceColors.length]}}/><span className="truncate">{item.label}</span></span><span className="font-semibold tabular-nums text-slate-900">{item.value}</span></div>)}</div></div>;
}

function MetricCard({label,value,icon,onClick,tone='blue'}:{label:string;value:React.ReactNode;icon:React.ReactNode;onClick?:()=>void;tone?:'blue'|'emerald'|'amber'|'rose'|'violet'}) {
  const tones={blue:'bg-blue-50 text-blue-700 border-blue-100',emerald:'bg-emerald-50 text-emerald-700 border-emerald-100',amber:'bg-amber-50 text-amber-700 border-amber-100',rose:'bg-rose-50 text-rose-700 border-rose-100',violet:'bg-violet-50 text-violet-700 border-violet-100'};
  const Comp=onClick?'button':'div';
  return <Comp type={onClick?'button':undefined} onClick={onClick} className="group flex min-h-[112px] w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"><div className="flex h-9 items-start justify-between gap-3"><span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</span>{onClick?<ChevronRight className="mt-0.5 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"/>:null}</div><div className="mt-3 text-[9px] font-semibold uppercase leading-3 tracking-[0.05em] text-slate-400">{label}</div><div className="mt-auto pt-2 text-2xl font-semibold leading-none tabular-nums text-slate-950">{value}</div></Comp>;
}

function Bars({items,max,onSelect}:{items:Array<{key:string;label:string;value:number}>;max:number;onSelect?:(key:string)=>void}) {
  if(!items.length)return <div className="py-8 text-center text-[10.5px] text-slate-400">Sin datos para los filtros actuales.</div>;
  return <div className="space-y-3">{items.slice(0,10).map((item)=><button key={`${item.key}-${item.label}`} type="button" onClick={()=>onSelect?.(item.key)} disabled={!onSelect} className="grid w-full grid-cols-[160px_minmax(0,1fr)_34px] items-center gap-3 text-left disabled:cursor-default"><span className="truncate text-[10px] font-medium text-slate-600">{item.label}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500 transition" style={{width:`${Math.max(4,(item.value/Math.max(1,max))*100)}%`}}/></span><span className="text-right text-[10px] font-semibold tabular-nums text-slate-700">{item.value}</span></button>)}</div>;
}

function rowAlerts(row: AttentionRow){return row.expiring+row.expired+row.pending+row.recertificationPending;}

export const BBVADashboardPage: React.FC = () => {
  const navigate=useNavigate();
  const {state:filters,patch,reset}=useBBVAListMemory<DashboardFilters>('dashboard-filters',initialFilters);
  const [sort,setSort]=useState<AttentionSort>('alerts');
  const [direction,setDirection]=useState<'asc'|'desc'>('desc');
  const query=useBbvaDashboard(filters); const data=query.data; const cards=data?.cards;

  const profileDistribution=useMemo(()=>{const counts=new Map<string,number>();for(const row of data?.attention??[]){const label=row.profile||'Sin perfil';counts.set(label,(counts.get(label)??0)+1);}return [...counts.entries()].map(([label,value])=>({key:label,label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'es-MX'));},[data?.attention]);
  const technologyDistribution=useMemo(()=>(data?.technologyDistribution??[]).map((item)=>({key:item.technologyId??'',label:item.label,value:item.value})),[data?.technologyDistribution]);
  const representedTechnologies=technologyDistribution.filter((item)=>item.label!=='Sin tecnología'&&item.value>0).length;
  const attentionRows=useMemo(()=>{
    const rows=(data?.attention??[]).filter((row)=>rowAlerts(row)>0);
    const compare=(a:AttentionRow,b:AttentionRow)=>{const text=(x:string,y:string)=>x.localeCompare(y,'es-MX',{sensitivity:'base',numeric:true});if(sort==='fullName')return text(a.fullName,b.fullName);if(sort==='profile')return text(a.profile,b.profile);if(sort==='technology')return text(a.technology,b.technology);if(sort==='deliveryManager')return text(a.deliveryManager,b.deliveryManager);return rowAlerts(a)-rowAlerts(b);};
    return [...rows].sort((a,b)=>(direction==='asc'?1:-1)*compare(a,b));
  },[data?.attention,direction,sort]);
  const attentionCount=attentionRows.length;
  const maxTech=Math.max(1,...technologyDistribution.map((i)=>i.value)); const maxProfile=Math.max(1,...profileDistribution.map((i)=>i.value));
  const update=(key:keyof DashboardFilters,value:string)=>patch({[key]:value} as Partial<DashboardFilters>);
  const changeSort=(field:AttentionSort)=>{if(sort===field)setDirection((d)=>d==='asc'?'desc':'asc');else{setSort(field);setDirection(field==='alerts'?'desc':'asc');}};

  if(query.error)return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;
  return <div className="space-y-3 animate-fade-in">
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[.06em] text-blue-600">Vista operativa</div><div className="text-[10px] text-slate-500">Resumen general de talento y certificaciones.</div></div><BBVAButton variant="secondary" size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${query.isFetching?'animate-spin':''}`}/>} onClick={()=>void query.refetch()}>Actualizar</BBVAButton></div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <BBVASearchableSelect value={filters.profileId} onChange={(v)=>update('profileId',v)} options={[{value:'',label:'Todos los perfiles'},...(data?.filters.profiles??[]).map((i)=>({value:i.id,label:i.name}))]} ariaLabel="Perfil"/>
        <BBVASearchableSelect value={filters.technologyId} onChange={(v)=>update('technologyId',v)} options={[{value:'',label:'Todas las tecnologías'},...(data?.filters.technologies??[]).map((i)=>({value:i.id,label:i.name}))]} ariaLabel="Tecnología"/>
        <BBVASearchableSelect value={filters.certificationStatus} onChange={(v)=>update('certificationStatus',v)} options={[{value:'',label:'Todos los estados de certificación'},{value:'VALID',label:'Vigentes'},{value:'EXPIRING',label:'Próximas a vencer'},{value:'EXPIRED',label:'Vencidas'},{value:'RECERTIFICATION_PENDING',label:'Recertificación pendiente'},{value:'PENDING',label:'Pendientes'},{value:'FAILED',label:'Reprobadas'}]} ariaLabel="Estado de certificación"/>
        <BBVASearchableSelect value={filters.talentType} onChange={(v)=>update('talentType',v)} options={[{value:'',label:'Todo el universo'},{value:'ACADEMY',label:'Academia'},{value:'PROSPECT',label:'Prospectos'},{value:'FORMER_COLLABORATOR',label:'Excolaboradores'},{value:'BBVA_EXIT',label:'Bajas de BBVA'}]} ariaLabel="Universo"/>
      </div>
      {(filters.profileId||filters.technologyId||filters.certificationStatus||filters.talentType)?<div className="mt-2 flex justify-end"><BBVAButton variant="secondary" size="sm" onClick={reset}>Limpiar filtros</BBVAButton></div>:null}
    </section>

    {query.isLoading||!cards?<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">Cargando panel...</div>:<>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(175px,1fr))] items-stretch gap-2">
        <MetricCard label="Colaboradores activos" value={cards.collaboratorsActive} icon={<UsersRound className="h-4 w-4"/>} onClick={()=>navigate('/bbva/collaborators')}/>
        <MetricCard label="Banco de talento" value={cards.talentBankActive} icon={<UserRoundCheck className="h-4 w-4"/>} tone="violet" onClick={()=>navigate('/bbva/talent-bank')}/>
        <MetricCard label="Cobertura de certificaciones" value={`${cards.coveragePercent}%`} icon={<Award className="h-4 w-4"/>} tone="emerald" onClick={()=>navigate('/bbva/certifications/metrics')}/>
        <MetricCard label="Atención requerida" value={attentionCount} icon={<AlertCircle className="h-4 w-4"/>} tone={attentionCount?'amber':'emerald'} onClick={()=>navigate('/bbva/certifications/tracking')}/>
        <MetricCard label="Tecnologías representadas" value={representedTechnologies} icon={<Layers3 className="h-4 w-4"/>} tone="blue"/>
        <MetricCard label="Datos por completar" value={cards.dataQualityPending} icon={<Briefcase className="h-4 w-4"/>} tone={cards.dataQualityPending?'amber':'emerald'}/>
      </div>

      <div className="grid gap-3 xl:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-semibold text-slate-950">Distribución por tecnología</h2><Bars items={technologyDistribution} max={maxTech} onSelect={(id)=>update('technologyId',filters.technologyId===id?'':id)}/></section><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-semibold text-slate-950">Distribución por perfil</h2><Bars items={profileDistribution} max={maxProfile}/></section></div>
      <div className="grid gap-3 xl:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-semibold text-slate-950">Banco de talento</h2><Donut items={data.talentComposition} center={cards.talentBankActive} caption="personas"/></section><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-950">Certificaciones</h2><BBVAButton variant="table" size="sm" icon={<ChevronRight className="h-3.5 w-3.5"/>} onClick={()=>navigate('/bbva/certifications/metrics')}>Ver métricas</BBVAButton></div><Donut items={data.certificationCoverage} center={`${cards.coveragePercent}%`} caption="cobertura"/></section></div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h2 className="text-sm font-semibold text-slate-950">Personas a revisar</h2><p className="mt-0.5 text-[9.5px] text-slate-500">Prioridades operativas según certificaciones.</p></div><BBVAButton variant="table" size="sm" icon={<ChevronRight className="h-3.5 w-3.5"/>} onClick={()=>navigate('/bbva/certifications/tracking')}>Ver seguimiento</BBVAButton></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] font-semibold uppercase tracking-[0.04em] text-slate-500"><tr><th className="px-3 py-2"><BBVATableSortHeader label="Persona" active={sort==='fullName'} direction={direction} onClick={()=>changeSort('fullName')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Perfil" active={sort==='profile'} direction={direction} onClick={()=>changeSort('profile')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Tecnología" active={sort==='technology'} direction={direction} onClick={()=>changeSort('technology')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="DM" active={sort==='deliveryManager'} direction={direction} onClick={()=>changeSort('deliveryManager')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Alertas" active={sort==='alerts'} direction={direction} onClick={()=>changeSort('alerts')} align="center"/></th><th className="px-3 py-2 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{attentionRows.slice(0,10).map((row)=><tr key={row.collaboratorId} className="hover:bg-slate-50"><td className="px-3 py-2 font-semibold text-slate-900">{row.fullName}</td><td className="px-3 py-2 text-slate-600">{row.profile}</td><td className="px-3 py-2 text-slate-600">{row.technology}</td><td className="px-3 py-2 text-slate-600">{row.deliveryManager}</td><td className="px-3 py-2 text-center font-semibold tabular-nums text-amber-700">{rowAlerts(row)}</td><td className="px-3 py-2 text-right"><BBVAButton variant="table" size="sm" onClick={()=>navigate(`/bbva/collaborators/${row.collaboratorId}/manage`)}>Gestionar</BBVAButton></td></tr>)}</tbody></table></div>{attentionCount===0?<div className="px-4 py-8 text-center text-[10.5px] text-slate-400">No hay personas con atención requerida para los filtros actuales.</div>:null}</section>
    </>}
  </div>;
};
