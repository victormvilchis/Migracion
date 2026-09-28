import React, { useMemo, useState } from 'react';
import { Award, Download, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAActivityFeed } from '../../componentsBBVATalent/BBVAActivityFeed';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVAChartCard } from '../../componentsBBVATalent/BBVAChartCard';
import { BBVAEmptyState } from '../../componentsBBVATalent/BBVAEmptyState';
import { BBVAHistoricalMetricPanel } from '../../componentsBBVATalent/BBVAHistoricalMetricPanel';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVAMetricsSkeleton } from '../../componentsBBVATalent/BBVAMetricsSkeleton';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { useBbvaDashboard } from '../hooks/useDashboard';
import { comparisonText } from '../lib/dashboardHistory';
import type { DashboardFilters, DashboardHistoricalMetricKey, DashboardMetricSnapshotPoint } from '../types/dashboard';

export type BBVAReportType = 'talent' | 'collaborators' | 'certifications';

interface Props { type: BBVAReportType; }

const configuration: Record<BBVAReportType, {
  title: string;
  description: string;
  defaultMetric: DashboardHistoricalMetricKey;
  metrics: DashboardHistoricalMetricKey[];
  activityCategories: Array<'COLLABORATOR' | 'TALENT' | 'CERTIFICATION'>;
}> = {
  talent: {
    title: 'Reporte de talento',
    description: 'Evolución del universo activo y movimientos de Banco de talento.',
    defaultMetric: 'talentBankActive',
    metrics: ['talentBankActive','collaboratorsActive','dataQualityPending'],
    activityCategories: ['TALENT','COLLABORATOR'],
  },
  collaborators: {
    title: 'Reporte de colaboradores',
    description: 'Evolución de headcount operativo, preparación Vendors y calidad de datos.',
    defaultMetric: 'collaboratorsActive',
    metrics: ['collaboratorsActive','vendorReadyPercent','vendorPending','vendorExitRequired','dataQualityPending'],
    activityCategories: ['COLLABORATOR'],
  },
  certifications: {
    title: 'Reporte de certificaciones',
    description: 'Cobertura, vigencias, pendientes, recertificación y críticos 2/2 con histórico real.',
    defaultMetric: 'coveragePercent',
    metrics: ['coveragePercent','certificationsApplicable','expiring','expired','recertificationPending','pending','vendorReadyPercent','vendorPending','vendorExitRequired'],
    activityCategories: ['CERTIFICATION'],
  },
};

