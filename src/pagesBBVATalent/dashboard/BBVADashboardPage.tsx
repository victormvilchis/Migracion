import React, { useMemo, useState } from 'react';
import { AlertCircle, Award, Briefcase, CalendarRange, Layers3, RefreshCw, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVAChartCard } from '../../componentsBBVATalent/BBVAChartCard';
import { BBVADonutChart, type BBVADonutItem } from '../../componentsBBVATalent/BBVADonutChart';
import { BBVAEmptyState } from '../../componentsBBVATalent/BBVAEmptyState';
import { BBVAFilterSummary, type BBVAFilterSummaryItem } from '../../componentsBBVATalent/BBVAFilterSummary';
import { BBVAHorizontalBars } from '../../componentsBBVATalent/BBVAHorizontalBars';
import { BBVAInsightCard } from '../../componentsBBVATalent/BBVAInsightCard';
import { BBVAOperationalPriorities } from '../../componentsBBVATalent/BBVAOperationalPriorities';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVAMetricsSkeleton } from '../../componentsBBVATalent/BBVAMetricsSkeleton';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useBbvaDashboard } from '../hooks/useDashboard';
import { dashboardMetricDefinitions } from '../lib/dashboardMetricDefinitions';
import { buildDashboardInsights, buildDashboardOperationalPriorities } from '../lib/dashboardInsights';
import type { DashboardFilters, DashboardResponse } from '../types/dashboard';

const initialFilters: DashboardFilters = { technologyId:'', profileId:'', certificationStatus:'', deliveryManager:'', talentType:'', fromDate:'', toDate:'', search:'' };
const certificationStatusLabels: Record<string,string> = { VALID:'Vigentes', EXPIRING:'Próximas a vencer', EXPIRED:'Vencidas', RECERTIFICATION_PENDING:'Recertificación pendiente', PENDING:'Pendientes', FAILED:'Reprobadas' };
const talentTypeLabels: Record<string,string> = { ACADEMY:'Academia', PROSPECT:'Prospectos', FORMER_COLLABORATOR:'Excolaboradores', BBVA_EXIT:'Bajas de BBVA' };
const certificationSliceStatus: Record<string,string> = { 'Vigentes':'VALID', 'Próximas a vencer':'EXPIRING', 'Vencidas':'EXPIRED', 'Recertificación pendiente':'RECERTIFICATION_PENDING', 'Pendientes':'PENDING' };
type AttentionRow = DashboardResponse['attention'][number];
type AttentionSort = 'fullName'|'profile'|'technology'|'deliveryManager'|'alerts';

