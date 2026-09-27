import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVASearchableSelect } from '../../componentsBBVATalent/BBVASearchableSelect';
import { ConfirmDialog } from '../../componentsBBVATalent/ConfirmDialog';
import { useCatalogOptions } from '../hooks/useCatalog';
import { useDeliveryManagers } from '../hooks/useAdminUsers';
import { useConvertTalent, useTalent, useUpdateTalent } from '../hooks/useTalent';
import type { CatalogOption } from '../types/catalog';
import type { Talent, TalentPayload } from '../types/talent';

const fieldClass = 'h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15';
const labelClass = 'mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500';

function optionId(options: CatalogOption[], currentId: string | null | undefined, currentName: string | null | undefined): string {
  if (currentId && options.some((option) => option.id === currentId)) return currentId;
  const name = (currentName ?? '').trim().toLocaleUpperCase('es-MX');
  return options.find((option) => option.name.trim().toLocaleUpperCase('es-MX') === name)?.id ?? '';
}

function optionName(options: CatalogOption[], id: string): string {
  return options.find((option) => option.id === id)?.name ?? '';
}

function toOptions(options: CatalogOption[]) {
  return [{ value: '', label: 'Seleccionar' }, ...options.map((item) => ({ value: item.id, label: item.name }))];
}

function initialValues(talent: Talent | null | undefined, profiles: CatalogOption[], technologyProfiles: CatalogOption[], technologies: CatalogOption[]) {
  return {
    profileCatalogId: optionId(profiles, talent?.profileCatalogId, talent?.profile),
    technologyProfileCatalogId: optionId(technologyProfiles, talent?.technologyProfileCatalogId, talent?.technologyProfile),
    currentTechnologyCatalogId: optionId(technologies, talent?.currentTechnologyCatalogId, talent?.currentTechnology),
    expertise: talent?.expertise ?? '',
    bbvaUser: talent?.bbvaUser ?? talent?.corporateUser ?? '',
  };
}

