import React, { useMemo, useState } from 'react';
import { AlertTriangle, Award, ChevronRight, RefreshCw, Search, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVADatePicker } from '../../componentsBBVATalent/BBVADatePicker';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { useBbvaDashboard } from '../hooks/useDashboard';
import type { DashboardFilters } from '../types/dashboard';

const initialFilters: DashboardFilters = {
  technologyId: '',
  profileId: '',
  certificationStatus: '',
  talentType: '',
  fromDate: '',
  toDate: '',
  search: '',
};

const sliceColors = ['#16a34a', '#f59e0b', '#ef4444', '#f97316', '#64748b', '#2563eb'];

function Donut({ items, center, caption }: { items: Array<{ label: string; value: number }>; center: string | number; caption: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = total ? (cursor / total) * 100 : 0;
    cursor += item.value;
    const end = total ? (cursor / total) * 100 : 100;
    return `${sliceColors[index % sliceColors.length]} ${start}% ${end}%`;
  });
  const background = total ? `conic-gradient(${stops.join(',')})` : 'conic-gradient(#e2e8f0 0 100%)';
  return (
    <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto h-36 w-36 rounded-full" style={{ background }}>
        <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <div className="text-2xl font-semibold text-slate-950">{center}</div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">{caption}</div>
        </div>
      </div>
      <div className="space-y-2">{items.map((item, index) => (
        <div key={item.label} className="flex items-center justify-between gap-3 text-[10.5px]"><span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sliceColors[index % sliceColors.length] }} /><span className="truncate">{item.label}</span></span><span className="font-semibold tabular-nums text-slate-900">{item.value}</span></div>
      ))}</div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon, onClick, tone = 'blue' }: { label: string; value: React.ReactNode; hint?: string; icon: React.ReactNode; onClick?: () => void; tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'orange' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="group flex min-h-[138px] w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-9 items-start justify-between gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</span>
        {onClick ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" /> : <span className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </div>
      <div className="mt-3 min-h-[24px] text-[9px] font-semibold uppercase leading-3 tracking-[0.05em] text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold leading-none tabular-nums text-slate-950">{value}</div>
      <div className="mt-auto min-h-[24px] pt-2 text-[9.5px] leading-3 text-slate-500">{hint ?? ''}</div>
    </Comp>
  );
}

