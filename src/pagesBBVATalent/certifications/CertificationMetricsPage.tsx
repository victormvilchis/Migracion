import React, { useMemo, useState } from 'react';
import { AlertTriangle, Award, RefreshCw, Search, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVAChartCard } from '../../componentsBBVATalent/BBVAChartCard';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { BBVADonutChart, type BBVADonutItem } from '../../componentsBBVATalent/BBVADonutChart';
import { BBVAEmptyState } from '../../componentsBBVATalent/BBVAEmptyState';
import { BBVAFilterSummary, type BBVAFilterSummaryItem } from '../../componentsBBVATalent/BBVAFilterSummary';
import { BBVAHorizontalBars } from '../../componentsBBVATalent/BBVAHorizontalBars';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVAMetricsSkeleton } from '../../componentsBBVATalent/BBVAMetricsSkeleton';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { BBVATableSortHeader } from '../../componentsBBVATalent/BBVATableSortHeader';
import { useBBVAListQueryState } from '../hooks/useBBVAListQueryState';
import { useBbvaDashboard } from '../hooks/useDashboard';
import { dashboardMetricDefinitions } from '../lib/dashboardMetricDefinitions';

interface MetricsFilterState extends Record<string,string> {
  technologyId: string;
  profileId: string;
  deliveryManager: string;
  certificationStatus: string;
  talentType: string;
  fromDate: string;
  toDate: string;
  search: string;
}

const initialFilters: MetricsFilterState = { technologyId:'', profileId:'', deliveryManager:'', certificationStatus:'', talentType:'', fromDate:'', toDate:'', search:'' };
const certificationStatusLabels: Record<string,string> = { VALID:'Vigentes', EXPIRING:'Próximas a vencer', EXPIRED:'Vencidas', RECERTIFICATION_PENDING:'Recertificación pendiente', PENDING:'Pendientes', FAILED:'Reprobadas' };
const talentTypeLabels: Record<string,string> = { ACADEMY:'Academia', PROSPECT:'Prospectos', FORMER_COLLABORATOR:'Excolaboradores', BBVA_EXIT:'Bajas de BBVA' };
const certificationSliceStatus: Record<string,string> = { 'Vigentes':'VALID', 'Próximas a vencer':'EXPIRING', 'Vencidas':'EXPIRED', 'Recertificación pendiente':'RECERTIFICATION_PENDING', 'Pendientes':'PENDING' };

