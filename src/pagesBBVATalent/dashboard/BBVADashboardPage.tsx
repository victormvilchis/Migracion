import React, { useMemo, useState } from 'react';
import { AlertCircle, Award, RefreshCw, ShieldCheck, UserRoundCheck, UsersRound, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAActivityFeed } from '../../componentsBBVATalent/BBVAActivityFeed';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVAChartCard } from '../../componentsBBVATalent/BBVAChartCard';
import { BBVAEmptyState } from '../../componentsBBVATalent/BBVAEmptyState';
import { BBVAFilterBar } from '../../componentsBBVATalent/BBVAFilterBar';
import { BBVAHistoricalMetricPanel } from '../../componentsBBVATalent/BBVAHistoricalMetricPanel';
import { BBVAHorizontalBars } from '../../componentsBBVATalent/BBVAHorizontalBars';
import { BBVAInsightCard } from '../../componentsBBVATalent/BBVAInsightCard';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVAPagination } from '../../componentsBBVATalent/BBVAPagination';
import { BBVAMetricsSkeleton } from '../../componentsBBVATalent/BBVAMetricsSkeleton';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVAMultiSelect } from '../../componentsBBVATalent/BBVAMultiSelect';
import { BBVAStructureFilter } from '../../componentsBBVATalent/BBVAStructureFilter';
import { useBBVAListMemory } from '../hooks/useBBVAListMemory';
import { useStructureOptions } from '../hooks/useStructureCatalog';
import { useBbvaDashboard } from '../hooks/useDashboard';
import { dashboardMetricDefinitions } from '../lib/dashboardMetricDefinitions';
import { comparisonText } from '../lib/dashboardHistory';
import { decodeMultiValue, encodeMultiValue, toggleMultiValue } from '../lib/multiValueFilter';
import { formatPeriodCode, periodOptions } from '../lib/periodOptions';
import { displayPersonName, displayRoleName, displayStructure, sentenceCaseData, upperDisplay, displayCertificationName } from '../lib/bbvaDisplayFormat';
import type { DashboardFilters, DashboardHistoricalMetricKey, DashboardRecommendation } from '../types/dashboard';

const initialFilters: DashboardFilters = { technologyId:'',profileId:'',technologyProfile:'',certificationId:'',bbvaStructureLevel2:'',bbvaStructureLevel3:'',quarterCode:'',certificationStatus:'',deliveryManager:'',talentType:'',fromDate:'',toDate:'',search:'',historyDays:'90',comparisonDays:'7',activityDays:'30',activityLimit:'12' };
const statusOptions=[{value:'',label:'Todos los estados de certificación'},{value:'VALID',label:'Vigentes'},{value:'EXPIRING',label:'Vencen en el periodo'},{value:'EXPIRED',label:'Vencidas antes del periodo'},{value:'RECERTIFICATION_PENDING',label:'Recertificación pendiente'},{value:'PENDING',label:'Pendientes'},{value:'FAILED',label:'Reprobadas'}];
const universeOptions=[{value:'',label:'Todo el universo'},{value:'ACADEMY',label:'Academia'},{value:'PROSPECT',label:'Prospectos'},{value:'FORMER_COLLABORATOR',label:'Excolaboradores'},{value:'BBVA_EXIT',label:'Bajas de BBVA'}];
const recommendationTone=(priority:DashboardRecommendation['priority'])=>priority==='CRITICAL'?'rose':priority==='ATTENTION'?'orange':priority==='PREVENTIVE'?'amber':'blue';