function csvValue(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportHistory(points: DashboardMetricSnapshotPoint[], type: BBVAReportType) {
  const headers = ['snapshotDate','collaboratorsActive','talentBankActive','certificationsApplicable','coveragePercent','expiring','expired','recertificationPending','pending','dataQualityPending','vendorReadyPercent','vendorPending','vendorExitRequired'];
  const rows = [headers.join(','), ...points.map((point) => headers.map((key) => csvValue(point[key as keyof DashboardMetricSnapshotPoint])).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bbva-${type}-historico.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const BBVAReportsPage: React.FC<Props> = ({ type }) => {
  const config = configuration[type];
  const navigate = useNavigate();
  const [historyDays,setHistoryDays]=useState('90');
  const [comparisonDays,setComparisonDays]=useState('7');
  const [activityDays,setActivityDays]=useState('30');
  const [metric,setMetric]=useState<DashboardHistoricalMetricKey>(config.defaultMetric);
  React.useEffect(() => setMetric(config.defaultMetric), [config.defaultMetric]);

  const filters = useMemo<DashboardFilters>(() => ({
    technologyId:'',profileId:'',certificationStatus:'',deliveryManager:'',talentType:'',fromDate:'',toDate:'',search:'',
    historyDays,comparisonDays,activityDays,activityLimit:'50',
  }), [activityDays,comparisonDays,historyDays]);
  const query=useBbvaDashboard(filters);
  const data=query.data;
  const activity=useMemo(()=>(data?.activity??[]).filter((item)=>config.activityCategories.includes(item.category)),[config.activityCategories,data?.activity]);

  if(query.error)return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;
  return <div className="space-y-3 animate-fade-in">
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/50">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="text-[9px] font-semibold uppercase tracking-[.06em] text-blue-600 [.bbva-dark_&]:text-cyan-300">Reportes BBVA</div><h1 className="mt-0.5 text-base font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">{config.title}</h1><p className="mt-0.5 text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">{config.description}</p></div>
        <div className="grid min-w-[560px] max-w-full grid-cols-3 gap-2">
          <BBVASearchableSelect value={historyDays} onChange={setHistoryDays} options={[{value:'30',label:'Histórico · 30 días'},{value:'90',label:'Histórico · 90 días'},{value:'180',label:'Histórico · 180 días'},{value:'365',label:'Histórico · 365 días'}]} ariaLabel="Ventana histórica"/>
          <BBVASearchableSelect value={comparisonDays} onChange={setComparisonDays} options={[{value:'1',label:'Comparar · 1 día'},{value:'7',label:'Comparar · 7 días'},{value:'30',label:'Comparar · 30 días'},{value:'90',label:'Comparar · 90 días'}]} ariaLabel="Periodo de comparación"/>
          <BBVASearchableSelect value={activityDays} onChange={setActivityDays} options={[{value:'7',label:'Actividad · 7 días'},{value:'30',label:'Actividad · 30 días'},{value:'90',label:'Actividad · 90 días'}]} ariaLabel="Periodo de actividad"/>
        </div>
      </div>
    </section>

    {query.isLoading||!data?<BBVAMetricsSkeleton cards={4}/>:<>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2">
        {type!=='certifications'?<BBVAMetricCard label="Colaboradores activos" value={data.cards.collaboratorsActive} icon={<UsersRound className="h-4 w-4"/>} supportingText="Universo actual" trendText={comparisonText(data.history.comparisons.collaboratorsActive)} onAction={()=>navigate('/bbva/collaborators')} actionLabel="Ver colaboradores"/>:null}
        {type==='talent'?<BBVAMetricCard label="Banco de talento" value={data.cards.talentBankActive} icon={<UserRoundCheck className="h-4 w-4"/>} tone="violet" supportingText="Entradas activas" trendText={comparisonText(data.history.comparisons.talentBankActive)} onAction={()=>navigate('/bbva/talent-bank')} actionLabel="Ver banco"/>:null}
        {type!=='talent'?<BBVAMetricCard label="Preparación Vendors" value={`${data.cards.vendorReadyPercent}%`} icon={<ShieldCheck className="h-4 w-4"/>} tone="emerald" supportingText={`${data.cards.vendorPending} pendientes`} trendText={comparisonText(data.history.comparisons.vendorReadyPercent)} onAction={()=>navigate('/bbva/certifications/tracking')} actionLabel="Ver seguimiento"/>:null}
        {type==='certifications'?<><BBVAMetricCard label="Cobertura" value={`${data.cards.coveragePercent}%`} icon={<Award className="h-4 w-4"/>} tone="emerald" supportingText={`${data.cards.certificationsApplicable} aplicables`} trendText={comparisonText(data.history.comparisons.coveragePercent)}/><BBVAMetricCard label="Vencidas" value={data.cards.expired} icon={<Award className="h-4 w-4"/>} tone={data.cards.expired?'rose':'emerald'} supportingText="Fuera de vigencia" trendText={comparisonText(data.history.comparisons.expired)} onAction={()=>navigate('/bbva/certifications/tracking?certificationStatus=EXPIRED')} actionLabel="Revisar"/><BBVAMetricCard label="Críticos 2/2" value={data.cards.vendorExitRequired} icon={<Award className="h-4 w-4"/>} tone={data.cards.vendorExitRequired?'rose':'emerald'} supportingText="Resolución abierta" trendText={comparisonText(data.history.comparisons.vendorExitRequired)} onAction={()=>navigate('/bbva/certifications/tracking?critical=OPEN')} actionLabel="Resolver"/></>:null}
        {type==='collaborators'?<BBVAMetricCard label="Datos por completar" value={data.cards.dataQualityPending} icon={<UsersRound className="h-4 w-4"/>} tone={data.cards.dataQualityPending?'amber':'emerald'} supportingText="Calidad del universo" trendText={comparisonText(data.history.comparisons.dataQualityPending)} onAction={()=>navigate('/bbva/collaborators')} actionLabel="Ver detalle"/>:null}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <BBVAHistoricalMetricPanel history={data.history} metric={metric} onMetricChange={setMetric} allowedMetrics={config.metrics}/>
        <BBVAChartCard title="Actividad del periodo" description="Eventos reales de los historiales operativos; no es una inferencia.">
          <BBVAActivityFeed items={activity} limit={10} onSelect={(item)=>item.collaboratorId?navigate(`/bbva/collaborators/${item.collaboratorId}`):item.talentId?navigate(`/bbva/talent-bank/${item.talentId}`):undefined}/>
        </BBVAChartCard>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 [.bbva-dark_&]:border-slate-800"><div><h2 className="text-sm font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">Snapshots del periodo</h2><p className="mt-0.5 text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">Una fila por día capturado. No se genera backfill ficticio.</p></div><BBVAButton variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5"/>} onClick={()=>exportHistory(data.history.points,type)} disabled={!data.history.points.length}>Exportar CSV</BBVAButton></div>
        {data.history.points.length?<div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] font-semibold uppercase text-slate-500 [.bbva-dark_&]:bg-slate-950/40"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2 text-right">Colaboradores</th><th className="px-3 py-2 text-right">Banco</th><th className="px-3 py-2 text-right">Cobertura</th><th className="px-3 py-2 text-right">Próximas</th><th className="px-3 py-2 text-right">Vencidas</th><th className="px-3 py-2 text-right">Pendientes</th><th className="px-3 py-2 text-right">Vendors</th><th className="px-3 py-2 text-right">Críticos 2/2</th></tr></thead><tbody className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">{[...data.history.points].reverse().map((point)=><tr key={point.snapshotDate}><td className="px-3 py-2 font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100">{point.snapshotDate}</td><td className="px-3 py-2 text-right tabular-nums">{point.collaboratorsActive}</td><td className="px-3 py-2 text-right tabular-nums">{point.talentBankActive}</td><td className="px-3 py-2 text-right tabular-nums">{point.coveragePercent}%</td><td className="px-3 py-2 text-right tabular-nums">{point.expiring}</td><td className="px-3 py-2 text-right tabular-nums">{point.expired}</td><td className="px-3 py-2 text-right tabular-nums">{point.pending}</td><td className="px-3 py-2 text-right tabular-nums">{point.vendorReadyPercent}%</td><td className="px-3 py-2 text-right tabular-nums">{point.vendorExitRequired}</td></tr>)}</tbody></table></div>:<BBVAEmptyState title="Todavía no hay snapshots suficientes" description="El histórico se irá construyendo con capturas diarias reales; no se inventan periodos anteriores."/>}
      </section>
    </>}
  </div>;
};
