import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useCatalogOptions } from '../pagesBBVATalent/hooks/useCatalog';
import type { CatalogOption } from '../pagesBBVATalent/types/catalog';
import type { Collaborator, CollaboratorPayload } from '../pagesBBVATalent/types/collaborator';
import type { IdentityDirectoryRecord } from '../pagesBBVATalent/types/identityDirectory';
import { BBVAFormActions, type BBVAFormMode, isBBVAFormReadOnly } from './BBVACrudForm';
import { BBVASearchableSelect, type BBVASearchableSelectOption } from './BBVASearchableSelect';
import { BBVADatePicker } from './BBVADatePicker';
import { ISLookupField } from './ISLookupField';

const fieldClass = 'h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60';
const areaClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:disabled:bg-slate-950/60';
const labelClass = 'mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';

function optionId(options: CatalogOption[], currentId: string | null | undefined, currentName: string | null | undefined): string {
  if (currentId) return currentId;
  const name = (currentName ?? '').trim().toLocaleUpperCase('es-MX');
  return options.find((option) => option.name.trim().toLocaleUpperCase('es-MX') === name)?.id ?? '';
}

function optionName(options: CatalogOption[], id: string): string {
  return options.find((option) => option.id === id)?.name ?? '';
}

function toSelectOptions(options: CatalogOption[], emptyLabel = 'Seleccionar', currentId?: string | null, currentName?: string | null): BBVASearchableSelectOption[] {
  const mapped = options.map((option) => ({ value: option.id, label: option.name }));
  if (currentId && currentName && !mapped.some((option) => option.value === currentId)) {
    mapped.unshift({ value: currentId, label: currentName });
  }
  return [{ value: '', label: emptyLabel }, ...mapped];
}

const expertiseOptions: BBVASearchableSelectOption[] = [
  { value: '', label: '—' },
  { value: 'TR', label: 'TR' },
  { value: 'JR', label: 'JR' },
  { value: 'STD', label: 'STD' },
  { value: 'SR', label: 'SR' },
];

function values(item: Collaborator | null | undefined, profiles: CatalogOption[], technologyProfiles: CatalogOption[], technologies: CatalogOption[]): CollaboratorPayload {
  return {
    softtekCode: item?.softtekCode ?? '', corporateUser: item?.corporateUser ?? '', email: item?.email ?? '', firstName: item?.firstName ?? '', lastName: item?.lastName ?? '',
    profile: item?.profile ?? '', profileCatalogId: optionId(profiles, item?.profileCatalogId, item?.profile),
    technologyProfile: item?.technologyProfile ?? '', technologyProfileCatalogId: optionId(technologyProfiles, item?.technologyProfileCatalogId, item?.technologyProfile),
    currentTechnology: item?.currentTechnology ?? '', currentTechnologyCatalogId: optionId(technologies, item?.currentTechnologyCatalogId, item?.currentTechnology),
    expertise: item?.expertise ?? '', startDate: item?.startDate ?? '', endDate: item?.endDate ?? '', hireDate: item?.hireDate ?? '', notes: item?.notes ?? '',
  };
}

