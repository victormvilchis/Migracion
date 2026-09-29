import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronRight,
  Eye,
  GitBranch,
  Grid3X3,
  Layers3,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  UsersRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACatalogHeader } from '../../componentsBBVATalent/BBVACatalogHeader';
import { BBVAFilterBar } from '../../componentsBBVATalent/BBVAFilterBar';
import { BBVAMetricCard } from '../../componentsBBVATalent/BBVAMetricCard';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { cn } from '../../lib/utils';
import { useEngineeringSpecialtyExplorer, useEngineeringSpecialtyStatus } from '../hooks/useEngineeringSpecialties';
import { useStructureStatus } from '../hooks/useStructureCatalog';
import type {
  EngineeringExplorerLevel2Node,
  EngineeringExplorerLevel3Node,
  EngineeringExplorerSpecialtyNode,
  EngineeringSpecialtyStatus,
} from '../types/engineeringSpecialty';
import type { StructureStatus } from '../types/structureCatalog';

type ExplorerView = 'hierarchy' | 'heatmap' | 'insights';
type SelectedNode =
  | { kind: 'level2'; id: string }
  | { kind: 'level3'; id: string }
  | { kind: 'specialty'; id: string };

type PendingStatus =
  | { kind: 'structure'; id: string; name: string; next: StructureStatus }
  | { kind: 'specialty'; id: string; name: string; next: EngineeringSpecialtyStatus };

const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('es-MX');
const percent = (value: number) => `${Math.max(0, Math.min(100, value)).toFixed(2)}%`;
const missingStaffer = (value: string | null) => !value || ['TBD', 'N/A', 'NA', 'NO DISPONIBLE'].includes(normalize(value).trim());

const heatToneClass = (value: number, max: number) => {
  if (!value || !max) return 'border-slate-200 bg-white text-slate-800';
  const ratio = value / max;
  if (ratio >= 0.8) return 'border-blue-300 bg-blue-100 text-slate-950';
  if (ratio >= 0.6) return 'border-blue-200 bg-blue-50 text-slate-950';
  if (ratio >= 0.4) return 'border-cyan-200 bg-cyan-50 text-slate-900';
  if (ratio >= 0.2) return 'border-sky-100 bg-sky-50/70 text-slate-900';
  return 'border-slate-200 bg-white text-slate-800';
};