function rowAlerts(row: AttentionRow){return row.expiring+row.expired+row.pending+row.recertificationPending;}
function alertBreakdown(row: AttentionRow){return `Vencidas: ${row.expired} · Próximas: ${row.expiring} · Pendientes: ${row.pending} · Recertificación: ${row.recertificationPending}`;}

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
  const operationalPriorities=useMemo(()=>data?buildDashboardOperationalPriorities(data).filter((item)=>item.value>0):[],[data]);
  const insights=useMemo(()=>data?buildDashboardInsights(data):[],[data]);
  const attentionByDeliveryManager=useMemo(()=>{const counts=new Map<string,number>();for(const row of attentionRows){const label=row.deliveryManager?.trim()||'Sin DM';counts.set(label,(counts.get(label)??0)+1);}return [...counts.entries()].map(([label,value])=>({key:label,label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'es-MX'));},[attentionRows]);
  const maxTech=Math.max(1,...technologyDistribution.map((i)=>i.value)); const maxProfile=Math.max(1,...profileDistribution.map((i)=>i.value)); const maxAttentionDm=Math.max(1,...attentionByDeliveryManager.map((i)=>i.value));
  const update=(key:keyof DashboardFilters,value:string)=>patch({[key]:value} as Partial<DashboardFilters>);
  const changeSort=(field:AttentionSort)=>{if(sort===field)setDirection((d)=>d==='asc'?'desc':'asc');else{setSort(field);setDirection(field==='alerts'?'desc':'asc');}};
  const metricsUrl=(status?:string)=>{
    const params=new URLSearchParams();
    const effectiveStatus=status??filters.certificationStatus;
    if(filters.profileId)params.set('profileId',filters.profileId);
    if(filters.technologyId)params.set('technologyId',filters.technologyId);
    if(effectiveStatus)params.set('certificationStatus',effectiveStatus);
    if(filters.talentType)params.set('talentType',filters.talentType);
    if(filters.fromDate)params.set('fromDate',filters.fromDate);
    if(filters.toDate)params.set('toDate',filters.toDate);
    if(filters.search)params.set('search',filters.search);
    const queryString=params.toString();
    return `/bbva/certifications/metrics${queryString?`?${queryString}`:''}`;
  };

  const activeFilters = useMemo<BBVAFilterSummaryItem[]>(() => {
    const items: BBVAFilterSummaryItem[] = [];
    if(filters.profileId){const label=data?.filters.profiles.find((item)=>item.id===filters.profileId)?.name??'Perfil';items.push({key:'profileId',label:`Perfil: ${label}`,onRemove:()=>update('profileId','')});}
    if(filters.technologyId){const label=data?.filters.technologies.find((item)=>item.id===filters.technologyId)?.name??'Tecnología';items.push({key:'technologyId',label:`Tecnología: ${label}`,onRemove:()=>update('technologyId','')});}
    if(filters.certificationStatus)items.push({key:'certificationStatus',label:`Estado: ${certificationStatusLabels[filters.certificationStatus]??filters.certificationStatus}`,onRemove:()=>update('certificationStatus','')});
    if(filters.talentType)items.push({key:'talentType',label:`Universo: ${talentTypeLabels[filters.talentType]??filters.talentType}`,onRemove:()=>update('talentType','')});
    return items;
  },[data?.filters.profiles,data?.filters.technologies,filters.certificationStatus,filters.profileId,filters.talentType,filters.technologyId]);

  const certificationDonutItems = useMemo<BBVADonutItem[]>(() => (data?.certificationCoverage??[]).map((item)=>({ ...item, key:certificationSliceStatus[item.label] })),[data?.certificationCoverage]);

  if(query.error)return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;
  return <div className="space-y-3 animate-fade-in">
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/50">
      <div className="mb-2 flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[.06em] text-blue-600 [.bbva-dark_&]:text-cyan-300">Vista operativa</div><div className="text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">Resumen general de talento y certificaciones. Los indicadores responden a los filtros activos.</div></div><BBVAButton variant="secondary" size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${query.isFetching?'animate-spin':''}`}/>} onClick={()=>void query.refetch()}>Actualizar</BBVAButton></div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <BBVASearchableSelect value={filters.profileId??''} onChange={(v)=>update('profileId',v)} options={[{value:'',label:'Todos los perfiles'},...(data?.filters.profiles??[]).map((i)=>({value:i.id,label:i.name}))]} ariaLabel="Perfil"/>
        <BBVASearchableSelect value={filters.technologyId??''} onChange={(v)=>update('technologyId',v)} options={[{value:'',label:'Todas las tecnologías'},...(data?.filters.technologies??[]).map((i)=>({value:i.id,label:i.name}))]} ariaLabel="Tecnología"/>
        <BBVASearchableSelect value={filters.certificationStatus??''} onChange={(v)=>update('certificationStatus',v)} options={[{value:'',label:'Todos los estados de certificación'},{value:'VALID',label:'Vigentes'},{value:'EXPIRING',label:'Próximas a vencer'},{value:'EXPIRED',label:'Vencidas'},{value:'RECERTIFICATION_PENDING',label:'Recertificación pendiente'},{value:'PENDING',label:'Pendientes'},{value:'FAILED',label:'Reprobadas'}]} ariaLabel="Estado de certificación"/>
        <BBVASearchableSelect value={filters.talentType??''} onChange={(v)=>update('talentType',v)} options={[{value:'',label:'Todo el universo'},{value:'ACADEMY',label:'Academia'},{value:'PROSPECT',label:'Prospectos'},{value:'FORMER_COLLABORATOR',label:'Excolaboradores'},{value:'BBVA_EXIT',label:'Bajas de BBVA'}]} ariaLabel="Universo"/>
      </div>
      {activeFilters.length?<div className="mt-2 flex flex-wrap items-center justify-between gap-2"><BBVAFilterSummary items={activeFilters}/><BBVAButton variant="secondary" size="sm" onClick={reset}>Limpiar filtros</BBVAButton></div>:null}
    </section>

    {query.isLoading||!cards?<BBVAMetricsSkeleton cards={6}/>:<>
      {data?.vendorQuarter.targetCode ? <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-3 [.bbva-dark_&]:border-blue-400/20 [.bbva-dark_&]:from-blue-950/30 [.bbva-dark_&]:via-slate-900 [.bbva-dark_&]:to-cyan-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.07em] text-blue-700 [.bbva-dark_&]:text-cyan-300"><CalendarRange className="h-3.5 w-3.5"/>Preparación Vendors · {data.vendorQuarter.targetCode}</div><div className="mt-1 text-[11px] text-slate-600 [.bbva-dark_&]:text-slate-300">Corte de entrada {data.vendorQuarter.targetStartDate ? new Date(`${data.vendorQuarter.targetStartDate}T12:00:00`).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—'}{data.vendorQuarter.daysToTargetStart !== null ? ` · ${data.vendorQuarter.daysToTargetStart === 0 ? 'corte actual' : `${data.vendorQuarter.daysToTargetStart} días para el corte`}` : ''}</div></div><BBVAButton variant="table" size="sm" onClick={()=>navigate('/bbva/certifications/tracking')}>Gestionar preparación</BBVAButton></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-emerald-100 bg-white/80 p-3"><div className="text-[9px] font-semibold uppercase text-slate-400">Listos para el Q</div><div className="mt-1 flex items-center gap-2 text-xl font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4"/>{data.vendorQuarter.readyCollaborators}</div><div className="mt-1 text-[9.5px] text-slate-500">{data.vendorQuarter.readinessPercent}% del universo filtrado</div></div><div className="rounded-xl border border-amber-100 bg-white/80 p-3"><div className="text-[9px] font-semibold uppercase text-slate-400">Pendientes antes del Q</div><div className="mt-1 text-xl font-semibold text-amber-700">{data.vendorQuarter.pendingCollaborators}</div><div className="mt-1 text-[9.5px] text-slate-500">Con al menos una certificación por resolver</div></div><div className="rounded-xl border border-rose-100 bg-white/80 p-3"><div className="text-[9px] font-semibold uppercase text-slate-400">Salida a resolver</div><div className="mt-1 text-xl font-semibold text-rose-700">{data.vendorQuarter.exhaustedAttemptCollaborators}</div><div className="mt-1 text-[9.5px] text-slate-500">Con intentos agotados antes del corte</div></div></div>
      </section> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(175px,1fr))] items-stretch gap-2">
        <BBVAMetricCard label="Colaboradores activos" value={cards.collaboratorsActive} icon={<UsersRound className="h-4 w-4"/>} help={dashboardMetricDefinitions.collaboratorsActive} supportingText="Universo actual" onAction={()=>navigate('/bbva/collaborators')} actionLabel="Ver colaboradores"/>
        <BBVAMetricCard label="Banco de talento" value={cards.talentBankActive} icon={<UserRoundCheck className="h-4 w-4"/>} tone="violet" help={dashboardMetricDefinitions.talentBankActive} supportingText="Entradas activas" onAction={()=>navigate('/bbva/talent-bank')} actionLabel="Ver banco"/>
        <BBVAMetricCard label="Cobertura de certificaciones" value={`${cards.coveragePercent}%`} icon={<Award className="h-4 w-4"/>} tone="emerald" help={dashboardMetricDefinitions.coveragePercent} supportingText={`${cards.certificationsApplicable} aplicables`} onAction={()=>navigate(metricsUrl())} actionLabel="Ver métricas"/>
        <BBVAMetricCard label="Atención requerida" value={attentionCount} icon={<AlertCircle className="h-4 w-4"/>} tone={attentionCount?'amber':'emerald'} help={dashboardMetricDefinitions.attentionRequired} supportingText={attentionCount?'Personas con elementos por revisar':'Sin pendientes en este contexto'} onAction={()=>navigate('/bbva/certifications/tracking')} actionLabel="Ver seguimiento"/>
        <BBVAMetricCard label="Tecnologías representadas" value={representedTechnologies} icon={<Layers3 className="h-4 w-4"/>} tone="blue" help={dashboardMetricDefinitions.technologiesRepresented} supportingText="Con al menos una persona"/>
        <BBVAMetricCard label="Datos por completar" value={cards.dataQualityPending} icon={<Briefcase className="h-4 w-4"/>} tone={cards.dataQualityPending?'amber':'emerald'} help={dashboardMetricDefinitions.dataQualityPending} supportingText={cards.dataQualityPending?'Requieren completar información':'Información completa en el universo actual'}/>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
        <BBVAChartCard title="Prioridades operativas" description="Estados que requieren revisión según las reglas actuales de certificación. El orden no es un score de riesgo." action={<BBVAButton variant="table" size="sm" onClick={()=>navigate('/bbva/certifications/tracking')}>Abrir seguimiento</BBVAButton>}>
          {operationalPriorities.length?<BBVAOperationalPriorities items={operationalPriorities} onSelect={(status)=>navigate(metricsUrl(status))}/>:<BBVAEmptyState compact title="Sin prioridades activas" description="No existen certificaciones vencidas, próximas, pendientes o en recertificación para los filtros actuales."/>}
        </BBVAChartCard>
        <BBVAChartCard title="Insights del contexto actual" description="Lecturas determinísticas construidas únicamente con la información ya disponible en el panel.">
          <div className="grid gap-2 md:grid-cols-2">{insights.slice(0,4).map((insight)=><BBVAInsightCard key={insight.id} eyebrow={insight.eyebrow} title={insight.title} description={insight.description} tone={insight.tone} actionLabel={insight.actionLabel} onAction={insight.actionStatus?()=>navigate(metricsUrl(insight.actionStatus)):undefined}/>)}</div>
        </BBVAChartCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <BBVAChartCard title="Distribución por tecnología" description="Colaboradores del universo actual. Selecciona una tecnología para filtrar el panel."><BBVAHorizontalBars items={technologyDistribution} max={maxTech} selectedKey={filters.technologyId??''} onSelect={(id)=>update('technologyId',filters.technologyId===id?'':id)}/></BBVAChartCard>
        <BBVAChartCard title="Distribución por perfil" description="Distribución de todos los colaboradores incluidos por los filtros actuales."><BBVAHorizontalBars items={profileDistribution} max={maxProfile}/></BBVAChartCard>
        <BBVAChartCard title="Atención por Delivery Manager" description="Personas con al menos una certificación que requiere revisión, agrupadas por DM."><BBVAHorizontalBars items={attentionByDeliveryManager} max={maxAttentionDm} emptyTitle="Sin atención por Delivery Manager" emptyDescription="No existen personas con elementos de certificación por revisar en este contexto."/></BBVAChartCard>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <BBVAChartCard title="Banco de talento" description="Composición actual por tipo de entrada activa."><BBVADonutChart items={data.talentComposition} center={cards.talentBankActive} caption="personas" size="sm" emptyTitle="Banco de talento sin registros" emptyDescription="No existen entradas activas para los filtros actuales."/></BBVAChartCard>
        <BBVAChartCard title="Certificaciones" description="Distribución de las certificaciones aplicables por estado actual." action={<BBVAButton variant="table" size="sm" onClick={()=>navigate(metricsUrl())}>Ver métricas</BBVAButton>}><BBVADonutChart items={certificationDonutItems} center={`${cards.coveragePercent}%`} caption="cobertura" size="sm" selectedKey={filters.certificationStatus??''} onSelect={(item)=>item.key&&navigate(metricsUrl(item.key))} emptyTitle="Sin certificaciones aplicables" emptyDescription="No existen certificaciones aplicables para el universo actual."/></BBVAChartCard>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75"><div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 [.bbva-dark_&]:border-slate-800"><div><h2 className="text-sm font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">Personas a revisar</h2><p className="mt-0.5 text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">Personas con al menos una certificación vencida, próxima, pendiente o en recertificación.</p></div><BBVAButton variant="table" size="sm" onClick={()=>navigate('/bbva/certifications/tracking')}>Ver seguimiento</BBVAButton></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:bg-slate-950/40"><tr><th className="px-3 py-2"><BBVATableSortHeader label="Persona" active={sort==='fullName'} direction={direction} onClick={()=>changeSort('fullName')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Perfil" active={sort==='profile'} direction={direction} onClick={()=>changeSort('profile')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Tecnología" active={sort==='technology'} direction={direction} onClick={()=>changeSort('technology')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="DM" active={sort==='deliveryManager'} direction={direction} onClick={()=>changeSort('deliveryManager')}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Alertas" active={sort==='alerts'} direction={direction} onClick={()=>changeSort('alerts')} align="center"/></th><th className="px-3 py-2 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">{attentionRows.slice(0,10).map((row)=><tr key={row.collaboratorId} className="hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/50"><td className="px-3 py-2 font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{row.fullName}</td><td className="px-3 py-2 text-slate-600 [.bbva-dark_&]:text-slate-300">{row.profile}</td><td className="px-3 py-2 text-slate-600 [.bbva-dark_&]:text-slate-300">{row.technology}</td><td className="px-3 py-2 text-slate-600 [.bbva-dark_&]:text-slate-300">{row.deliveryManager}</td><td className="px-3 py-2 text-center"><span className="inline-flex min-w-7 justify-center rounded-full bg-amber-50 px-2 py-0.5 font-semibold tabular-nums text-amber-700 [.bbva-dark_&]:bg-amber-400/10 [.bbva-dark_&]:text-amber-300" title={alertBreakdown(row)} aria-label={alertBreakdown(row)}>{rowAlerts(row)}</span></td><td className="px-3 py-2 text-right"><BBVAButton variant="table" size="sm" onClick={()=>navigate(`/bbva/collaborators/${row.collaboratorId}/certifications`, { state: { returnTo: '/bbva/dashboard' } })}>Revisar</BBVAButton></td></tr>)}</tbody></table></div>{attentionCount===0?<BBVAEmptyState title="No hay personas con atención requerida" description="Con los filtros actuales no existen colaboradores con certificaciones vencidas, próximas a vencer, pendientes o en recertificación."/>:null}</section>
    </>}
  </div>;
};
