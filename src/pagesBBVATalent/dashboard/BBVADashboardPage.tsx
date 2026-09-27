import React, { useMemo, useState } from 'react';
import { AlertCircle, Award, Briefcase, ChevronRight, Layers3, RefreshCw, Search, UserRoundCheck, UsersRound } from 'lucide-react';
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
  deliveryManager: '',
  talentType: '',
  fromDate: '',
  toDate: '',
  search: '',
};

const sliceColors = ['#2563eb', '#7c3aed', '#0f9f6e', '#f59e0b', '#ef4444', '#64748b'];

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
    <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto h-32 w-32 rounded-full" style={{ background }}>
        <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <div className="text-2xl font-semibold text-slate-950">{center}</div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">{caption}</div>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-[10.5px]">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sliceColors[index % sliceColors.length] }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, onClick, tone = 'blue' }: { label: string; value: React.ReactNode; icon: React.ReactNode; onClick?: () => void; tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'orange' | 'violet' }) {
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
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className="group flex min-h-[118px] w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex h-9 items-start justify-between gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</span>
        {onClick ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" /> : <span className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </div>
      <div className="mt-3 text-[9px] font-semibold uppercase leading-3 tracking-[0.05em] text-slate-400">{label}</div>
      <div className="mt-auto pt-2 text-2xl font-semibold leading-none tabular-nums text-slate-950">{value}</div>
    </Comp>
  );
}