export const CertificationMetricsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [sort, setSort] = useState<'priority' | 'name' | 'technology'>('priority');
  const query = useBbvaDashboard(filters);
  const data = query.data;

  const attention = useMemo(() => {
    const rows = [...(data?.attention ?? [])];
    if (sort === 'name') return rows.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es-MX'));
    if (sort === 'technology') return rows.sort((a, b) => a.technology.localeCompare(b.technology, 'es-MX') || a.fullName.localeCompare(b.fullName, 'es-MX'));
    return rows.sort((a, b) => ((b.expired + b.recertificationPending) * 100 + b.expiring * 10 + b.pending) - ((a.expired + a.recertificationPending) * 100 + a.expiring * 10 + a.pending));
  }, [data?.attention, sort]);

  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  const cards = data?.cards;
  const maxMonth = Math.max(1, ...(data?.expirationByMonth ?? []).map((item) => item.value));
  const maxTech = Math.max(1, ...(data?.technologyDistribution ?? []).map((item) => item.value));

  const update = (key: keyof DashboardFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-3 animate-fade-in">
      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_210px_210px_190px_170px_170px]">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Buscar persona, perfil o tecnología" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[10.5px] outline-none focus:border-blue-500" /></div>
        <BBVASearchableSelect value={filters.profileId} onChange={(value) => update('profileId', value)} options={[{ value: '', label: 'Todos los perfiles' }, ...(data?.filters.profiles ?? []).map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Perfil" />
        <BBVASearchableSelect value={filters.technologyId} onChange={(value) => update('technologyId', value)} options={[{ value: '', label: 'Todas las tecnologías' }, ...(data?.filters.technologies ?? []).map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Tecnología" />
        <BBVASearchableSelect value={filters.certificationStatus} onChange={(value) => update('certificationStatus', value)} options={[{ value: '', label: 'Todos los estados de certificación' }, { value: 'VALID', label: 'Vigentes' }, { value: 'EXPIRING', label: 'Próximas a vencer' }, { value: 'EXPIRED', label: 'Vencidas' }, { value: 'RECERTIFICATION_PENDING', label: 'Recertificación pendiente' }, { value: 'PENDING', label: 'Pendientes' }, { value: 'FAILED', label: 'Reprobadas' }]} ariaLabel="Estado de certificación" />
        <BBVASearchableSelect value={filters.talentType} onChange={(value) => update('talentType', value)} options={[{ value: '', label: 'Todo Banco de talento' }, { value: 'ACADEMY', label: 'Academia' }, { value: 'PROSPECT', label: 'Prospectos' }, { value: 'BBVA_EXIT', label: 'Bajas de BBVA' }]} ariaLabel="Tipo de Banco de talento" />
        <BBVADatePicker value={filters.fromDate} onChange={(value) => update('fromDate', value)} ariaLabel="Desde" placeholder="Desde" />
        <BBVADatePicker value={filters.toDate} onChange={(value) => update('toDate', value)} ariaLabel="Hasta" placeholder="Hasta" />
      </section>

      {query.isLoading || !cards ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">Cargando panel...</div> : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] items-stretch gap-2">
            <MetricCard label="Colaboradores activos" value={cards.collaboratorsActive} hint="Personas activas" icon={<UsersRound className="h-4 w-4" />} onClick={() => navigate('/bbva/collaborators')} />
            <MetricCard label="Banco de talento" value={cards.talentBankActive} hint="Disponibilidad actual" icon={<UserRoundCheck className="h-4 w-4" />} tone="violet" onClick={() => navigate('/bbva/talent-bank')} />
            <MetricCard label="Certificaciones aplicables" value={cards.certificationsApplicable} hint="Requisitos actuales" icon={<Award className="h-4 w-4" />} tone="emerald" />
            <MetricCard label="Cobertura" value={`${cards.coveragePercent}%`} hint="Vigentes + próximas" icon={<ShieldCheck className="h-4 w-4" />} tone="emerald" />
            <MetricCard label="Próximas a vencer" value={cards.expiring} icon={<AlertTriangle className="h-4 w-4" />} tone="amber" onClick={() => update('certificationStatus', filters.certificationStatus === 'EXPIRING' ? '' : 'EXPIRING')} />
            <MetricCard label="Vencidas" value={cards.expired} icon={<AlertTriangle className="h-4 w-4" />} tone="rose" onClick={() => update('certificationStatus', filters.certificationStatus === 'EXPIRED' ? '' : 'EXPIRED')} />
            <MetricCard label="Recertificaciones" value={cards.recertificationPending} icon={<RefreshCw className="h-4 w-4" />} tone="orange" onClick={() => update('certificationStatus', filters.certificationStatus === 'RECERTIFICATION_PENDING' ? '' : 'RECERTIFICATION_PENDING')} />
            <MetricCard label="Pendientes" value={cards.pending} icon={<Award className="h-4 w-4" />} tone="blue" onClick={() => update('certificationStatus', filters.certificationStatus === 'PENDING' ? '' : 'PENDING')} />
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Foco por colaborador</h2></div><Donut items={data.collaboratorFocus} center={cards.collaboratorsActive} caption="colaboradores" /></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Estado de certificaciones</h2></div><Donut items={data.certificationCoverage} center={cards.certificationsApplicable} caption="aplicables" /></section>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Vencimientos · 12 meses</h2></div><div className="flex h-52 items-end gap-2">{data.expirationByMonth.map((item) => <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-1"><span className="text-[9px] font-semibold text-slate-600">{item.value}</span><div className="w-full rounded-t-lg bg-blue-500/90 transition hover:bg-blue-600" style={{ height: `${Math.max(6, (item.value / maxMonth) * 150)}px` }} title={`${item.label}: ${item.value}`} /><span className="truncate text-[8px] capitalize text-slate-400">{item.label}</span></div>)}</div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Distribución por tecnología</h2></div><div className="space-y-3">{data.technologyDistribution.slice(0, 10).map((item) => <button key={`${item.technologyId}-${item.label}`} type="button" onClick={() => item.technologyId && update('technologyId', filters.technologyId === item.technologyId ? '' : item.technologyId)} className="grid w-full grid-cols-[150px_minmax(0,1fr)_32px] items-center gap-3 text-left"><span className="truncate text-[10px] font-medium text-slate-600">{item.label}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500 transition" style={{ width: `${(item.value / maxTech) * 100}%` }} /></span><span className="text-right text-[10px] font-semibold tabular-nums text-slate-700">{item.value}</span></button>)}</div></section>
          </div>

          <div className="grid gap-3 xl:grid-cols-[0.75fr_1.25fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Composición de Banco de talento</h2></div><Donut items={data.talentComposition} center={cards.talentBankActive} caption="personas" /></section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h2 className="text-sm font-semibold text-slate-950">Colaboradores a revisar</h2></div><div className="w-48"><BBVASearchableSelect value={sort} onChange={(value) => setSort(value as typeof sort)} options={[{ value: 'priority', label: 'Ordenar por prioridad' }, { value: 'name', label: 'Ordenar por nombre' }, { value: 'technology', label: 'Ordenar por tecnología' }]} ariaLabel="Orden de tabla" /></div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead className="bg-slate-50 text-[8.5px] font-semibold uppercase tracking-[0.04em] text-slate-500"><tr><th className="px-3 py-2">Colaborador</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2 text-center">Vigentes</th><th className="px-3 py-2 text-center">Próximas</th><th className="px-3 py-2 text-center">Vencidas</th><th className="px-3 py-2 text-center">Pendientes</th><th className="px-3 py-2 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{attention.slice(0, 12).map((row) => <tr key={row.collaboratorId} className="hover:bg-slate-50"><td className="px-3 py-2"><div className="font-semibold text-slate-900">{row.fullName}</div><div className="text-[9px] text-slate-400">{row.profile}</div></td><td className="px-3 py-2 text-slate-600">{row.technology}</td><td className="px-3 py-2 text-center font-semibold text-emerald-700">{row.valid}</td><td className="px-3 py-2 text-center font-semibold text-amber-700">{row.expiring}</td><td className="px-3 py-2 text-center font-semibold text-rose-700">{row.expired + row.recertificationPending}</td><td className="px-3 py-2 text-center font-semibold text-slate-700">{row.pending}</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => navigate(`/bbva/collaborators/${row.collaboratorId}/certifications`)} className="rounded-lg border border-slate-200 px-2 py-1 text-[9.5px] font-semibold text-blue-700 hover:bg-blue-50">Revisar</button></td></tr>)}</tbody></table></div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