export const BBVADashboardPage:React.FC=()=>{
  const navigate=useNavigate();
  const structuresQuery=useStructureOptions();
  const {state:filters,patch}=useBBVAListMemory<DashboardFilters>('dashboard-filters',initialFilters);
  const [historyMetric,setHistoryMetric]=useState<DashboardHistoricalMetricKey>('coveragePercent');
  const [expirationPage,setExpirationPage]=useState(0);const [expirationSize,setExpirationSize]=useState(10);
  const [attentionPage,setAttentionPage]=useState(0);const [attentionSize,setAttentionSize]=useState(10);
  const [dismissedRecommendationIds,setDismissedRecommendationIds]=useState<string[]>([]);
  const [recommendationsPaused,setRecommendationsPaused]=useState(false);
  const recommendationScrollerRef=React.useRef<HTMLDivElement|null>(null);
  const query=useBbvaDashboard(filters); const data=query.data; const cards=data?.cards;
  const attentionRows=useMemo(()=>data?.attention.filter((row)=>row.critical+row.expired+row.recertificationPending+row.expiring+row.pending>0)??[],[data?.attention]);
  const expirationRows=data?.quarterExpirations??[];
  const safeExpirationPage=Math.min(expirationPage,Math.max(0,Math.ceil(expirationRows.length/expirationSize)-1));
  const safeAttentionPage=Math.min(attentionPage,Math.max(0,Math.ceil(attentionRows.length/attentionSize)-1));
  const update=(key:keyof DashboardFilters,value:string)=>patch({[key]:value} as Partial<DashboardFilters>);
  const quarterOptions=useMemo(()=>periodOptions(data?.vendorQuarter.quarters??[],data?.vendorQuarter.currentCode,data?.vendorQuarter.referenceDate),[data?.vendorQuarter.currentCode,data?.vendorQuarter.quarters,data?.vendorQuarter.referenceDate]);
  const selectedTechnologies=useMemo(()=>decodeMultiValue(filters.technologyId),[filters.technologyId]);
  React.useEffect(()=>{if(data?.vendorQuarter.selectedCode&&!filters.quarterCode)patch({quarterCode:data.vendorQuarter.selectedCode});},[data?.vendorQuarter.selectedCode,filters.quarterCode,patch]);

  const filteredContext=Boolean(filters.technologyId||filters.certificationStatus||filters.talentType||filters.bbvaStructureLevel2||filters.bbvaStructureLevel3);
  const technologyBars=useMemo(()=>(data?.technologyDistribution??[]).map((item)=>({key:item.technologyId??'',label:sentenceCaseData(item.label),value:item.value})),[data?.technologyDistribution]);
  const maxTech=Math.max(1,...technologyBars.map((item)=>item.value));
  const metricsUrl=(status?:string)=>{const params=new URLSearchParams();const effective=status??filters.certificationStatus;if(filters.technologyId)params.set('technologyId',filters.technologyId);if(effective)params.set('certificationStatus',effective);if(filters.talentType)params.set('talentType',filters.talentType);if(filters.bbvaStructureLevel2)params.set('bbvaStructureLevel2',filters.bbvaStructureLevel2);if(filters.bbvaStructureLevel3)params.set('bbvaStructureLevel3',filters.bbvaStructureLevel3);if(filters.quarterCode)params.set('quarterCode',filters.quarterCode);const q=params.toString();return `/bbva/certifications/metrics${q?`?${q}`:''}`;};
  const recommendationUrl=(item:DashboardRecommendation)=>item.target==='COLLABORATORS'?'/bbva/collaborators':item.target==='TALENT_BANK'?'/bbva/talent-bank':item.target==='REPORTS'?'/bbva/reports/certifications':item.target==='METRICS'?metricsUrl(item.certificationStatus??undefined):item.id==='critical-two-attempts'?'/bbva/certifications/tracking?critical=OPEN':item.certificationStatus?`/bbva/certifications/tracking?certificationStatus=${encodeURIComponent(item.certificationStatus)}`:'/bbva/certifications/tracking';
  const visibleRecommendations=useMemo(()=>(data?.recommendations??[]).filter((item)=>!dismissedRecommendationIds.includes(item.id)),[data?.recommendations,dismissedRecommendationIds]);
  const recommendationContextKey=[filters.technologyId,filters.certificationStatus,filters.talentType,filters.bbvaStructureLevel2,filters.bbvaStructureLevel3,filters.quarterCode].join('|');
  React.useEffect(()=>{setDismissedRecommendationIds([]);},[recommendationContextKey]);
  const moveRecommendations=(direction:-1|1)=>{const node=recommendationScrollerRef.current;if(!node)return;const card=node.querySelector<HTMLElement>('[data-recommendation-card]');const step=(card?.offsetWidth??320)+8;node.scrollBy({left:direction*step,behavior:'smooth'});};
  React.useEffect(()=>{if(recommendationsPaused||visibleRecommendations.length<3)return;const timer=window.setInterval(()=>{const node=recommendationScrollerRef.current;if(!node)return;const remaining=node.scrollWidth-node.clientWidth-node.scrollLeft;if(remaining<24)node.scrollTo({left:0,behavior:'smooth'});else moveRecommendations(1);},6500);return()=>window.clearInterval(timer);},[recommendationsPaused,visibleRecommendations.length]);

  if(query.error)return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;
  return <div className="space-y-3 animate-fade-in">
    <BBVAFilterBar actions={<><BBVAButton variant="secondary" size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${query.isFetching?'animate-spin':''}`}/>} onClick={()=>void query.refetch()}>Actualizar</BBVAButton>{(filters.technologyId||filters.certificationStatus||filters.talentType||filters.bbvaStructureLevel2||filters.bbvaStructureLevel3)?<BBVAButton variant="secondary" size="sm" onClick={()=>patch({technologyId:'',certificationStatus:'',talentType:'',bbvaStructureLevel2:'',bbvaStructureLevel3:''})}>Limpiar</BBVAButton>:null}</>}>
      <BBVAMultiSelect className="w-full sm:w-[210px]" values={selectedTechnologies} onChange={(values)=>update('technologyId',encodeMultiValue(values))} options={(data?.filters.technologies??[]).map((item)=>({value:item.id,label:sentenceCaseData(item.name)}))} placeholder="Todas las tecnologías" selectedLabel="tecnologías" ariaLabel="Tecnología"/>
      <div className="w-full sm:w-[190px]"><BBVASearchableSelect value={filters.quarterCode || data?.vendorQuarter.selectedCode || data?.vendorQuarter.currentCode || ''} onChange={(v)=>update('quarterCode',v)} options={quarterOptions} ariaLabel="Periodo" searchPlaceholder="Buscar periodo" emptyMessage="No hay periodos configurados."/></div>
      <div className="w-full sm:w-[180px]"><BBVASearchableSelect value={filters.talentType} onChange={(v)=>update('talentType',v)} options={universeOptions} ariaLabel="Universo"/></div>
      <BBVAStructureFilter className="w-full sm:w-[220px]" items={structuresQuery.data?.items??[]} level2={filters.bbvaStructureLevel2} level3={filters.bbvaStructureLevel3} onChange={(next)=>patch({bbvaStructureLevel2:next.level2,bbvaStructureLevel3:next.level3})} ariaLabel="Estructura BBVA"/>
      <div className="w-full sm:w-[220px]"><BBVASearchableSelect value={filters.certificationStatus} onChange={(v)=>update('certificationStatus',v)} options={statusOptions} ariaLabel="Estado de certificación"/></div>
    </BBVAFilterBar>

    {query.isLoading||!cards||!data?<BBVAMetricsSkeleton cards={5}/>:<>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-2">
        <BBVAMetricCard label="Colaboradores activos" value={cards.collaboratorsActive} icon={<UsersRound className="h-4 w-4"/>} help={dashboardMetricDefinitions.collaboratorsActive} supportingText="Universo actual" trendText={comparisonText(data.history.comparisons.collaboratorsActive)} onAction={()=>navigate('/bbva/collaborators')} actionLabel="Ver colaboradores"/>
        <BBVAMetricCard label={`Cobertura · ${formatPeriodCode(data.vendorQuarter.selectedCode)}`} value={`${cards.coveragePercent}%`} icon={<ShieldCheck className="h-4 w-4"/>} tone="emerald" help={dashboardMetricDefinitions.coveragePercent} supportingText={data.quarterExpirations.length ? `${data.quarterExpirations.length} vencen en el periodo · ${cards.certificationsApplicable} aplicables` : 'Sin vencimientos en el periodo'} trendText={comparisonText(data.history.comparisons.coveragePercent)} onAction={()=>navigate(metricsUrl())} actionLabel="Ver métricas"/>
        <BBVAMetricCard label={`Vencen en ${formatPeriodCode(data.vendorQuarter.selectedCode)}`} value={cards.expiring} icon={<Award className="h-4 w-4"/>} tone={cards.expiring?'amber':'emerald'} supportingText={`${data.quarterExpirations.length} registros con fecha en el periodo`} trendText={comparisonText(data.history.comparisons.expiring)} onAction={()=>navigate(metricsUrl('EXPIRING'))} actionLabel="Revisar"/>
        <BBVAMetricCard label="Críticos 2/2" value={data.vendorQuarter.exhaustedAttemptCollaborators} icon={<AlertCircle className="h-4 w-4"/>} tone={data.vendorQuarter.exhaustedAttemptCollaborators?'rose':'emerald'} supportingText={data.vendorQuarter.exhaustedAttemptCollaborators?'Resolver baja / becario':'Sin casos críticos'} trendText={comparisonText(data.history.comparisons.vendorExitRequired)} onAction={()=>navigate('/bbva/certifications/tracking?critical=OPEN')} actionLabel="Resolver"/>
        <BBVAMetricCard label="Banco de talento" value={cards.talentBankActive} icon={<UserRoundCheck className="h-4 w-4"/>} tone="violet" supportingText={`${cards.vendorReadyPercent}% preparados para el periodo`} trendText={comparisonText(data.history.comparisons.talentBankActive)} onAction={()=>navigate('/bbva/talent-bank')} actionLabel="Ver banco"/>
      </div>

      <section className="bbva-live-panel overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        {data.quarterExpirations.length?<div className="max-h-[290px] overflow-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead className="sticky top-0 bg-slate-50 text-[8.5px] font-semibold uppercase text-slate-500"><tr><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Certificación</th><th className="px-3 py-2">Vencimiento</th><th className="px-3 py-2">Estado en periodo</th><th className="px-3 py-2 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{expirationRows.slice(safeExpirationPage*expirationSize,safeExpirationPage*expirationSize+expirationSize).map((item)=><tr key={`${item.personId}-${item.certificationId}-${item.expirationDate}`} className="transition hover:bg-blue-50/30"><td className="px-3 py-2 font-semibold text-slate-900">{displayPersonName(item.fullName)}</td><td className="px-3 py-2 text-slate-700">{displayCertificationName(item.certificationName)}</td><td className="px-3 py-2 tabular-nums text-slate-700">{item.expirationDate}</td><td className="px-3 py-2"><span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8.5px] font-semibold text-amber-700">Vence en el periodo</span></td><td className="px-3 py-2 text-right">{item.collaboratorId?<BBVAButton variant="table" size="sm" onClick={()=>navigate(`/bbva/collaborators/${item.collaboratorId}/certifications`)}>Revisar</BBVAButton>:null}</td></tr>)}</tbody></table><BBVAPagination total={expirationRows.length} page={safeExpirationPage} size={expirationSize} onPageChange={setExpirationPage} onSizeChange={(next)=>{setExpirationSize(next);setExpirationPage(0);}}/></div>:<BBVAEmptyState compact title={`Sin vencimientos en ${formatPeriodCode(data.vendorQuarter.selectedCode, 'el periodo')}`} description="No existen certificaciones con fecha de vencimiento dentro del periodo seleccionado para este universo."/>}
      </section>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
        <BBVAChartCard
          title="Recomendaciones del contexto actual"
          description="Reglas determinísticas calculadas por backend. Se muestran todas las recomendaciones disponibles para el contexto actual."
          action={visibleRecommendations.length>2?<div className="flex items-center gap-1"><button type="button" onClick={()=>moveRecommendations(-1)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-700" aria-label="Recomendaciones anteriores"><ChevronLeft className="h-3.5 w-3.5"/></button><button type="button" onClick={()=>moveRecommendations(1)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-700" aria-label="Siguientes recomendaciones"><ChevronRight className="h-3.5 w-3.5"/></button></div>:undefined}
        >
          {visibleRecommendations.length ? <div
            ref={recommendationScrollerRef}
            onMouseEnter={()=>setRecommendationsPaused(true)}
            onMouseLeave={()=>setRecommendationsPaused(false)}
            onFocusCapture={()=>setRecommendationsPaused(true)}
            onBlurCapture={()=>setRecommendationsPaused(false)}
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >{visibleRecommendations.map((item)=><div key={item.id} data-recommendation-card className="min-w-[calc(100%-8px)] snap-start sm:min-w-[300px] xl:min-w-[calc(50%-4px)]"><BBVAInsightCard eyebrow={item.eyebrow} title={item.title} description={item.description} tone={recommendationTone(item.priority)} actionLabel="Poner en marcha" onAction={()=>navigate(recommendationUrl(item))} onDismiss={()=>setDismissedRecommendationIds((current)=>current.includes(item.id)?current:[...current,item.id])}/></div>)}</div>:<div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[9.5px] text-slate-500">No hay más recomendaciones pendientes para este contexto.</div>}
        </BBVAChartCard>
        <BBVAChartCard title="Distribución por tecnología" description={`Colaboradores de ${formatPeriodCode(data.vendorQuarter.selectedCode, 'periodo seleccionado')}. Selecciona una tecnología para actualizar el panel.`}><BBVAHorizontalBars items={technologyBars} max={maxTech} selectedKey={selectedTechnologies.length===1?selectedTechnologies[0]:''} onSelect={(id)=>update('technologyId',toggleMultiValue(filters.technologyId,id))}/></BBVAChartCard>
      </div>

      {!filteredContext?<section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[.05em] text-slate-400">Histórico · {formatPeriodCode(data.vendorQuarter.selectedCode)}</div><div className="mt-0.5 text-[9.5px] text-slate-500">Las comparaciones son contra snapshots reales del mismo periodo.</div></div><div className="grid min-w-[330px] grid-cols-2 gap-2"><BBVASearchableSelect value={filters.historyDays??'90'} onChange={(v)=>update('historyDays',v)} options={[{value:'30',label:'Histórico · 30 días'},{value:'90',label:'Histórico · 90 días'},{value:'180',label:'Histórico · 180 días'},{value:'365',label:'Histórico · 365 días'}]}/><BBVASearchableSelect value={filters.comparisonDays??'7'} onChange={(v)=>update('comparisonDays',v)} options={[{value:'1',label:'Comparar · 1 día'},{value:'7',label:'Comparar · 7 días'},{value:'30',label:'Comparar · 30 días'},{value:'90',label:'Comparar · 90 días'}]}/></div></div><div className="grid gap-3 xl:grid-cols-[1.2fr_.8fr]"><BBVAHistoricalMetricPanel history={data.history} metric={historyMetric} onMetricChange={setHistoryMetric}/><BBVAChartCard title="Actividad reciente" description="Movimientos reales registrados en el sistema."><BBVAActivityFeed items={data.activity} onSelect={(item)=>item.collaboratorId?navigate(`/bbva/collaborators/${item.collaboratorId}`):item.talentId?navigate(`/bbva/talent-bank/${item.talentId}`):undefined}/></BBVAChartCard></div></section>:null}

      <div className="flex justify-end"><BBVAButton variant="table" size="sm" onClick={()=>navigate('/bbva/certifications/tracking')}>Ver seguimiento</BBVAButton></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] font-semibold uppercase text-slate-500"><tr><th className="px-3 py-2">Persona</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2">Estructura nivel 2</th><th className="px-3 py-2">Estructura nivel 3</th><th className="px-3 py-2">DM</th><th className="px-3 py-2 text-center">Alertas</th><th className="px-3 py-2 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{attentionRows.slice(safeAttentionPage*attentionSize,safeAttentionPage*attentionSize+attentionSize).map((row)=><tr key={row.collaboratorId} className="hover:bg-slate-50"><td className="px-3 py-2"><div className="font-semibold text-slate-900">{displayPersonName(row.fullName)}</div><div className="text-[9px] text-slate-400">{displayRoleName(row.profile)}</div></td><td className="px-3 py-2">{upperDisplay(row.technology)}</td><td className="px-3 py-2">{displayStructure(row.bbvaStructureLevel2)}</td><td className="px-3 py-2">{displayStructure(row.bbvaStructureLevel3)}</td><td className="px-3 py-2">{displayPersonName(row.deliveryManager)}</td><td className="px-3 py-2 text-center"><span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">{row.critical+row.expired+row.recertificationPending+row.expiring+row.pending}</span></td><td className="px-3 py-2 text-right"><BBVAButton variant="table" size="sm" onClick={()=>navigate(`/bbva/collaborators/${row.collaboratorId}/certifications`)}>Revisar</BBVAButton></td></tr>)}</tbody></table><BBVAPagination total={attentionRows.length} page={safeAttentionPage} size={attentionSize} onPageChange={setAttentionPage} onSizeChange={(next)=>{setAttentionSize(next);setAttentionPage(0);}}/></div></section>
    </>}
  </div>;
};