function Bars({ items, max, onSelect }: { items: Array<{ key: string; label: string; value: number }>; max: number; onSelect?: (key: string) => void }) {
  if (items.length === 0) return <div className="py-8 text-center text-[10.5px] text-slate-400">Sin datos para los filtros actuales.</div>;
  return (
    <div className="space-y-3">
      {items.slice(0, 10).map((item) => (
        <button key={`${item.key}-${item.label}`} type="button" onClick={() => onSelect?.(item.key)} disabled={!onSelect} className="grid w-full grid-cols-[160px_minmax(0,1fr)_34px] items-center gap-3 text-left disabled:cursor-default">
          <span className="truncate text-[10px] font-medium text-slate-600">{item.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500 transition" style={{ width: `${Math.max(4, (item.value / Math.max(1, max)) * 100)}%` }} /></span>
          <span className="text-right text-[10px] font-semibold tabular-nums text-slate-700">{item.value}</span>
        </button>
      ))}
    </div>
  );
}

export const BBVADashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const query = useBbvaDashboard(filters);
  const data = query.data;
  const cards = data?.cards;

  const profileDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of data?.attention ?? []) {
      const label = row.profile || 'Sin perfil';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ key: label, label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es-MX'));
  }, [data?.attention]);

  const technologyDistribution = useMemo(() => (data?.technologyDistribution ?? []).map((item) => ({ key: item.technologyId ?? '', label: item.label, value: item.value })), [data?.technologyDistribution]);
  const deliveryManagerDistribution = useMemo(() => (data?.deliveryManagerDistribution ?? []).map((item) => ({ key: item.label, label: item.label, value: item.value })), [data?.deliveryManagerDistribution]);
  const representedProfiles = profileDistribution.filter((item) => item.label !== 'Sin perfil').length;
  const representedTechnologies = technologyDistribution.filter((item) => item.label !== 'Sin tecnología' && item.value > 0).length;
  const attentionCount = (data?.attention ?? []).filter((row) => row.expiring + row.expired + row.pending + row.recertificationPending > 0).length;
  const maxTech = Math.max(1, ...technologyDistribution.map((item) => item.value));
  const maxProfile = Math.max(1, ...profileDistribution.map((item) => item.value));
  const maxDm = Math.max(1, ...deliveryManagerDistribution.map((item) => item.value));

  const update = (key: keyof DashboardFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => setFilters(initialFilters);

  if (query.error) return <BBVAAlert tone="error">{(query.error as Error).message}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Buscar persona, IS, usuario BBVA, correo, perfil o tecnología" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[10.5px] outline-none focus:border-blue-500" />
        </div>
        <div className="min-w-[180px] flex-1"><BBVASearchableSelect value={filters.profileId} onChange={(value) => update('profileId', value)} options={[{ value: '', label: 'Todos los perfiles' }, ...(data?.filters.profiles ?? []).map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Perfil" /></div>
        <div className="min-w-[200px] flex-1"><BBVASearchableSelect value={filters.technologyId} onChange={(value) => update('technologyId', value)} options={[{ value: '', label: 'Todas las tecnologías' }, ...(data?.filters.technologies ?? []).map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Tecnología" /></div>
        <div className="min-w-[200px] flex-1"><BBVASearchableSelect value={filters.deliveryManager} onChange={(value) => update('deliveryManager', value)} options={[{ value: '', label: 'Todos los DM' }, ...(data?.filters.deliveryManagers ?? []).map((item) => ({ value: item, label: item }))]} ariaLabel="Delivery Manager" /></div>
        <div className="min-w-[190px] flex-1"><BBVASearchableSelect value={filters.talentType} onChange={(value) => update('talentType', value)} options={[{ value: '', label: 'Todo Banco de talento' }, { value: 'ACADEMY', label: 'Academia' }, { value: 'PROSPECT', label: 'Prospectos' }, { value: 'FORMER_COLLABORATOR', label: 'Excolaboradores' }, { value: 'BBVA_EXIT', label: 'Bajas de BBVA' }]} ariaLabel="Tipo de Banco de talento" /></div>
        <div className="min-w-[150px]"><BBVADatePicker value={filters.fromDate} onChange={(value) => update('fromDate', value)} ariaLabel="Desde" placeholder="Desde" /></div>
        <div className="min-w-[150px]"><BBVADatePicker value={filters.toDate} onChange={(value) => update('toDate', value)} ariaLabel="Hasta" placeholder="Hasta" /></div>
        <button type="button" onClick={resetFilters} className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Limpiar</button>
        <button type="button" onClick={() => void query.refetch()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />Actualizar</button>
      </section>

      {query.isLoading || !cards ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">Cargando panel...</div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(175px,1fr))] items-stretch gap-2">
            <MetricCard label="Colaboradores activos" value={cards.collaboratorsActive} icon={<UsersRound className="h-4 w-4" />} onClick={() => navigate('/bbva/collaborators')} />
            <MetricCard label="Banco de talento" value={cards.talentBankActive} icon={<UserRoundCheck className="h-4 w-4" />} tone="violet" onClick={() => navigate('/bbva/talent-bank')} />
            <MetricCard label="Tecnologías representadas" value={representedTechnologies} icon={<Layers3 className="h-4 w-4" />} tone="emerald" />
            <MetricCard label="Perfiles representados" value={representedProfiles} icon={<Briefcase className="h-4 w-4" />} tone="blue" />
            <MetricCard label="DM activos" value={cards.deliveryManagersRepresented} icon={<Briefcase className="h-4 w-4" />} tone="violet" />
            <MetricCard label="Datos por completar" value={cards.dataQualityPending} icon={<AlertCircle className="h-4 w-4" />} tone={cards.dataQualityPending > 0 ? 'amber' : 'emerald'} />
            <MetricCard label="Cobertura de certificaciones" value={`${cards.coveragePercent}%`} icon={<Award className="h-4 w-4" />} tone="emerald" onClick={() => navigate('/bbva/certifications/metrics')} />
            <MetricCard label="Atención requerida" value={attentionCount} icon={<Award className="h-4 w-4" />} tone={attentionCount > 0 ? 'amber' : 'blue'} onClick={() => navigate('/bbva/certifications/tracking')} />
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-950">Distribución por tecnología</h2>
              <Bars items={technologyDistribution} max={maxTech} onSelect={(id) => id && update('technologyId', filters.technologyId === id ? '' : id)} />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-950">Distribución por perfil</h2>
              <Bars items={profileDistribution} max={maxProfile} />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-950">Distribución por DM</h2>
              <Bars items={deliveryManagerDistribution} max={maxDm} onSelect={(dm) => update('deliveryManager', filters.deliveryManager === dm ? '' : dm)} />
            </section>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-950">Banco de talento</h2>
              <Donut items={data.talentComposition} center={cards.talentBankActive} caption="personas" />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-950">Certificaciones</h2>
                <button type="button" onClick={() => navigate('/bbva/certifications/metrics')} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-[10px] font-semibold text-blue-700 hover:bg-blue-50">Ver métricas<ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
              <Donut items={data.certificationCoverage} center={`${cards.coveragePercent}%`} caption="cobertura" />
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Personas a revisar</h2>
              <button type="button" onClick={() => navigate('/bbva/certifications/tracking')} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-[10px] font-semibold text-blue-700 hover:bg-blue-50">Ver seguimiento<ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[10px]">
                <thead className="bg-slate-50 text-[8.5px] font-semibold uppercase tracking-[0.04em] text-slate-500"><tr><th className="px-3 py-2">Persona</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Tecnología</th><th className="px-3 py-2">DM</th><th className="px-3 py-2 text-center">Alertas</th><th className="px-3 py-2 text-right">Acción</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.attention ?? []).filter((row) => row.expiring + row.expired + row.pending + row.recertificationPending > 0).slice(0, 10).map((row) => {
                    const alerts = row.expiring + row.expired + row.pending + row.recertificationPending;
                    return <tr key={row.collaboratorId} className="hover:bg-slate-50"><td className="px-3 py-2 font-semibold text-slate-900">{row.fullName}</td><td className="px-3 py-2 text-slate-600">{row.profile}</td><td className="px-3 py-2 text-slate-600">{row.technology}</td><td className="px-3 py-2 text-slate-600">{row.deliveryManager}</td><td className="px-3 py-2 text-center font-semibold tabular-nums text-amber-700">{alerts}</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => navigate(`/bbva/collaborators/${row.collaboratorId}/manage`)} className="rounded-lg border border-slate-200 px-2 py-1 text-[9.5px] font-semibold text-blue-700 hover:bg-blue-50">Gestionar</button></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            {attentionCount === 0 ? <div className="px-4 py-8 text-center text-[10.5px] text-slate-400">No hay personas con atención requerida para los filtros actuales.</div> : null}
          </section>
        </>
      )}
    </div>
  );
};