export const EngineeringSpecialtyExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const query = useEngineeringSpecialtyExplorer();
  const specialtyStatus = useEngineeringSpecialtyStatus();
  const structureStatus = useStructureStatus();
  const [view, setView] = useState<ExplorerView>('hierarchy');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [level2Id, setLevel2Id] = useState('');
  const [staffer, setStaffer] = useState('');
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [pending, setPending] = useState<PendingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rawHierarchy = query.data?.hierarchy ?? [];
  const level2Options = useMemo(() => [...rawHierarchy].sort((a,b)=>b.collaboratorCount-a.collaboratorCount || b.specialtyCount-a.specialtyCount || a.name.localeCompare(b.name,'es-MX',{sensitivity:'base'})).map((item) => ({ value: item.id, label: item.name.toUpperCase(), description: `${item.collaboratorCount} colaboradores` })), [rawHierarchy]);

  const filteredHierarchy = useMemo(() => {
    const term = normalize(search.trim());
    return rawHierarchy
      .filter((parent) => !level2Id || parent.id === level2Id)
      .filter((parent) => status === 'ALL' || parent.status === 'ACTIVE')
      .map((parent) => {
        const parentMatch = !term || normalize(`${parent.name} ${parent.description ?? ''}`).includes(term);
        const level3 = parent.level3
          .filter((child) => status === 'ALL' || child.status === 'ACTIVE')
          .map((child) => {
            const childMatch = !term || normalize(`${child.name} ${child.description ?? ''} ${child.people.map((person) => person.fullName).join(' ')}`).includes(term);
            const specialties = child.specialties.filter((item) => {
              if (status !== 'ALL' && item.status !== 'ACTIVE') return false;
              if (staffer && item.staffer !== staffer) return false;
              if (!term || parentMatch || childMatch) return true;
              return normalize(`${item.name} ${item.staffer ?? ''} ${item.specialtyOwner ?? ''}`).includes(term);
            });
            if (staffer && !specialties.length) return null;
            if (term && !parentMatch && !childMatch && !specialties.length) return null;
            return { ...child, specialties };
          })
          .filter((item): item is EngineeringExplorerLevel3Node => Boolean(item))
          .sort((a,b)=>b.collaboratorCount-a.collaboratorCount || b.specialties.length-a.specialties.length || a.name.localeCompare(b.name,'es-MX',{sensitivity:'base'}));
        if ((term || staffer) && !parentMatch && !level3.length) return null;
        return { ...parent, level3, specialtyCount: level3.reduce((sum, child) => sum + child.specialties.length, 0), collaboratorCount: level3.reduce((sum, child) => sum + child.collaboratorCount, 0) };
      })
      .filter((item): item is EngineeringExplorerLevel2Node => Boolean(item))
      .sort((a,b)=>b.collaboratorCount-a.collaboratorCount || b.specialtyCount-a.specialtyCount || a.name.localeCompare(b.name,'es-MX',{sensitivity:'base'}));
  }, [level2Id, rawHierarchy, search, staffer, status]);

  const flatLevel3 = useMemo(() => filteredHierarchy.flatMap((parent) => parent.level3.map((child) => ({ parent, child }))), [filteredHierarchy]);
  const visibleSpecialties = useMemo(() => flatLevel3.flatMap(({ child }) => child.specialties), [flatLevel3]);
  useEffect(() => {
    if (!filteredHierarchy.length) { setSelected(null); return; }
    if (selected?.kind === 'level2' && filteredHierarchy.some((item) => item.id === selected.id)) return;
    if (selected?.kind === 'level3' && flatLevel3.some(({ child }) => child.id === selected.id)) return;
    if (selected?.kind === 'specialty' && visibleSpecialties.some((item) => item.id === selected.id)) return;
    setSelected({ kind: 'level2', id: filteredHierarchy[0].id });
  }, [filteredHierarchy, flatLevel3, selected, visibleSpecialties]);

  const selectedLevel2 = useMemo(() => {
    if (!selected) return filteredHierarchy[0] ?? null;
    if (selected.kind === 'level2') return filteredHierarchy.find((item) => item.id === selected.id) ?? filteredHierarchy[0] ?? null;
    if (selected.kind === 'level3') return flatLevel3.find(({ child }) => child.id === selected.id)?.parent ?? filteredHierarchy[0] ?? null;
    return flatLevel3.find(({ child }) => child.specialties.some((item) => item.id === selected.id))?.parent ?? filteredHierarchy[0] ?? null;
  }, [filteredHierarchy, flatLevel3, selected]);

  const selectedLevel3 = useMemo(() => {
    if (!selectedLevel2) return null;
    if (selected?.kind === 'level3') return selectedLevel2.level3.find((item) => item.id === selected.id) ?? selectedLevel2.level3[0] ?? null;
    if (selected?.kind === 'specialty') return selectedLevel2.level3.find((item) => item.specialties.some((specialty) => specialty.id === selected.id)) ?? selectedLevel2.level3[0] ?? null;
    return selectedLevel2.level3[0] ?? null;
  }, [selected, selectedLevel2]);

  const selectedSpecialty = useMemo(() => selected?.kind === 'specialty' ? selectedLevel3?.specialties.find((item) => item.id === selected.id) ?? null : null, [selected, selectedLevel3]);

  const localMetrics = useMemo(() => {
    const structure2 = filteredHierarchy.length;
    const structure3 = flatLevel3.length;
    const specialties = visibleSpecialties.length;
    return {
      guilds: structure3,
      specialties,
      structure2,
      structure3,
      coverage: query.data?.metrics.collaboratorCoveragePercent ?? 100,
      covered: query.data?.metrics.coveredCollaborators ?? 0,
      people: query.data?.metrics.activeCollaborators ?? 0,
    };
  }, [filteredHierarchy.length, flatLevel3, query.data?.metrics.activeCollaborators, query.data?.metrics.collaboratorCoveragePercent, query.data?.metrics.coveredCollaborators, visibleSpecialties.length]);

  const selectLevel2 = (item: EngineeringExplorerLevel2Node) => setSelected({ kind: 'level2', id: item.id });
  const selectLevel3 = (item: EngineeringExplorerLevel3Node) => setSelected({ kind: 'level3', id: item.id });
  const selectSpecialty = (item: EngineeringExplorerSpecialtyNode) => setSelected({ kind: 'specialty', id: item.id });

  const confirmStatus = async () => {
    if (!pending) return;
    try {
      setError(null);
      if (pending.kind === 'specialty') await specialtyStatus.mutateAsync({ id: pending.id, status: pending.next });
      else await structureStatus.mutateAsync({ id: pending.id, status: pending.next });
      setPending(null);
    } catch (caught) {
      setError((caught as Error).message);
      setPending(null);
    }
  };

  if (query.isLoading) return <div className="p-8 text-xs text-slate-500">Cargando mapa organizacional...</div>;
  if (query.error || !query.data) return <BBVAAlert tone="error">No fue posible cargar Gremios y Especialidades.</BBVAAlert>;

  const heatCells = query.data.heatmap.filter((cell) => (!level2Id || cell.level2Id === level2Id) && (!search || normalize(`${cell.level2Name} ${cell.level3Name}`).includes(normalize(search))));
  const heatMax = Math.max(1, ...heatCells.map((item) => item.collaboratorCount));
  const heatGroups = filteredHierarchy.map((parent) => ({ parent, cells: heatCells.filter((item) => item.level2Id === parent.id).sort((a,b)=>b.collaboratorCount-a.collaboratorCount || b.specialtyCount-a.specialtyCount || a.level3Name.localeCompare(b.level3Name,'es-MX',{sensitivity:'base'})) })).filter((group) => group.cells.length).sort((a,b)=>b.parent.collaboratorCount-a.parent.collaboratorCount || b.parent.specialtyCount-a.parent.specialtyCount || a.parent.name.localeCompare(b.parent.name,'es-MX',{sensitivity:'base'}));

  const selectedType = selectedSpecialty ? 'ESPECIALIDAD' : selected?.kind === 'level3' ? 'NIVEL 3 · GREMIO' : 'NIVEL 2';
  const selectedName = selectedSpecialty?.name ?? selectedLevel3?.name ?? selectedLevel2?.name ?? '—';

  return (
    <div className="space-y-3 animate-fade-in">
      <BBVACatalogHeader
        title="GREMIOS Y ESPECIALIDADES"
        description="Explorador visual de Estructura BBVA, gremios, especialidades, staffer y cobertura de colaboradores."
        action={<div className="flex flex-wrap items-center gap-1.5"><BBVAButton variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/bbva/admin/catalogs/engineering-specialties/structures/new')}>Nueva estructura</BBVAButton><BBVAButton variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/bbva/admin/catalogs/engineering-specialties/new')}>Nueva especialidad</BBVAButton></div>}
      />

      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}

      <BBVAFilterBar actions={<BBVAButton size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void query.refetch()}>Actualizar</BBVAButton>}>
        <div className="relative w-full sm:w-[300px]"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar estructura, gremio, especialidad o persona" className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-[11px] outline-none focus:border-blue-500"/></div>
        <div className="w-full sm:w-[205px]"><BBVASearchableSelect value={level2Id} onChange={setLevel2Id} options={[{ value: '', label: 'TODAS LAS ESTRUCTURAS' }, ...level2Options]} ariaLabel="Estructura nivel 2" searchPlaceholder="Buscar estructura" /></div>
        <div className="w-full sm:w-[190px]"><BBVASearchableSelect value={staffer} onChange={setStaffer} options={[{ value: '', label: 'TODOS LOS STAFFER' }, ...query.data.filters.staffers.map((value) => ({ value, label: value.toUpperCase() }))]} ariaLabel="Staffer" searchPlaceholder="Buscar staffer" /></div>
        <div className="w-full sm:w-[150px]"><BBVASearchableSelect value={status} onChange={(value) => setStatus(value as 'ACTIVE' | 'ALL')} options={[{ value: 'ACTIVE', label: 'ACTIVOS' }, { value: 'ALL', label: 'TODOS' }]} ariaLabel="Estado" /></div>
      </BBVAFilterBar>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <BBVAMetricCard density="compact" label="Gremios" value={localMetrics.guilds} icon={<GitBranch className="h-4 w-4"/>} tone="blue" supportingText="Nivel 3 con configuración visible" />
        <BBVAMetricCard density="compact" label="Especialidades" value={localMetrics.specialties} icon={<Boxes className="h-4 w-4"/>} tone="violet" supportingText="Especialidades del contexto" />
        <BBVAMetricCard density="compact" label="Cobertura de colaboradores" value={percent(localMetrics.coverage)} icon={<UsersRound className="h-4 w-4"/>} tone="emerald" supportingText={`${localMetrics.covered} de ${localMetrics.people} colaboradores activos dentro de la jerarquía`} />
        <BBVAMetricCard density="compact" label="Estructura BBVA" value={`${localMetrics.structure2} / ${localMetrics.structure3}`} icon={<Layers3 className="h-4 w-4"/>} tone="slate" supportingText="Nivel 2 / Nivel 3" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div><div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-blue-600">EXPLORADOR ORGANIZACIONAL</div><div className="mt-0.5 text-[10.5px] font-semibold text-slate-800">Navega la estructura, detecta concentración y encuentra huecos de configuración.</div></div>
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {([
            ['hierarchy', 'Jerarquía', GitBranch],
            ['heatmap', 'Mapa de calor', Grid3X3],
            ['insights', 'Insights', BarChart3],
          ] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setView(id)} className={cn('inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[9.5px] font-semibold transition', view === id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white hover:text-slate-900')}><Icon className="h-3.5 w-3.5"/>{label}</button>)}
        </div>
      </div>

      {view === 'hierarchy' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid min-h-[560px] xl:grid-cols-[0.8fr_1fr_1.2fr_0.9fr]">
            <div className="border-b border-slate-200 bg-slate-50/60 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><div><div className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">Nivel 2</div><div className="text-[10px] font-semibold text-slate-800">Estructura BBVA</div></div><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-600">{filteredHierarchy.length}</span></div>
              <div className="max-h-[510px] space-y-1 overflow-y-auto p-2 [scrollbar-width:thin]">{filteredHierarchy.map((item) => <button key={item.id} type="button" onClick={() => selectLevel2(item)} className={cn('group w-full rounded-xl border p-2.5 text-left transition', selectedLevel2?.id === item.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50')}><div className="flex items-start gap-2"><span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300')}/><div className="min-w-0 flex-1"><div className="truncate text-[10.5px] font-bold text-slate-900">{item.name.toUpperCase()}</div><div className="mt-1 flex gap-2 text-[8.5px] text-slate-500"><span>{item.level3.length} N3</span><span>{item.collaboratorCount} personas</span><span>{item.specialtyCount} esp.</span></div></div><ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500"/></div></button>)}</div>
            </div>

            <div className="border-b border-slate-200 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><div><div className="text-[8px] font-bold uppercase tracking-[0.1em] text-blue-500">Nivel 3</div><div className="max-w-[240px] truncate text-[10px] font-semibold text-slate-800">{selectedLevel2?.name ?? 'Selecciona nivel 2'}</div></div><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-bold text-blue-700">{selectedLevel2?.level3.length ?? 0}</span></div>
              <div className="max-h-[510px] space-y-1 overflow-y-auto p-2 [scrollbar-width:thin]">{selectedLevel2?.level3.map((item) => <button key={item.id} type="button" onClick={() => selectLevel3(item)} className={cn('w-full rounded-xl border p-2.5 text-left transition', selectedLevel3?.id === item.id ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-sm' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/40')}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-[10px] font-bold text-slate-900">{item.name.toUpperCase()}</div><div className="mt-1 text-[8.5px] text-slate-500">{item.collaboratorCount} colaboradores · {item.specialties.length} especialidades</div></div><span className={cn('h-2 w-2 rounded-full', item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300')}/></div></button>) ?? <div className="p-5 text-center text-[10px] text-slate-400">Sin Nivel 3 para esta estructura.</div>}</div>
            </div>

            <div className="border-b border-slate-200 bg-slate-50/30 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><div><div className="text-[8px] font-bold uppercase tracking-[0.1em] text-violet-500">Especialidades</div><div className="max-w-[280px] truncate text-[10px] font-semibold text-slate-800">{selectedLevel3?.name ?? 'Selecciona un gremio'}</div></div><span className="rounded-full bg-violet-50 px-2 py-0.5 text-[8px] font-bold text-violet-700">{selectedLevel3?.specialties.length ?? 0}</span></div>
              <div className="max-h-[510px] space-y-1.5 overflow-y-auto p-2 [scrollbar-width:thin]">{selectedLevel3?.specialties.length ? selectedLevel3.specialties.map((item) => <button key={item.id} type="button" onClick={() => selectSpecialty(item)} className={cn('w-full rounded-xl border bg-white p-2.5 text-left transition hover:-translate-y-px hover:shadow-sm', selectedSpecialty?.id === item.id ? 'border-violet-400 ring-2 ring-violet-500/10' : 'border-slate-200 hover:border-violet-200')}><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><div className="text-[10px] font-bold text-slate-900">{item.name.toUpperCase()}</div><div className="mt-1.5 flex items-center gap-1.5"><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-600">STAFFER</span><span className={cn('truncate text-[8.5px] font-semibold', missingStaffer(item.staffer) ? 'text-amber-600' : 'text-slate-700')}>{missingStaffer(item.staffer) ? 'SIN DEFINIR' : item.staffer}</span></div></div><span className={cn('h-2 w-2 rounded-full', item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300')}/></div></button>) : <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-[10px] text-slate-400">Este Nivel 3 aún no tiene especialidades configuradas.</div>}</div>
            </div>

            <aside className="bg-slate-50/70 p-3 text-slate-900">
              <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-blue-600">{selectedType}</div>
              <div className="mt-1 text-[13px] font-bold leading-5">{selectedName.toUpperCase()}</div>
              {selectedSpecialty ? <>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><div className="text-[8px] uppercase tracking-[0.08em] text-slate-500">Staffer</div><div className="mt-1 text-[10.5px] font-semibold">{missingStaffer(selectedSpecialty.staffer) ? 'SIN DEFINIR' : selectedSpecialty.staffer}</div></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]"><div className="rounded-xl border border-slate-200 bg-white p-2"><div className="text-slate-500">Gremio</div><div className="mt-1 font-semibold">{selectedLevel3?.name ?? '—'}</div></div><div className="rounded-xl border border-slate-200 bg-white p-2"><div className="text-slate-500">Personas en gremio</div><div className="mt-1 text-lg font-semibold tabular-nums">{selectedLevel3?.collaboratorCount ?? 0}</div></div></div>
                <div className="mt-3 space-y-1 text-[8.5px] text-slate-600"><div>Portfolio & Staffing: <span className="font-semibold text-slate-900">{selectedSpecialty.portfolioStaffing || '—'}</span></div><div>Líder de gremio: <span className="font-semibold text-slate-900">{selectedSpecialty.guildLeader || '—'}</span></div><div>Responsable especialidad: <span className="font-semibold text-slate-900">{selectedSpecialty.specialtyOwner || '—'}</span></div></div>
                <div className="mt-4 flex gap-1.5"><BBVAButton size="sm" variant="secondary" icon={<Eye className="h-3 w-3"/>} onClick={() => navigate(`/bbva/admin/catalogs/engineering-specialties/${selectedSpecialty.id}`)}>Ver</BBVAButton><BBVAButton size="sm" variant="secondary" icon={<Pencil className="h-3 w-3"/>} onClick={() => navigate(`/bbva/admin/catalogs/engineering-specialties/${selectedSpecialty.id}/edit`)}>Editar</BBVAButton><BBVAButton size="sm" variant="secondary" icon={selectedSpecialty.status === 'ACTIVE' ? <Power className="h-3 w-3"/> : <RefreshCw className="h-3 w-3"/>} onClick={() => setPending({ kind: 'specialty', id: selectedSpecialty.id, name: selectedSpecialty.name, next: selectedSpecialty.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{selectedSpecialty.status === 'ACTIVE' ? 'Inactivar' : 'Activar'}</BBVAButton></div>
              </> : selectedLevel3 ? <>
                <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-slate-200 bg-white p-2"><div className="text-[8px] text-slate-500">Colaboradores</div><div className="mt-1 text-xl font-semibold tabular-nums">{selectedLevel3.collaboratorCount}</div></div><div className="rounded-xl border border-slate-200 bg-white p-2"><div className="text-[8px] text-slate-500">Especialidades</div><div className="mt-1 text-xl font-semibold tabular-nums">{selectedLevel3.specialties.length}</div></div></div>
                <div className="mt-3 text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-500">Colaboradores del gremio</div><div className="mt-1 max-h-[250px] space-y-1 overflow-y-auto [scrollbar-width:thin]">{selectedLevel3.people.slice(0,18).map((person) => <div key={person.id} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5"><div className="truncate text-[9px] font-semibold">{person.fullName}</div><div className="truncate text-[8px] text-slate-500">{person.technology || person.profile || 'Sin dato tecnológico'}</div></div>)}{!selectedLevel3.people.length ? <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center text-[9px] text-slate-500">Sin colaboradores activos.</div> : null}</div>
                <div className="mt-4 flex gap-1.5"><BBVAButton size="sm" variant="secondary" icon={<Eye className="h-3 w-3"/>} onClick={() => navigate(`/bbva/admin/catalogs/engineering-specialties/structures/${selectedLevel3.id}`)}>Ver</BBVAButton><BBVAButton size="sm" variant="secondary" icon={<Pencil className="h-3 w-3"/>} onClick={() => navigate(`/bbva/admin/catalogs/engineering-specialties/structures/${selectedLevel3.id}/edit`)}>Editar</BBVAButton><BBVAButton size="sm" variant="secondary" icon={selectedLevel3.status === 'ACTIVE' ? <Power className="h-3 w-3"/> : <RefreshCw className="h-3 w-3"/>} onClick={() => setPending({ kind: 'structure', id: selectedLevel3.id, name: selectedLevel3.name, next: selectedLevel3.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{selectedLevel3.status === 'ACTIVE' ? 'Inactivar' : 'Activar'}</BBVAButton></div>
              </> : selectedLevel2 ? <>
                <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-slate-200 bg-white p-2"><div className="text-[8px] text-slate-500">Nivel 3</div><div className="mt-1 text-xl font-semibold tabular-nums">{selectedLevel2.level3.length}</div></div><div className="rounded-xl border border-slate-200 bg-white p-2"><div className="text-[8px] text-slate-500">Colaboradores</div><div className="mt-1 text-xl font-semibold tabular-nums">{selectedLevel2.collaboratorCount}</div></div></div><div className="mt-2 rounded-xl border border-slate-200 bg-white p-2"><div className="text-[8px] text-slate-500">Especialidades</div><div className="mt-1 text-lg font-semibold tabular-nums">{selectedLevel2.specialtyCount}</div></div>
                <div className="mt-4 flex gap-1.5"><BBVAButton size="sm" variant="secondary" icon={<Eye className="h-3 w-3"/>} onClick={() => navigate(`/bbva/admin/catalogs/engineering-specialties/structures/${selectedLevel2.id}`)}>Ver</BBVAButton><BBVAButton size="sm" variant="secondary" icon={<Pencil className="h-3 w-3"/>} onClick={() => navigate(`/bbva/admin/catalogs/engineering-specialties/structures/${selectedLevel2.id}/edit`)}>Editar</BBVAButton><BBVAButton size="sm" variant="secondary" icon={selectedLevel2.status === 'ACTIVE' ? <Power className="h-3 w-3"/> : <RefreshCw className="h-3 w-3"/>} onClick={() => setPending({ kind: 'structure', id: selectedLevel2.id, name: selectedLevel2.name, next: selectedLevel2.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{selectedLevel2.status === 'ACTIVE' ? 'Inactivar' : 'Activar'}</BBVAButton></div>
              </> : null}
            </aside>
          </div>
        </section>
      ) : null}

      {view === 'heatmap' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-[12px] font-semibold text-slate-950">Mapa de calor de colaboradores</div><div className="mt-0.5 text-[9.5px] text-slate-500">Cuadrícula por Nivel 2 y Nivel 3. La intensidad representa la concentración de colaboradores activos.</div></div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] text-slate-500"><span>Menor</span>{['bg-white border-slate-200','bg-sky-50 border-sky-100','bg-cyan-50 border-cyan-200','bg-blue-50 border-blue-200','bg-blue-100 border-blue-300'].map((className) => <span key={className} className={`h-3 w-4 rounded-[4px] border ${className}`}/>)}<span>Mayor</span></div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[190px_minmax(0,1fr)] border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-[0.05em] text-slate-500"><div>Estructura nivel 2</div><div>Gremios / nivel 3</div></div>
            <div className="divide-y divide-slate-200">{heatGroups.map(({ parent, cells }) => <div key={parent.id} className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)]"><button type="button" onClick={() => { selectLevel2(parent); setView('hierarchy'); }} className="flex min-h-[92px] flex-col justify-between border-b border-slate-200 bg-slate-50/70 p-3 text-left transition hover:bg-blue-50/60 lg:border-b-0 lg:border-r"><div className="text-[9.5px] font-bold leading-4 text-slate-900">{parent.name.toUpperCase()}</div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[8px] text-slate-500"><span><b className="text-slate-800">{cells.reduce((sum,item)=>sum+item.collaboratorCount,0)}</b> colaboradores</span><span><b className="text-slate-800">{cells.reduce((sum,item)=>sum+item.specialtyCount,0)}</b> especialidades</span></div></button><div className="grid auto-rows-fr grid-cols-2 gap-px bg-slate-200 p-px sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{cells.map((cell) => <button key={cell.level3Id} type="button" onClick={() => { const pair = flatLevel3.find(({ child }) => child.id === cell.level3Id); if (pair) selectLevel3(pair.child); setView('hierarchy'); }} className={cn('group min-h-[92px] border p-2.5 text-left transition hover:z-10 hover:border-blue-300 hover:shadow-sm', heatToneClass(cell.collaboratorCount, heatMax))}><div className="line-clamp-2 min-h-[30px] text-[8.8px] font-bold leading-[14px]">{cell.level3Name.toUpperCase()}</div><div className="mt-2 flex items-end justify-between gap-2"><div><div className="text-[21px] font-semibold leading-none tabular-nums text-slate-950">{cell.collaboratorCount}</div><div className="mt-1 text-[7.5px] font-medium uppercase tracking-[0.03em] text-slate-500">Colaboradores</div></div><div className="text-right"><div className="text-[12px] font-semibold tabular-nums text-slate-800">{cell.specialtyCount}</div><div className="text-[7.5px] uppercase tracking-[0.03em] text-slate-500">Especialidades</div></div></div></button>)}</div></div>)}{!heatGroups.length ? <div className="p-8 text-center text-[10px] text-slate-500">No hay datos para el contexto seleccionado.</div> : null}</div>
          </div>
        </section>
      ) : null}

      {view === 'insights' ? (
        <section className="grid gap-3 xl:grid-cols-2">
          <InsightList title="Concentración de colaboradores" description="Nivel 3 con mayor número de colaboradores activos." items={query.data.insights.topGuildsByCollaborators} icon={<UsersRound className="h-4 w-4"/>}/>
          <InsightList title="Especialidades por estructura" description="Nivel 2 con mayor número de especialidades activas." items={query.data.insights.topStructuresBySpecialties} icon={<Layers3 className="h-4 w-4"/>}/>
          <InsightList title="Staffer con mayor cobertura" description="Cantidad de especialidades activas asociadas a cada staffer." items={query.data.insights.topStaffersBySpecialties} icon={<Boxes className="h-4 w-4"/>}/>
          <div className="bbva-insight-live rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3 shadow-sm"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-4 w-4"/></span><div><div className="text-[11px] font-semibold text-slate-950">Calidad de configuración</div><div className="text-[9px] text-slate-500">Huecos que reducen la lectura completa del mapa.</div></div></div><div className="mt-3 grid grid-cols-2 gap-2"><QualityStat label="Sin especialidades" value={query.data.insights.structuresWithoutSpecialties.length}/><QualityStat label="Sin staffer" value={query.data.insights.specialtiesWithoutStaffer}/><QualityStat label="Fuera de jerarquía" value={query.data.insights.collaboratorsOutsideHierarchy.length}/><QualityStat label="Gremios sin match" value={query.data.insights.unmatchedSpecialtyGroups.length}/></div></div>
          {query.data.insights.collaboratorsOutsideHierarchy.length ? <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold text-slate-950">Colaboradores fuera del mapa</div><div className="text-[9px] text-slate-500">Personas activas cuya estructura no coincide completamente con una estructura + gremio configurados.</div></div><span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-700">{query.data.insights.collaboratorsOutsideHierarchy.length}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{query.data.insights.collaboratorsOutsideHierarchy.slice(0,12).map((person) => <div key={person.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2"><div className="truncate text-[9.5px] font-bold text-slate-900">{person.fullName}</div><div className="mt-1 truncate text-[8.5px] text-slate-500">{person.technology || person.profile || 'Sin información tecnológica'}</div></div>)}</div></div> : null}
        </section>
      ) : null}

      <ConfirmDialog open={Boolean(pending)} title={pending?.next === 'ACTIVE' ? 'Activar registro' : 'Inactivar registro'} message={pending ? pending.name : ''} confirmLabel="Confirmar" tone="warning" busy={specialtyStatus.isPending || structureStatus.isPending} onCancel={() => setPending(null)} onConfirm={() => void confirmStatus()} />
    </div>
  );
};

const InsightList: React.FC<{ title: string; description: string; items: Array<{ key: string; label: string; count: number; secondary?: string | null }>; icon: React.ReactNode }> = ({ title, description, items, icon }) => {
  const max = Math.max(1, ...items.map((item) => item.count));
  return <div className="bbva-insight-live rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3 shadow-sm"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">{icon}</span><div><div className="text-[11px] font-semibold text-slate-950">{title}</div><div className="text-[9px] text-slate-500">{description}</div></div></div><div className="mt-3 space-y-2">{items.length ? items.map((item) => <div key={item.key}><div className="flex items-center justify-between gap-2 text-[9px]"><div className="min-w-0"><div className="truncate font-semibold text-slate-800">{item.label}</div>{item.secondary ? <div className="truncate text-[8px] text-slate-500">{item.secondary}</div> : null}</div><span className="font-bold tabular-nums text-slate-950">{item.count}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max(4, Math.round((item.count / max) * 100))}%` }}/></div></div>) : <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-[9.5px] text-slate-500">Sin datos para mostrar.</div>}</div></div>;
};

const QualityStat: React.FC<{ label: string; value: number }> = ({ label, value }) => <div className="rounded-xl border border-amber-100 bg-white p-2.5"><div className="text-[18px] font-semibold tabular-nums text-slate-950">{value}</div><div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.04em] text-slate-500">{label}</div></div>;