function toPayload(talent: Talent, values: ReturnType<typeof initialValues>, profiles: CatalogOption[], technologyProfiles: CatalogOption[], technologies: CatalogOption[]): TalentPayload {
  return {
    talentType: talent.talentType,
    affiliationType: talent.affiliationType,
    softtekCode: talent.softtekCode ?? '',
    bbvaUser: values.bbvaUser,
    softtekEmail: talent.softtekEmail ?? talent.email,
    bbvaEmail: talent.bbvaEmail ?? '',
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
    bbvaStartDate: talent.bbvaStartDate ?? talent.platformStartDate ?? '',
    softtekHireDate: talent.softtekHireDate ?? talent.hireDate ?? '',
    entryDate: talent.entryDate,
    notes: talent.notes ?? '',
    expectedUpdatedAt: talent.updatedAt,
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
  const deliveryManagersQuery = useDeliveryManagers();
  const profiles = useMemo(() => profilesQuery.data?.items ?? [], [profilesQuery.data]);
  const technologyProfiles = useMemo(() => technologyProfilesQuery.data?.items ?? [], [technologyProfilesQuery.data]);
  const technologies = useMemo(() => technologiesQuery.data?.items ?? [], [technologiesQuery.data]);
  const deliveryManagers = useMemo(() => deliveryManagersQuery.data?.items ?? [], [deliveryManagersQuery.data]);
  const talent = talentQuery.data?.item ?? null;
  const [values, setValues] = useState(() => initialValues(talent, [], [], []));
  const [deliveryManager, setDeliveryManager] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues(talent, profiles, technologyProfiles, technologies));
  }, [profiles, talent, technologies, technologyProfiles]);

  const requestConfirmation = () => {
    if (!values.profileCatalogId || !values.technologyProfileCatalogId || !values.currentTechnologyCatalogId) {
      setError('Selecciona perfil, perfil tecnológico y tecnología actual antes de continuar.');
      return;
    }
    if (!deliveryManager.trim()) {
      setError('Selecciona un Delivery Manager antes de continuar.');
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  const confirm = async () => {
    if (!talent || !id) return;
    try {
      setError(null);
      await updateMutation.mutateAsync({ id, payload: toPayload(talent, values, profiles, technologyProfiles, technologies) });
      const result = await convertMutation.mutateAsync({ id, deliveryManager: deliveryManager.trim() });
      navigate(`/bbva/collaborators/${result.collaboratorId}/manage`, { state: { message: result.message } });
    } catch (conversionError) {
      setConfirmOpen(false);
      setError((conversionError as Error).message);
    }
  };

  if (talentQuery.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando talento...</div>;
  if (talentQuery.error || !talent) return <BBVAAlert tone="error">{(talentQuery.error as Error)?.message || 'No se encontró el talento.'}</BBVAAlert>;
  const busy = updateMutation.isPending || convertMutation.isPending;
  const catalogsLoading = profilesQuery.isLoading || technologyProfilesQuery.isLoading || technologiesQuery.isLoading || deliveryManagersQuery.isLoading;

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
        <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 text-[11px] sm:grid-cols-2">
          <div><span className="font-semibold uppercase tracking-[0.04em] text-slate-500">Persona</span><div className="mt-1 font-semibold text-slate-900">{talent.fullName}</div><div className="text-[10px] text-slate-500">{talent.email}</div></div>
          <div><span className="font-semibold uppercase tracking-[0.04em] text-slate-500">Origen</span><div className="mt-1 text-slate-900">{talent.talentType === 'ACADEMY' ? 'Academia' : talent.talentType === 'PROSPECT' ? 'Prospecto' : 'Excolaborador'}</div></div>
        </div>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4"><span className={labelClass}>Perfil *</span><BBVASearchableSelect value={values.profileCatalogId} onChange={(value) => setValues((v) => ({ ...v, profileCatalogId: value }))} options={toOptions(profiles)} disabled={catalogsLoading} ariaLabel="Perfil" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Perfil tecnológico *</span><BBVASearchableSelect value={values.technologyProfileCatalogId} onChange={(value) => setValues((v) => ({ ...v, technologyProfileCatalogId: value }))} options={toOptions(technologyProfiles)} disabled={catalogsLoading} ariaLabel="Perfil tecnológico" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Tecnología actual *</span><BBVASearchableSelect value={values.currentTechnologyCatalogId} onChange={(value) => setValues((v) => ({ ...v, currentTechnologyCatalogId: value }))} options={toOptions(technologies)} disabled={catalogsLoading} ariaLabel="Tecnología actual" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Nivel de experiencia</span><BBVASearchableSelect value={values.expertise} onChange={(value) => setValues((v) => ({ ...v, expertise: value }))} options={[{ value: '', label: '—' }, { value: 'TR', label: 'TR' }, { value: 'JR', label: 'JR' }, { value: 'STD', label: 'STD' }, { value: 'SR', label: 'SR' }]} ariaLabel="Nivel de experiencia" /></label>
          <label className="md:col-span-4"><span className={labelClass}>Usuario BBVA</span><input value={values.bbvaUser} onChange={(e) => setValues((v) => ({ ...v, bbvaUser: e.target.value }))} className={fieldClass} /></label>
          <label className="md:col-span-4"><span className={labelClass}>DM *</span><BBVASearchableSelect value={deliveryManager} onChange={setDeliveryManager} options={[{ value: '', label: 'Seleccionar Delivery Manager' }, ...deliveryManagers.map((item) => ({ value: item.fullName, label: item.fullName, description: [item.email, item.corporateUser].filter(Boolean).join(' · ') || undefined }))]} disabled={deliveryManagersQuery.isLoading} ariaLabel="Delivery Manager" searchPlaceholder="Buscar Delivery Manager" emptyMessage="No hay Delivery Managers activos." /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={() => navigate('/bbva/talent-bank')} className="h-9 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" disabled={busy || catalogsLoading} onClick={requestConfirmation} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"><ArrowRightLeft className="h-3.5 w-3.5" />Continuar</button>
        </div>
      </div>
      <ConfirmDialog open={confirmOpen} title="Convertir a colaborador" message="Esta persona dejará Banco de talento y será incorporada a Colaboradores conservando su identidad e historial. ¿Deseas continuar?" confirmLabel="Confirmar conversión" tone="danger" busy={busy} onConfirm={() => void confirm()} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
};