export const CertificationMetricsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state: filters, update: updateFilters, reset } = useBBVAListQueryState(initialFilters);
  const [sort, setSort] = useState<'priority' | 'name' | 'technology' | 'valid' | 'expiring' | 'expired' | 'pending'>('priority');
  const [direction,setDirection]=useState<'asc'|'desc'>('desc');
  const query = useBbvaDashboard(filters);
  const data = query.data;

  const attention = useMemo(() => {
    const rows = [...(data?.attention ?? [])];
    const text=(a:string,b:string)=>a.localeCompare(b,'es-MX',{sensitivity:'base',numeric:true});
    const cmp=(a:(typeof rows)[number],b:(typeof rows)[number])=> sort==='name'?text(a.fullName,b.fullName):sort==='technology'?text(a.technology,b.technology):sort==='valid'?a.valid-b.valid:sort==='expiring'?a.expiring-b.expiring:sort==='expired'?(a.expired+a.recertificationPending)-(b.expired+b.recertificationPending):sort==='pending'?a.pending-b.pending:((a.expired+a.recertificationPending)*100+a.expiring*10+a.pending)-((b.expired+b.recertificationPending)*100+b.expiring*10+b.pending);
    return rows.sort((a,b)=>(direction==='asc'?1:-1)*cmp(a,b));
  }, [data?.attention, sort, direction]);

  const update = (key: keyof MetricsFilterState, value: string) => updateFilters({ [key]: value } as Partial<MetricsFilterState>);
  const toggleCertificationStatus=(status:string)=>update('certificationStatus',filters.certificationStatus===status?'':status);

  const activeFilters = useMemo<BBVAFilterSummaryItem[]>(() => {
    const items: BBVAFilterSummaryItem[]=[];
    if(filters.search)items.push({key:'search',label:`Búsqueda: ${filters.search}`,onRemove:()=>update('search','')});
    if(filters.profileId){const label=data?.filters.profiles.find((item)=>item.id===filters.profileId)?.name??'Perfil';items.push({key:'profileId',label:`Perfil: ${label}`,onRemove:()=>update('profileId','')});}
    if(filters.technologyId){const label=data?.filters.technologies.find((item)=>item.id===filters.technologyId)?.name??'Tecnología';items.push({key:'technologyId',label:`Tecnología: ${label}`,onRemove:()=>update('technologyId','')});}
    if(filters.certificationStatus)items.push({key:'certificationStatus',label:`Estado: ${certificationStatusLabels[filters.certificationStatus]??filters.certificationStatus}`,onRemove:()=>update('certificationStatus','')});
    if(filters.talentType)items.push({key:'talentType',label:`Banco: ${talentTypeLabels[filters.talentType]??filters.talentType}`,onRemove:()=>update('talentType','')});
    if(filters.fromDate)items.push({key:'fromDate',label:`Desde: ${filters.fromDate}`,onRemove:()=>update('fromDate','')});
    if(filters.toDate)items.push({key:'toDate',label:`Hasta: ${filters.toDate}`,onRemove:()=>update('toDate','')});
    return items;
  },[data?.filters.profiles,data?.filters.technologies,filters.certificationStatus,filters.fromDate,filters.profileId,filters.search,filters.talentType,filters.technologyId,filters.toDate]);

  const certificationDonutItems = useMemo<BBVADonutItem[]>(() => (data?.certificationCoverage??[]).map((item)=>({ ...item, key:certificationSliceStatus[item.label] })),[data?.certificationCoverage]);
  const collaboratorFocusItems = useMemo<BBVADonutItem[]>(() => (data?.collaboratorFocus??[]).map((item)=>({ ...item, key:item.label })),[data?.collaboratorFocus]);
  const technologyBars = useMemo(()=>(data?.technologyDistribution??[]).map((item)=>({key:item.technologyId??'',label:item.label,value:item.value})),[data?.technologyDistribution]);

  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  const cards = data?.cards;
  const maxMonth = Math.max(1, ...(data?.expirationByMonth ?? []).map((item) => item.value));
  const maxTech = Math.max(1, ...technologyBars.map((item) => item.value));

  return (
    <div className="space-y-3 animate-fade-in">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/50">
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_210px_210px_190px_170px_170px]">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Buscar persona, perfil o tecnología" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[10.5px] outline-none focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100" /></div>
          <BBVASearchableSelect value={filters.profileId} onChange={(value) => update('profileId', value)} options={[{ value: '', label: 'Todos los perfiles' }, ...(data?.filters.profiles ?? []).map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Perfil" />
          <BBVASearchableSelect value={filters.technologyId} onChange={(value) => update('technologyId', value)} options={[{ value: '', label: 'Todas las tecnologías' }, ...(data?.filters.technologies ?? []).map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Tecnología" />
          <BBVASearchableSelect value={filters.certificationStatus} onChange={(value) => update('certificationStatus', value)} options={[{ value: '', label: 'Todos los estados de certificación' }, { value: 'VALID', label: 'Vigentes' }, { value: 'EXPIRING', label: 'Próximas a vencer' }, { value: 'EXPIRED', label: 'Vencidas' }, { value: 'RECERTIFICATION_PENDING', label: 'Recertificación pendiente' }, { value: 'PENDING', label: 'Pendientes' }, { value: 'FAILED', label: 'Reprobadas' }]} ariaLabel="Estado de certificación" />
          <BBVASearchableSelect value={filters.talentType} onChange={(value) => update('talentType', value)} options={[{ value: '', label: 'Todo Banco de talento' }, { value: 'ACADEMY', label: 'Academia' }, { value: 'PROSPECT', label: 'Prospectos' }, { value: 'FORMER_COLLABORATOR', label: 'Excolaboradores' }, { value: 'BBVA_EXIT', label: 'Bajas de BBVA' }]} ariaLabel="Tipo de Banco de talento" />
          <BBVADatePicker value={filters.fromDate} onChange={(value) => update('fromDate', value)} ariaLabel="Desde" placeholder="Desde" />
          <BBVADatePicker value={filters.toDate} onChange={(value) => update('toDate', value)} ariaLabel="Hasta" placeholder="Hasta" />
        </div>
        {activeFilters.length?<div className="mt-2 flex flex-wrap items-center justify-between gap-2"><BBVAFilterSummary items={activeFilters}/><BBVAButton variant="secondary" size="sm" onClick={reset}>Limpiar filtros</BBVAButton></div>:null}
      </section>

      {query.isLoading || !cards ? <BBVAMetricsSkeleton cards={8}/> : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] items-stretch gap-2">
            <BBVAMetricCard label="Colaboradores activos" value={cards.collaboratorsActive} supportingText="Universo actual" icon={<UsersRound className="h-4 w-4" />} help={dashboardMetricDefinitions.collaboratorsActive} onAction={() => navigate('/bbva/collaborators')} actionLabel="Ver colaboradores" />
            <BBVAMetricCard label="Banco de talento" value={cards.talentBankActive} supportingText="Entradas activas" icon={<UserRoundCheck className="h-4 w-4" />} tone="violet" help={dashboardMetricDefinitions.talentBankActive} onAction={() => navigate('/bbva/talent-bank')} actionLabel="Ver banco" />
            <BBVAMetricCard label="Certificaciones aplicables" value={cards.certificationsApplicable} supportingText="Base de cálculo actual" icon={<Award className="h-4 w-4" />} tone="emerald" help={dashboardMetricDefinitions.certificationsApplicable} />
            <BBVAMetricCard label="Cobertura" value={`${cards.coveragePercent}%`} supportingText="Vigentes + próximas" icon={<ShieldCheck className="h-4 w-4" />} tone="emerald" help={dashboardMetricDefinitions.coveragePercent} />
            <BBVAMetricCard label="Próximas a vencer" value={cards.expiring} icon={<AlertTriangle className="h-4 w-4" />} tone="amber" help={dashboardMetricDefinitions.expiring} active={filters.certificationStatus==='EXPIRING'} onAction={() => toggleCertificationStatus('EXPIRING')} actionLabel={filters.certificationStatus==='EXPIRING'?'Quitar filtro':'Filtrar'} />
            <BBVAMetricCard label="Vencidas" value={cards.expired} icon={<AlertTriangle className="h-4 w-4" />} tone="rose" help={dashboardMetricDefinitions.expired} active={filters.certificationStatus==='EXPIRED'} onAction={() => toggleCertificationStatus('EXPIRED')} actionLabel={filters.certificationStatus==='EXPIRED'?'Quitar filtro':'Filtrar'} />
            <BBVAMetricCard label="Recertificaciones" value={cards.recertificationPending} icon={<RefreshCw className="h-4 w-4" />} tone="orange" help={dashboardMetricDefinitions.recertificationPending} active={filters.certificationStatus==='RECERTIFICATION_PENDING'} onAction={() => toggleCertificationStatus('RECERTIFICATION_PENDING')} actionLabel={filters.certificationStatus==='RECERTIFICATION_PENDING'?'Quitar filtro':'Filtrar'} />
            <BBVAMetricCard label="Pendientes" value={cards.pending} icon={<Award className="h-4 w-4" />} tone="blue" help={dashboardMetricDefinitions.pending} active={filters.certificationStatus==='PENDING'} onAction={() => toggleCertificationStatus('PENDING')} actionLabel={filters.certificationStatus==='PENDING'?'Quitar filtro':'Filtrar'} />
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <BBVAChartCard title="Foco por colaborador" description="Clasifica a cada colaborador por su estado operativo más relevante dentro del universo actual."><BBVADonutChart items={collaboratorFocusItems} center={cards.collaboratorsActive} caption="colaboradores" emptyTitle="Sin colaboradores en el contexto actual" emptyDescription="No existen colaboradores que cumplan los filtros seleccionados." /></BBVAChartCard>
            <BBVAChartCard title="Estado de certificaciones" description="Distribución de las certificaciones aplicables. Selecciona un estado para filtrar toda la vista."><BBVADonutChart items={certificationDonutItems} center={cards.certificationsApplicable} caption="aplicables" selectedKey={filters.certificationStatus} onSelect={(item)=>item.key&&toggleCertificationStatus(item.key)} emptyTitle="Sin certificaciones aplicables" emptyDescription="No existen certificaciones aplicables para los filtros actuales." /></BBVAChartCard>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <BBVAChartCard title="Vencimientos programados · 12 meses" description="Distribución futura de fechas de vencimiento. No representa una tendencia histórica.">
              {data.expirationByMonth.some((item)=>item.value>0)?<div className="flex h-52 items-end gap-2" role="img" aria-label={`Vencimientos programados: ${data.expirationByMonth.map((item)=>`${item.label} ${item.value}`).join(', ')}`}>{data.expirationByMonth.map((item) => <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${item.label}: ${item.value} certificaciones`}><span className="text-[9px] font-semibold tabular-nums text-slate-600 [.bbva-dark_&]:text-slate-300">{item.value}</span><div className="w-full rounded-t-lg bg-blue-500/90 transition hover:bg-blue-600 [.bbva-dark_&]:bg-cyan-400/80 [.bbva-dark_&]:hover:bg-cyan-300" style={{ height: `${Math.max(6, (item.value / maxMonth) * 150)}px` }} /><span className="truncate text-[8px] capitalize text-slate-400">{item.label}</span></div>)}</div>:<BBVAEmptyState compact title="Sin vencimientos programados" description="No existen certificaciones con fecha de vencimiento dentro de los próximos 12 meses para los filtros actuales."/>}
            </BBVAChartCard>
            <BBVAChartCard title="Distribución por tecnología" description="Colaboradores del universo actual. Selecciona una tecnología para filtrar todos los indicadores."><BBVAHorizontalBars items={technologyBars} max={maxTech} selectedKey={filters.technologyId} onSelect={(id)=>update('technologyId',filters.technologyId===id?'':id)} /></BBVAChartCard>
          </div>

          <div className="grid gap-3 xl:grid-cols-[0.75fr_1.25fr]">
            <BBVAChartCard title="Composición de Banco de talento" description="Distribución de las entradas activas por tipo."><BBVADonutChart items={data.talentComposition} center={cards.talentBankActive} caption="personas" emptyTitle="Banco de talento sin registros" emptyDescription="No existen entradas activas para los filtros actuales." /></BBVAChartCard>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 [.bbva-dark_&]:border-slate-800"><div><h2 className="text-sm font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">Colaboradores a revisar</h2><p className="mt-0.5 text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">Detalle operativo del universo actual, ordenable por estado.</p></div><button type="button" onClick={()=>{setSort('priority');setDirection('desc');}} className="text-[9.5px] font-semibold text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 [.bbva-dark_&]:text-cyan-300">Ordenar por prioridad</button></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:bg-slate-950/40"><tr><th className="px-3 py-2"><BBVATableSortHeader label="Colaborador" active={sort==='name'} direction={direction} onClick={()=>{setDirection(sort==='name'&&direction==='asc'?'desc':'asc');setSort('name');}}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Tecnología" active={sort==='technology'} direction={direction} onClick={()=>{setDirection(sort==='technology'&&direction==='asc'?'desc':'asc');setSort('technology');}}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Vigentes" active={sort==='valid'} direction={direction} align="center" onClick={()=>{setDirection(sort==='valid'&&direction==='asc'?'desc':'asc');setSort('valid');}}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Próximas" active={sort==='expiring'} direction={direction} align="center" onClick={()=>{setDirection(sort==='expiring'&&direction==='asc'?'desc':'asc');setSort('expiring');}}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Vencidas" active={sort==='expired'} direction={direction} align="center" onClick={()=>{setDirection(sort==='expired'&&direction==='asc'?'desc':'asc');setSort('expired');}}/></th><th className="px-3 py-2"><BBVATableSortHeader label="Pendientes" active={sort==='pending'} direction={direction} align="center" onClick={()=>{setDirection(sort==='pending'&&direction==='asc'?'desc':'asc');setSort('pending');}}/></th><th className="px-3 py-2 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">{attention.slice(0, 12).map((row) => <tr key={row.collaboratorId} className="hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/50"><td className="px-3 py-2"><div className="font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{row.fullName}</div><div className="text-[9px] text-slate-400">{row.profile}</div></td><td className="px-3 py-2 text-slate-600 [.bbva-dark_&]:text-slate-300">{row.technology}</td><td className="px-3 py-2 text-center font-semibold text-emerald-700 [.bbva-dark_&]:text-emerald-300">{row.valid}</td><td className="px-3 py-2 text-center font-semibold text-amber-700 [.bbva-dark_&]:text-amber-300">{row.expiring}</td><td className="px-3 py-2 text-center font-semibold text-rose-700 [.bbva-dark_&]:text-rose-300" title={`Vencidas: ${row.expired} · Recertificación: ${row.recertificationPending}`}>{row.expired + row.recertificationPending}</td><td className="px-3 py-2 text-center font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{row.pending}</td><td className="px-3 py-2 text-right"><BBVAButton variant="table" size="sm" onClick={() => navigate(`/bbva/collaborators/${row.collaboratorId}/certifications`)}>Revisar</BBVAButton></td></tr>)}</tbody></table></div>
              {attention.length===0?<BBVAEmptyState title="No hay colaboradores para revisar" description="No existen personas dentro del universo definido por los filtros actuales."/>:null}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
