import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACatalogHeader } from '../../componentsBBVATalent/BBVACatalogHeader';
import { BBVARequiredMark } from '../../componentsBBVATalent/BBVARequiredMark';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { useCreateEngineeringSpecialty, useEngineeringSpecialty, useUpdateEngineeringSpecialty } from '../hooks/useEngineeringSpecialties';
import { useStructureCatalog } from '../hooks/useStructureCatalog';
import type { EngineeringSpecialtyPayload } from '../types/engineeringSpecialty';

const empty: EngineeringSpecialtyPayload = { n3: '', guild: '', specialty: '', guildLeader: '', specialtyOwner: '', portfolioStaffing: '', staffer: '' };

export const EngineeringSpecialtyEditorPage: React.FC = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const query = useEngineeringSpecialty(id);
  const structures = useStructureCatalog('', 'ACTIVE');
  const create = useCreateEngineeringSpecialty();
  const update = useUpdateEngineeringSpecialty();
  const [draft, setDraft] = useState(empty);
  const [ready, setReady] = useState(!editing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing && query.data?.item && !ready) {
      const item = query.data.item;
      setDraft({ n3: item.n3, guild: item.guild, specialty: item.specialty, guildLeader: item.guildLeader ?? '', specialtyOwner: item.specialtyOwner ?? '', portfolioStaffing: item.portfolioStaffing ?? '', staffer: item.staffer ?? '' });
      setReady(true);
    }
  }, [editing, query.data, ready]);

  const level2 = useMemo(() => (structures.data?.items ?? []).filter((item) => item.level === 2 && item.status === 'ACTIVE'), [structures.data?.items]);
  const selectedLevel2 = useMemo(() => level2.find((item) => item.name === draft.n3) ?? null, [draft.n3, level2]);
  const level3 = useMemo(() => (structures.data?.items ?? []).filter((item) => item.level === 3 && item.status === 'ACTIVE' && (!selectedLevel2 || item.parentId === selectedLevel2.id)), [selectedLevel2, structures.data?.items]);

  if (editing && query.isLoading) return <div className="p-8 text-xs text-slate-500">Cargando...</div>;

  const field = (name: keyof EngineeringSpecialtyPayload, title: string) => <label><span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">{title}</span><input value={draft[name]} onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value.toUpperCase() }))} className="h-9 w-full rounded-xl border border-slate-300 px-3 text-[11px] outline-none focus:border-blue-500" /></label>;

  const save = async () => {
    try {
      setError(null);
      if (id) await update.mutateAsync({ id, payload: draft });
      else await create.mutateAsync(draft);
      navigate('/bbva/admin/catalogs/engineering-specialties');
    } catch (caught) { setError((caught as Error).message); }
  };

  return <div className="space-y-3 animate-fade-in">
    <BBVAButton variant="secondary" onClick={() => navigate('/bbva/admin/catalogs/engineering-specialties')}>Regresar</BBVAButton>
    <BBVACatalogHeader title={editing ? 'EDITAR ESPECIALIDAD' : 'NUEVA ESPECIALIDAD'} description="GREMIOS Y ESPECIALIDADES" />
    {error ? <BBVAAlert tone="error">{error}</BBVAAlert> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">Estructura nivel 2 <BBVARequiredMark/></span><BBVASearchableSelect value={draft.n3} onChange={(value) => setDraft((current) => ({ ...current, n3: value, guild: '' }))} options={[{ value: '', label: 'SELECCIONAR NIVEL 2' }, ...level2.map((item) => ({ value: item.name, label: item.name.toUpperCase() }))]} ariaLabel="Estructura nivel 2" searchPlaceholder="Buscar nivel 2" /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">Gremio / nivel 3 <BBVARequiredMark/></span><BBVASearchableSelect value={draft.guild} disabled={!draft.n3} onChange={(value) => setDraft((current) => ({ ...current, guild: value }))} options={[{ value: '', label: 'SELECCIONAR NIVEL 3' }, ...level3.map((item) => ({ value: item.name, label: item.name.toUpperCase() }))]} ariaLabel="Gremio nivel 3" searchPlaceholder="Buscar nivel 3" /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">Especialidad <BBVARequiredMark/></span><input value={draft.specialty} onChange={(event) => setDraft((current) => ({ ...current, specialty: event.target.value.toUpperCase() }))} className="h-9 w-full rounded-xl border border-slate-300 px-3 text-[11px] outline-none focus:border-blue-500" /></label>
        {field('staffer', 'Staffer')}
        {field('guildLeader', 'Líder de gremio')}
        {field('specialtyOwner', 'Responsable de especialidad')}
        {field('portfolioStaffing', 'Portfolio & Staffing')}
      </div>
      <div className="mt-4 flex justify-end gap-2"><BBVAButton variant="secondary" onClick={() => navigate('/bbva/admin/catalogs/engineering-specialties')}>Cancelar</BBVAButton><BBVAButton variant="primary" disabled={!draft.n3 || !draft.guild || !draft.specialty || create.isPending || update.isPending} onClick={() => void save()}>{create.isPending || update.isPending ? 'Guardando...' : 'Guardar'}</BBVAButton></div>
    </section>
  </div>;
};