interface CollaboratorFormProps {
  selected?: Collaborator | null;
  saving?: boolean;
  mode?: BBVAFormMode;
  onSubmit: (payload: CollaboratorPayload) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const CollaboratorForm: React.FC<CollaboratorFormProps> = ({ selected, saving, mode = selected ? 'edit' : 'create', onSubmit, onCancel, onDelete }) => {
  const readOnly = isBBVAFormReadOnly(mode);
  const profilesQuery = useCatalogOptions('profiles');
  const technologyProfilesQuery = useCatalogOptions('technology-profiles');
  const technologiesQuery = useCatalogOptions('technologies');
  const profiles = useMemo(() => profilesQuery.data?.items ?? [], [profilesQuery.data]);
  const technologyProfiles = useMemo(() => technologyProfilesQuery.data?.items ?? [], [technologyProfilesQuery.data]);
  const technologies = useMemo(() => technologiesQuery.data?.items ?? [], [technologiesQuery.data]);
  const { register, handleSubmit, reset, setValue, watch } = useForm<CollaboratorPayload>({ defaultValues: values(selected, [], [], []) });

  useEffect(() => reset(values(selected, profiles, technologyProfiles, technologies)), [profiles, reset, selected, technologies, technologyProfiles]);

  const submit = (payload: CollaboratorPayload) => {
    if (readOnly) return;
    onSubmit({
    ...payload,
    profile: optionName(profiles, payload.profileCatalogId),
    technologyProfile: optionName(technologyProfiles, payload.technologyProfileCatalogId),
    currentTechnology: optionName(technologies, payload.currentTechnologyCatalogId),
    });
  };

  const catalogsLoading = profilesQuery.isLoading || technologyProfilesQuery.isLoading || technologiesQuery.isLoading;
  const isValue = watch('softtekCode');
  const profileCatalogId = watch('profileCatalogId');
  const technologyProfileCatalogId = watch('technologyProfileCatalogId');
  const currentTechnologyCatalogId = watch('currentTechnologyCatalogId');
  const expertise = watch('expertise');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const hireDate = watch('hireDate');

  const hydrateFromDirectory = (record: IdentityDirectoryRecord) => {
    if (record.corporateUser) setValue('corporateUser', record.corporateUser, { shouldDirty: true, shouldValidate: true });
    if (record.email) setValue('email', record.email, { shouldDirty: true, shouldValidate: true });
    if (record.firstName) setValue('firstName', record.firstName, { shouldDirty: true, shouldValidate: true });
    if (record.lastName) setValue('lastName', record.lastName, { shouldDirty: true, shouldValidate: true });
    if (record.expertise) setValue('expertise', record.expertise, { shouldDirty: true, shouldValidate: true });
    if (record.hireDate) setValue('hireDate', record.hireDate, { shouldDirty: true, shouldValidate: true });
    if (record.profile) setValue('profileCatalogId', optionId(profiles, null, record.profile), { shouldDirty: true, shouldValidate: true });
    if (record.technologyProfile) setValue('technologyProfileCatalogId', optionId(technologyProfiles, null, record.technologyProfile), { shouldDirty: true, shouldValidate: true });
    if (record.currentTechnology) setValue('currentTechnologyCatalogId', optionId(technologies, null, record.currentTechnology), { shouldDirty: true, shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <input type="hidden" {...register('startDate')} />
      <input type="hidden" {...register('endDate')} />
      <input type="hidden" {...register('hireDate')} />
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Identificación</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>IS</span><ISLookupField value={isValue ?? ''} onChange={(value) => setValue('softtekCode', value, { shouldDirty: true })} onResolved={hydrateFromDirectory} disabled={saving || readOnly} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Usuario corporativo</span><input {...register('corporateUser')} disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Correo electrónico *</span><input {...register('email', { required: true })} type="email" disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Nombre *</span><input {...register('firstName', { required: true })} disabled={readOnly || saving} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Apellidos *</span><input {...register('lastName', { required: true })} disabled={readOnly || saving} className={fieldClass} /></label>
        </div>
      </section>
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Información profesional</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-4">
            <span className={labelClass}>Perfil *</span>
            <BBVASearchableSelect value={profileCatalogId ?? ''} onChange={(value) => setValue('profileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(profiles, 'Seleccionar', selected?.profileCatalogId, selected?.profile)} disabled={catalogsLoading || readOnly || saving} ariaLabel="Perfil" />
            <input type="hidden" {...register('profileCatalogId', { required: true })} />
            <input type="hidden" {...register('profile')} />
          </label>
          <label className="md:col-span-3">
            <span className={labelClass}>Perfil tecnológico *</span>
            <BBVASearchableSelect value={technologyProfileCatalogId ?? ''} onChange={(value) => setValue('technologyProfileCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(technologyProfiles, 'Seleccionar', selected?.technologyProfileCatalogId, selected?.technologyProfile)} disabled={catalogsLoading || readOnly || saving} ariaLabel="Perfil tecnológico" />
            <input type="hidden" {...register('technologyProfileCatalogId', { required: true })} />
            <input type="hidden" {...register('technologyProfile')} />
          </label>
          <label className="md:col-span-3">
            <span className={labelClass}>Tecnología actual *</span>
            <BBVASearchableSelect value={currentTechnologyCatalogId ?? ''} onChange={(value) => setValue('currentTechnologyCatalogId', value, { shouldDirty: true, shouldValidate: true })} options={toSelectOptions(technologies, 'Seleccionar', selected?.currentTechnologyCatalogId, selected?.currentTechnology)} disabled={catalogsLoading || readOnly || saving} ariaLabel="Tecnología actual" />
            <input type="hidden" {...register('currentTechnologyCatalogId', { required: true })} />
            <input type="hidden" {...register('currentTechnology')} />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass}>Nivel de experiencia</span>
            <BBVASearchableSelect value={expertise ?? ''} onChange={(value) => setValue('expertise', value, { shouldDirty: true, shouldValidate: true })} options={expertiseOptions} disabled={readOnly || saving} ariaLabel="Nivel de experiencia" />
            <input type="hidden" {...register('expertise')} />
          </label>
        </div>
      </section>
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Fechas</h3>
        <div className="grid gap-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>Fecha de alta</span><BBVADatePicker value={startDate} onChange={(value) => setValue('startDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Fecha de alta" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Vencimiento</span><BBVADatePicker value={endDate} onChange={(value) => setValue('endDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Vencimiento" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Fecha de contratación</span><BBVADatePicker value={hireDate} onChange={(value) => setValue('hireDate', value, { shouldDirty: true, shouldValidate: true })} disabled={readOnly || saving} ariaLabel="Fecha de contratación" /></label>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75"><label><span className={labelClass}>Observaciones</span><textarea {...register('notes')} rows={4} disabled={readOnly || saving} className={areaClass} /></label></section>
      <BBVAFormActions
        mode={mode}
        busy={saving}
        submitDisabled={catalogsLoading}
        onBack={onCancel}
        onDelete={onDelete}
        createLabel="Guardar"
        editLabel="Guardar cambios"
        deleteLabel="Eliminar colaborador"
      />
    </form>
  );
};
