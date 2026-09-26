import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useCatalogOptions } from '../hooks/useCatalog';
import { useConvertTalent, useTalent, useUpdateTalent } from '../hooks/useTalent';
import type { CatalogOption } from '../types/catalog';
import type { Talent, TalentPayload } from '../types/talent';

const fieldClass = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const labelClass = 'mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';

function optionId(options: CatalogOption[], id: string | null, name: string | null): string {
  if (id && options.some((item) => item.id === id)) return id;
  const target = (name ?? '').trim().toLocaleUpperCase('es-MX');
  return options.find((item) => item.name.trim().toLocaleUpperCase('es-MX') === target)?.id ?? '';
}
function optionName(options: CatalogOption[], id: string): string { return options.find((item) => item.id === id)?.name ?? ''; }

type ConversionValues = { profileCatalogId: string; technologyProfileCatalogId: string; currentTechnologyCatalogId: string; expertise: string; corporateUser: string };

function toPayload(talent: Talent, values: ConversionValues, profiles: CatalogOption[], technologyProfiles: CatalogOption[], technologies: CatalogOption[]): TalentPayload {
  return {
    talentType: talent.talentType,
    softtekCode: talent.softtekCode ?? '',
    corporateUser: values.corporateUser,
    email: talent.email,
    firstName: talent.firstName,
    lastName: talent.lastName ?? '',
    profile: optionName(profiles, values.profileCatalogId),
    profileCatalogId: values.profileCatalogId,
    technologyProfile: optionName(technologyProfiles, values.technologyProfileCatalogId),
    technologyProfileCatalogId: values.technologyProfileCatalogId,
    currentTechnology: optionName(technologies, values.currentTechnologyCatalogId),
    currentTechnologyCatalogId: values.currentTechnologyCatalogId,
    expertise: values.expertise,
    stage: talent.stage,
    active: talent.active,
    platformStartDate: talent.platformStartDate ?? '',
    platformEndDate: talent.platformEndDate ?? '',
    hireDate: talent.hireDate ?? '',
    entryDate: talent.entryDate,
    notes: talent.notes ?? '',
  };
}

export const TalentConvertPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const talentQuery = useTalent(id);
  const updateMutation = useUpdateTalent();
  const convertMutation = useConvertTalent();
  const profilesQuery = useCatalogOptions('profiles');
  const technologyProfilesQuery = useCatalogOptions('technology-profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const profiles = useMemo(() => profilesQuery.data?.items ?? [], [profilesQuery.data]);
  const technologyProfiles = useMemo(() => technologyProfilesQuery.data?.items ?? [], [technologyProfilesQuery.data]);
  const technologies = useMemo(() => technologiesQuery.data?.items ?? [], [technologiesQuery.data]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const talent = talentQuery.data?.item;
  const [values, setValues] = useState<ConversionValues>({ profileCatalogId: '', technologyProfileCatalogId: '', currentTechnologyCatalogId: '', expertise: '', corporateUser: '' });

  useEffect(() => {
    if (!talent) return;
    setValues({
      profileCatalogId: optionId(profiles, talent.profileCatalogId, talent.profile),
      technologyProfileCatalogId: optionId(technologyProfiles, talent.technologyProfileCatalogId, talent.technologyProfile),
      currentTechnologyCatalogId: optionId(technologies, talent.currentTechnologyCatalogId, talent.currentTechnology),
      expertise: talent.expertise ?? '', corporateUser: talent.corporateUser ?? '',
    });
  }, [profiles, talent, technologies, technologyProfiles]);

  const requestConfirmation = () => {
    if (!values.profileCatalogId) return setError('El Perfil es obligatorio para convertir a colaborador.');
    if (!values.technologyProfileCatalogId) return setError('El Perfil tecnológico es obligatorio para convertir a colaborador.');
    if (!values.currentTechnologyCatalogId) return setError('La Tecnología actual es obligatoria para convertir a colaborador.');
    setError(null); setConfirmOpen(true);
  };

  const confirm = async () => {
    if (!talent || !id) return;
    try {
      setError(null);
      await updateMutation.mutateAsync({ id, payload: toPayload(talent, values, profiles, technologyProfiles, technologies) });
      await convertMutation.mutateAsync(id);
      navigate('/bbva/collaborators', { state: { message: 'El talento se convirtió correctamente en colaborador.' } });
    } catch (conversionError) { setConfirmOpen(false); setError((conversionError as Error).message); }
  };

  if (talentQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando talento...</div>;
  if (talentQuery.error || !talent) return <BBVAAlert tone="error">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</BBVAAlert>;
  const busy = updateMutation.isPending || convertMutation.isPending;
  const catalogsLoading = profilesQuery.isLoading || technologyProfilesQuery.isLoading || technologiesQuery.isLoading;

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      {error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] sm:grid-cols-2">
          <div><span className="font-semibold text-slate-500">Persona</span><div className="mt-1 font-semibold text-slate-900">{talent.fullName}</div><div className="text-[10px] text-slate-500">{talent.email}</div></div>
          <div><span className="font-semibold text-slate-500">Origen</span><div className="mt-1 text-slate-900">{talent.talentType === 'ACADEMY' ? 'Academia' : talent.talentType === 'PROSPECT' ? 'Prospecto' : 'Baja de BBVA'}</div></div>
        </div>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-4"><span className={labelClass}>Perfil *</span><select value={values.profileCatalogId} onChange={(e) => setValues((v) => ({ ...v, profileCatalogId: e.target.value }))} className={fieldClass} disabled={catalogsLoading}><option value="">Seleccionar</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="md:col-span-3"><span className={labelClass}>Perfil tecnológico *</span><select value={values.technologyProfileCatalogId} onChange={(e) => setValues((v) => ({ ...v, technologyProfileCatalogId: e.target.value }))} className={fieldClass} disabled={catalogsLoading}><option value="">Seleccionar</option>{technologyProfiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="md:col-span-3"><span className={labelClass}>Tecnología actual *</span><select value={values.currentTechnologyCatalogId} onChange={(e) => setValues((v) => ({ ...v, currentTechnologyCatalogId: e.target.value }))} className={fieldClass} disabled={catalogsLoading}><option value="">Seleccionar</option>{technologies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="md:col-span-2"><span className={labelClass}>Expertise</span><select value={values.expertise} onChange={(e) => setValues((v) => ({ ...v, expertise: e.target.value }))} className={fieldClass}><option value="">—</option><option value="TR">TR</option><option value="JR">JR</option><option value="STD">STD</option><option value="SR">SR</option></select></label>
          <label className="md:col-span-4"><span className={labelClass}>Usuario corporativo</span><input value={values.corporateUser} onChange={(e) => setValues((v) => ({ ...v, corporateUser: e.target.value }))} className={fieldClass} /></label>
        </div>
        <div className="mt-3 flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" disabled={busy || catalogsLoading} onClick={requestConfirmation} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"><ArrowRightLeft className="h-3.5 w-3.5" />Continuar</button>
        </div>
      </div>
      <ConfirmDialog open={confirmOpen} title="Convertir a colaborador" message="Esta persona dejará Talent Bank y será incorporada a Colaboradores conservando su identidad e historial. ¿Deseas continuar?" confirmLabel="Confirmar conversión" tone="danger" busy={busy} onConfirm={() => void confirm()} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
};
